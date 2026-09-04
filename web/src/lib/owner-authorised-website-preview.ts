const MAX_HTML_BYTES = 512_000;
const MAX_JSON_LD_BLOCK_BYTES = 64_000;
const MAX_JSON_LD_BLOCKS = 12;

export type OwnerWebsitePreview = {
  sourceUrl: string;
  checkedAt: string;
  phone: string | null;
  email: string | null;
  tradingHours: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  summary: string | null;
  services: string[];
  bookingUrl: string | null;
  menuUrl: string | null;
  areaServed: string[];
  accessibilityFeatures: string[];
};

type JsonObject = Record<string, unknown>;

function isJsonObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 254);
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function cleanPhone(value: unknown) {
  const phone = cleanText(value, 80);
  return phone && /[0-9]/.test(phone) ? phone : null;
}

function cleanSocialUrl(value: unknown, platform: "facebook" | "instagram") {
  const raw = cleanText(value, 500);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const allowed = platform === "facebook"
      ? host === "facebook.com" || host === "m.facebook.com"
      : host === "instagram.com";
    if (!allowed || url.protocol !== "https:" || url.username || url.password) return null;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function flattenJsonLd(value: unknown): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!isJsonObject(value)) return [];
  const graph = Array.isArray(value["@graph"]) ? flattenJsonLd(value["@graph"]) : [];
  return [value, ...graph];
}

function readJsonLd(html: string): JsonObject[] {
  const blocks = [...html.matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)]
    .slice(0, MAX_JSON_LD_BLOCKS);
  return blocks.flatMap((match) => {
    const content = match[1]?.trim() ?? "";
    if (!content || content.length > MAX_JSON_LD_BLOCK_BYTES) return [];
    try {
      return flattenJsonLd(JSON.parse(content));
    } catch {
      return [];
    }
  });
}

function hoursFromSpecification(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  const formatted = values.flatMap((entry) => {
    if (!isJsonObject(entry)) return [];
    const opens = cleanText(entry.opens, 20);
    const closes = cleanText(entry.closes, 20);
    if (!opens || !closes) return [];
    const days = Array.isArray(entry.dayOfWeek) ? entry.dayOfWeek : [entry.dayOfWeek];
    const labels = days
      .map((day) => cleanText(day, 100)?.replace(/^https?:\/\/schema\.org\//, ""))
      .filter((day): day is string => Boolean(day));
    return [`${labels.join(", ") || "Hours"} ${opens}–${closes}`];
  });
  const result = formatted.join("; ");
  return result.length > 0 && result.length <= 300 ? result : null;
}

function firstValue<T>(values: Array<T | null>) {
  return values.find((value): value is T => value !== null) ?? null;
}

function cleanHttpsUrl(value: unknown) {
  const raw = cleanText(value, 1000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanList(values: unknown[], maxItems = 12) {
  return [...new Set(values
    .map((value) => cleanText(value, 120))
    .filter((value): value is string => Boolean(value)))]
    .slice(0, maxItems);
}

function offerNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(offerNames);
  if (!isJsonObject(value)) return [];
  const item = isJsonObject(value.itemOffered) ? value.itemOffered : value;
  return cleanList([item.name, item.serviceType]);
}

function catalogOfferNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(catalogOfferNames);
  if (!isJsonObject(value)) return [];
  const items = Array.isArray(value.itemListElement) ? value.itemListElement : [];
  return items.flatMap((item) => offerNames(item));
}

function namedValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return cleanList(values.flatMap((item) => isJsonObject(item) ? [item.name] : [item]));
}

function actionTarget(value: unknown, acceptedTypes: string[]) {
  const values = Array.isArray(value) ? value : [value];
  for (const action of values) {
    if (!isJsonObject(action)) continue;
    const type = cleanText(action["@type"], 100);
    if (!type || !acceptedTypes.includes(type)) continue;
    const target = isJsonObject(action.target) ? action.target.urlTemplate ?? action.target.url : action.target;
    const url = cleanHttpsUrl(target);
    if (url) return url;
  }
  return null;
}

function factualSummary(services: string[], areaServed: string[]) {
  const servicePart = services.length ? `Offers ${services.slice(0, 3).join(", ")}.` : null;
  const areaPart = areaServed.length ? `Serves ${areaServed.slice(0, 3).join(", ")}.` : null;
  const summary = [servicePart, areaPart].filter(Boolean).join(" ");
  return summary && summary.length <= 500 ? summary : null;
}

export function extractOwnerWebsitePreview(html: string, sourceUrl: string, checkedAt: string): OwnerWebsitePreview {
  const records = readJsonLd(html);
  const sameAs = records.flatMap((record) => Array.isArray(record.sameAs) ? record.sameAs : [record.sameAs]);
  const services = cleanList(records.flatMap((record) => [
    ...offerNames(record.makesOffer),
    ...offerNames(record.offers),
    ...catalogOfferNames(record.hasOfferCatalog),
  ]));
  const areaServed = cleanList(records.flatMap((record) => namedValues(record.areaServed)));
  const accessibilityFeatures = cleanList(records.flatMap((record) => namedValues(record.amenityFeature)));
  return {
    sourceUrl,
    checkedAt,
    phone: firstValue(records.map((record) => cleanPhone(record.telephone))),
    email: firstValue(records.map((record) => cleanEmail(record.email))),
    tradingHours: firstValue(records.flatMap((record) => [
      cleanText(Array.isArray(record.openingHours) ? record.openingHours.join("; ") : record.openingHours, 300),
      hoursFromSpecification(record.openingHoursSpecification),
    ])),
    facebookUrl: firstValue(sameAs.map((item) => cleanSocialUrl(item, "facebook"))),
    instagramUrl: firstValue(sameAs.map((item) => cleanSocialUrl(item, "instagram"))),
    summary: factualSummary(services, areaServed),
    services,
    bookingUrl: firstValue(records.map((record) => actionTarget(record.potentialAction, ["ReserveAction", "OrderAction"]))),
    menuUrl: firstValue(records.map((record) => cleanHttpsUrl(record.menu))),
    areaServed,
    accessibilityFeatures,
  };
}

function sameHostOrWwwVariant(initialHost: string, nextHost: string) {
  const normalize = (host: string) => host.toLowerCase().replace(/^www\./, "");
  return normalize(initialHost) === normalize(nextHost);
}

function parseAllowedWebsite(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !url.hostname ||
    /^\d+(?:\.\d+){3}$/.test(url.hostname) ||
    url.hostname.toLowerCase() === "localhost" ||
    url.hostname.toLowerCase().endsWith(".local")
  ) {
    throw new Error("The recorded website is not eligible for a safe preview.");
  }
  return url;
}

