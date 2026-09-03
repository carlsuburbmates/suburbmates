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

export function extractOwnerWebsitePreview(html: string, sourceUrl: string, checkedAt: string): OwnerWebsitePreview {
  const records = readJsonLd(html);
  const sameAs = records.flatMap((record) => Array.isArray(record.sameAs) ? record.sameAs : [record.sameAs]);
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

/**
 * Reads only machine-readable JSON-LD after an owner explicitly authorises a
 * preview. No page text, HTML, media, cookies, or result is persisted here.
 */
export async function previewOwnerAuthorisedWebsite(value: string): Promise<OwnerWebsitePreview> {
  const initial = parseAllowedWebsite(value);
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
      if (!sameHostOrWwwVariant(initial.hostname, next.hostname)) {
        throw new Error("The website redirected away from its recorded domain.");
      }
      current = next;
      continue;
    }
    if (!response.ok) throw new Error("The website could not be reached for a profile preview.");
    if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      throw new Error("The recorded website did not return an HTML page.");
    }
    return extractOwnerWebsitePreview(
      await readBoundedHtml(response),
      current.toString(),
      new Date().toISOString(),
    );
  }
  throw new Error("The website redirect could not be previewed safely.");
}
