// The official Victorian locality boundary service is used only to resolve an
// already-source-backed OSM coordinate to one of SuburbMates' existing locality
// filters. It never supplies a business identity, address, contact route, or
// category, and a failed read safely leaves the OSM record at the broad Darebin
// locality rather than guessing.

export const VICTORIAN_LOCALITY_BOUNDARIES_SOURCE = {
  key: "geoscape_vic_localities",
  datasetUrl: "https://data.gov.au/data/dataset/vic-suburb-locality-boundaries-geoscape-administrative-boundaries",
  wfsUrl: "https://data.gov.au/geoserver/vic-suburb-locality-boundaries-geoscape-administrative-boundaries/wfs",
  attribution: "Administrative Boundaries © Geoscape Australia licensed by the Commonwealth of Australia under Creative Commons Attribution 4.0 International licence (CC BY 4.0).",
} as const;

type Position = [number, number];
type Polygon = Position[][];

export type VictorianLocalityBoundary = {
  name: string;
  slug: string;
  sourceRecordKey: string;
  polygons: Polygon[];
};

type GeoJsonFeature = {
  geometry?: { type?: string; coordinates?: unknown };
  properties?: { LOC_NAME?: unknown; LOC_PID?: unknown };
};

const REQUEST_TIMEOUT_MS = 15_000;

export async function fetchVictorianLocalityBoundaries(
  allowedSuburbs: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<VictorianLocalityBoundary[]> {
  const localities = allowedSuburbs
    .filter((slug) => slug !== "darebin")
    .map((slug) => titleCase(slug))
    .sort();
  if (localities.length === 0) return [];

  const url = new URL(VICTORIAN_LOCALITY_BOUNDARIES_SOURCE.wfsUrl);
  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "1.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeName", "ckan_af33dd8c_0534_4e18_9245_fc64440f742e");
  url.searchParams.set("outputFormat", "json");
  url.searchParams.set(
    "CQL_FILTER",
    `LOC_NAME IN (${localities.map((name) => `'${name.replaceAll("'", "''")}'`).join(",")})`,
  );

  const response = await fetchImpl(url, {
    headers: { accept: "application/json", "user-agent": "SuburbMates-locality-resolver/1.0 (+https://suburbmates.com.au/contact)" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Victorian locality boundary service returned ${response.status}.`);
  const body = await response.json() as { features?: unknown };
  if (!Array.isArray(body.features)) throw new Error("Victorian locality boundary service returned an invalid feature collection.");
  const allowed = new Set(allowedSuburbs);
  return body.features.flatMap((feature) => readBoundary(feature as GeoJsonFeature, allowed));
}

export function resolveVictorianLocality(
  longitude: number | null | undefined,
  latitude: number | null | undefined,
  boundaries: readonly VictorianLocalityBoundary[],
): VictorianLocalityBoundary | null {
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return null;
  for (const boundary of boundaries) {
    if (boundary.polygons.some((polygon) => pointInPolygon(longitude!, latitude!, polygon))) return boundary;
  }
  return null;
}

function readBoundary(feature: GeoJsonFeature, allowed: ReadonlySet<string>): VictorianLocalityBoundary[] {
  const name = typeof feature.properties?.LOC_NAME === "string" ? feature.properties.LOC_NAME.trim() : "";
  const sourceRecordKey = typeof feature.properties?.LOC_PID === "string" ? feature.properties.LOC_PID.trim() : "";
  const slug = slugify(name);
  if (!name || !sourceRecordKey || !allowed.has(slug)) return [];
  const polygons = polygonsFromGeometry(feature.geometry);
  return polygons.length ? [{ name, slug, sourceRecordKey, polygons }] : [];
}

function polygonsFromGeometry(geometry: GeoJsonFeature["geometry"]): Polygon[] {
  if (!geometry?.coordinates) return [];
  if (geometry.type === "Polygon") return [readPolygon(geometry.coordinates)].filter((polygon): polygon is Polygon => polygon.length > 0);
  if (geometry.type !== "MultiPolygon" || !Array.isArray(geometry.coordinates)) return [];
  return geometry.coordinates
    .map((polygon) => readPolygon(polygon))
    .filter((polygon): polygon is Polygon => polygon.length > 0);
}

function readPolygon(value: unknown): Polygon {
  if (!Array.isArray(value)) return [];
  const rings = value.map(readRing).filter((ring): ring is Position[] => ring.length >= 3);
  return rings;
}

function readRing(value: unknown): Position[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((point) => {
    if (!Array.isArray(point) || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return [];
    return [[Number(point[0]), Number(point[1])] as Position];
  });
}

function pointInPolygon(longitude: number, latitude: number, polygon: Polygon): boolean {
  const [outer, ...holes] = polygon;
  return Boolean(outer && pointInRing(longitude, latitude, outer) && !holes.some((ring) => pointInRing(longitude, latitude, ring)));
}

function pointInRing(longitude: number, latitude: number, ring: Position[]): boolean {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    const crosses = (y > latitude) !== (previousY > latitude)
      && longitude < ((previousX - x) * (latitude - y)) / (previousY - y) + x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function titleCase(slug: string) {
  return slug.split("-").map((word) => word.slice(0, 1).toUpperCase() + word.slice(1)).join(" ");
}