async function readBoundedHtml(response: Response) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) {
    throw new Error("The website page is too large to preview safely.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let html = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("The website page is too large to preview safely.");
    }
    html += decoder.decode(value, { stream: true });
  }
  return `${html}${decoder.decode()}`;
}

type PreviewDocument = { sourceUrl: string; html: string };

async function fetchOwnerAuthorisedDocument(initial: URL, requiredHost: string): Promise<PreviewDocument> {
  let current = initial;
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: { "user-agent": "SuburbMates-owner-profile-preview/1.0" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === 3) throw new Error("The website redirect could not be previewed safely.");
      const next = parseAllowedWebsite(new URL(location, current).toString());
      if (!sameHostOrWwwVariant(requiredHost, next.hostname)) throw new Error("The website redirected away from its recorded domain.");
      current = next;
      continue;
    }
    if (!response.ok) throw new Error("The website could not be reached for a profile preview.");
    if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) throw new Error("The recorded website did not return an HTML page.");
    return { sourceUrl: current.toString(), html: await readBoundedHtml(response) };
  }
  throw new Error("The website redirect could not be previewed safely.");
}

function approvedLinkedPages(html: string, base: URL) {
  const pageHint = /(?:about|service|contact|menu|book|accessib)/i;
  const links = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#?]+)[^"']*["'][^>]*>/gi)]
    .map((match) => match[1])
    .filter((href): href is string => Boolean(href))
    .flatMap((href) => {
      try {
        const url = parseAllowedWebsite(new URL(href, base).toString());
        if (!sameHostOrWwwVariant(base.hostname, url.hostname) || !pageHint.test(url.pathname)) return [];
        url.search = "";
        url.hash = "";
        return [url];
      } catch {
        return [];
      }
    });
  return [...new Map(links.map((url) => [url.toString(), url])).values()].slice(0, 4);
}

/**
 * Reads only machine-readable JSON-LD after an owner explicitly authorises a
 * preview. No page text, HTML, media, cookies, or result is persisted here.
 */
export async function previewOwnerAuthorisedWebsite(value: string): Promise<OwnerWebsitePreview> {
  const initial = parseAllowedWebsite(value);
  const homepage = await fetchOwnerAuthorisedDocument(initial, initial.hostname);
  const linkedPages = approvedLinkedPages(homepage.html, new URL(homepage.sourceUrl));
  const extraPages = await Promise.all(linkedPages.map(async (url) => {
    try {
      return await fetchOwnerAuthorisedDocument(url, initial.hostname);
    } catch {
      // A linked page is optional. Its failure must not block an owner from
      // using valid structured facts on the recorded homepage.
      return null;
    }
  }));
  return extractOwnerWebsitePreview(
    [homepage.html, ...extraPages.flatMap((page) => page ? [page.html] : [])].join("\n"),
    homepage.sourceUrl,
    new Date().toISOString(),
  );
}
