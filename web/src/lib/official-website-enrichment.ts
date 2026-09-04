const MAX_HTML_BYTES = 512_000;
const MAX_JSON_LD_BLOCK_BYTES = 64_000;
const MAX_JSON_LD_BLOCKS = 12;
const MAX_REDIRECTS = 3;

export type WebsiteFactName =
  | "phone"
  | "email"
  | "trading_hours"
  | "street_address"
  | "service"
  | "booking_url"
  | "menu_url"
  | "area_served"
  | "accessibility";

export type WebsiteFact = {
  fieldName: WebsiteFactName;
  value: string;
};

export type OfficialWebsiteInspection = {
  outcome: "eligible" | "blocked" | "unsupported";
  sourceUrl: string | null;
  checkedAt: string;
  contentFingerprint: string | null;
  facts: WebsiteFact[];
  reason: string | null;
};

type JsonObject = Record<string, unknown>;
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

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
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null;
}

function cleanPhone(value: unknown) {
  const phone = cleanText(value, 80);
  return phone && /[0-9]/.test(phone) ? phone : null;
}

function cleanHttpsUrl(value: unknown) {
  const raw = cleanText(value, 2_000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
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

function stringValues(value: unknown, maxLength: number) {
  const values = Array.isArray(value) ? value : [value];
  return values.map((entry) => cleanText(entry, maxLength)).filter((entry): entry is string => Boolean(entry));
}

function serviceNames(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((entry) => {
    if (isJsonObject(entry)) {
      return [cleanText(entry.name, 140), ...serviceNames(entry.itemListElement), ...serviceNames(entry.itemOffered)]
        .filter((item): item is string => Boolean(item));
    }
    return stringValues(entry, 140);
  });
}

function addressText(value: unknown) {
  if (!isJsonObject(value)) return null;
  return ["streetAddress", "addressLocality", "addressRegion", "postalCode"]
    .map((field) => cleanText(value[field], 160))
    .filter((item): item is string => Boolean(item))
    .join(", ") || null;
}

function actionUrls(value: unknown): WebsiteFact[] {
  const values = Array.isArray(value) ? value : [value];
  const facts: WebsiteFact[] = [];
  for (const entry of values) {
    if (!isJsonObject(entry)) continue;
    const type = stringValues(entry["@type"], 80).join(" ").toLowerCase();
    const target = isJsonObject(entry.target) ? entry.target.url : entry.target;
    const url = cleanHttpsUrl(target);
    if (!url) continue;
    if (/(reserve|book|order)/.test(type)) facts.push({ fieldName: "booking_url", value: url });
    if (/menu/.test(type)) facts.push({ fieldName: "menu_url", value: url });
  }
  return facts;
}

function uniqueFacts(facts: WebsiteFact[]) {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.fieldName}\u0000${fact.value.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extracts explicit structured business facts only. It deliberately has no
 * description, review, testimonial, logo, image, HTML, or page-copy output.
 */
export function extractOfficialWebsiteFacts(html: string): WebsiteFact[] {
  const records = readJsonLd(html);
  const facts = records.flatMap((record) => {
    const hours = cleanText(Array.isArray(record.openingHours) ? record.openingHours.join("; ") : record.openingHours, 300)
      ?? hoursFromSpecification(record.openingHoursSpecification);
    return [
      cleanPhone(record.telephone) ? { fieldName: "phone" as const, value: cleanPhone(record.telephone)! } : null,
      cleanEmail(record.email) ? { fieldName: "email" as const, value: cleanEmail(record.email)! } : null,
      hours ? { fieldName: "trading_hours" as const, value: hours } : null,
      addressText(record.address) ? { fieldName: "street_address" as const, value: addressText(record.address)! } : null,
      ...serviceNames(record.serviceType).map((value) => ({ fieldName: "service" as const, value })),
      ...serviceNames(record.makesOffer).map((value) => ({ fieldName: "service" as const, value })),
      ...serviceNames(record.hasOfferCatalog).map((value) => ({ fieldName: "service" as const, value })),
      ...stringValues(record.areaServed, 140).map((value) => ({ fieldName: "area_served" as const, value })),
      ...stringValues(record.accessibilityFeature, 180).map((value) => ({ fieldName: "accessibility" as const, value })),
      ...actionUrls(record.potentialAction),
    ].filter((fact): fact is WebsiteFact => Boolean(fact));
  });
  return uniqueFacts(facts).slice(0, 40);
}

function parseAllowedWebsite(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname
    || /^\d+(?:\.\d+){3}$/.test(url.hostname) || url.hostname.includes(":")
    || url.hostname.toLowerCase() === "localhost" || url.hostname.toLowerCase().endsWith(".local")
  ) throw new Error("The recorded website is not eligible for enrichment.");
  return url;
}

function sameHostOrWwwVariant(initialHost: string, nextHost: string) {
  const normalize = (host: string) => host.toLowerCase().replace(/^www\./, "");
  return normalize(initialHost) === normalize(nextHost);
}

function pathMatches(path: string, rule: string) {
  if (!rule) return true;
  const escaped = rule.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}`).test(path);
}

/** Returns false only when the best matching robots group disallows the path. */
export function isRobotsPathAllowed(robotsText: string, userAgent: string, path: string) {
  type Group = { agents: string[]; rules: Array<{ allow: boolean; path: string }> };
  const groups: Group[] = [];
  let group: Group | null = null;
  for (const sourceLine of robotsText.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = sourceLine.split("#", 1)[0].trim();
    const match = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (key === "user-agent") {
      if (!group || group.rules.length > 0) {
        group = { agents: [], rules: [] };
        groups.push(group);
      }
      group.agents.push(value.toLowerCase());
    } else if ((key === "allow" || key === "disallow") && group && group.agents.length > 0) {
      group.rules.push({ allow: key === "allow", path: value });
    }
  }
  const agent = userAgent.toLowerCase();
  const matching = groups.flatMap((candidate) => candidate.agents
    .filter((candidateAgent) => candidateAgent === "*" || agent.includes(candidateAgent))
    .map((candidateAgent) => ({ candidate, specificity: candidateAgent === "*" ? 0 : candidateAgent.length })));
  const specificity = Math.max(-1, ...matching.map((entry) => entry.specificity));
  const rules = matching.filter((entry) => entry.specificity === specificity).flatMap((entry) => entry.candidate.rules)
    .filter((rule) => rule.path.length > 0 && pathMatches(path, rule.path));
  if (rules.length === 0) return true;
  rules.sort((left, right) => right.path.length - left.path.length || Number(right.allow) - Number(left.allow));
  return rules[0].allow;
}

async function readBoundedHtml(response: Response) {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_HTML_BYTES) throw new Error("The website page is too large.");
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
      throw new Error("The website page is too large.");
    }
    html += decoder.decode(value, { stream: true });
  }
  return `${html}${decoder.decode()}`;
}

async function fingerprint(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function result(outcome: OfficialWebsiteInspection["outcome"], checkedAt: string, reason: string): OfficialWebsiteInspection {
  return { outcome, sourceUrl: null, checkedAt, contentFingerprint: null, facts: [], reason };
}

/**
 * Performs a bounded, non-persistent inspection for the D-021 pilot. Callers
 * decide whether any eligible result may become retained evidence.
 */
export async function inspectOfficialWebsite(value: string, options: {
  fetchImpl?: FetchLike;
  now?: () => Date;
  userAgent?: string;
} = {}): Promise<OfficialWebsiteInspection> {
  const checkedAt = (options.now ?? (() => new Date()))().toISOString();
  const fetchImpl = options.fetchImpl ?? fetch;
  const userAgent = options.userAgent ?? "SuburbMates-official-website-enrichment/1.0";
  let initial: URL;
  try {
    initial = parseAllowedWebsite(value);
  } catch (error) {
    return result("blocked", checkedAt, error instanceof Error ? error.message : "The website is not eligible.");
  }

  const robotsUrl = new URL("/robots.txt", initial);
  let robots: Response;
  try {
    robots = await fetchImpl(robotsUrl, { redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "user-agent": userAgent } });
  } catch {
    return result("blocked", checkedAt, "Robots rules could not be retrieved safely.");
  }
  if (robots.status >= 500 || robots.status === 401 || robots.status === 403 || (robots.status >= 300 && robots.status < 500 && robots.status !== 404 && robots.status !== 410)) {
    return result("blocked", checkedAt, "Robots rules do not permit a safe inspection.");
  }
  if (robots.ok) {
    const robotsText = await robots.text();
    if (!isRobotsPathAllowed(robotsText, userAgent, initial.pathname || "/")) {
      return result("blocked", checkedAt, "Robots rules disallow the recorded page.");
    }
  }

  let current = initial;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    let response: Response;
    try {
      response = await fetchImpl(current, { redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "user-agent": userAgent } });
    } catch {
      return result("unsupported", checkedAt, "The recorded website could not be reached.");
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location || redirect === MAX_REDIRECTS) return result("unsupported", checkedAt, "The website redirect could not be inspected safely.");
      try {
        const next = parseAllowedWebsite(new URL(location, current).toString());
        if (!sameHostOrWwwVariant(initial.hostname, next.hostname)) return result("blocked", checkedAt, "The website redirected away from its recorded domain.");
        current = next;
        continue;
      } catch {
        return result("blocked", checkedAt, "The website redirect is not eligible.");
      }
    }
    if (!response.ok) return result("unsupported", checkedAt, "The recorded website did not return a usable page.");
    if (!response.headers.get("content-type")?.toLowerCase().includes("text/html")) return result("unsupported", checkedAt, "The recorded website did not return HTML.");
    try {
      const html = await readBoundedHtml(response);
      return {
        outcome: "eligible",
        sourceUrl: current.toString(),
        checkedAt,
        contentFingerprint: await fingerprint(html),
        facts: extractOfficialWebsiteFacts(html),
        reason: null,
      };
    } catch (error) {
      return result("unsupported", checkedAt, error instanceof Error ? error.message : "The website could not be read safely.");
    }
  }
  return result("unsupported", checkedAt, "The website redirect could not be inspected safely.");
}
