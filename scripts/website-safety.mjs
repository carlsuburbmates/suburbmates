import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import https from "node:https";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getDomain } from "tldts";

const TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 3;

export function parseHttpsUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || !url.hostname) {
    throw new Error("URL must be credential-free HTTPS on the default port.");
  }
  return url;
}

export function isPublicAddress(address) {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && (b === 0 || b === 168)) || (a === 198 && (b === 18 || b === 19))
      || a >= 224);
  }
  if (family === 6) {
    const normalized = address.toLowerCase();
    const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicAddress(mapped[1]);
    return !(normalized === "::" || normalized === "::1" || normalized.startsWith("fc")
      || normalized.startsWith("fd") || normalized.startsWith("fe8") || normalized.startsWith("fe9")
      || normalized.startsWith("fea") || normalized.startsWith("feb") || normalized.startsWith("ff")
      || normalized.startsWith("2001:db8"));
  }
  return false;
}

export async function resolvePublicHost(hostname) {
  const records = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Host does not resolve exclusively to public addresses.");
  }
  return records[0];
}

function requestPinned(url, record) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      protocol: "https:",
      hostname: url.hostname,
      path: `${url.pathname}${url.search}`,
      method: "HEAD",
      timeout: TIMEOUT_MS,
      lookup: (_hostname, options, callback) => options.all
        ? callback(null, [record])
        : callback(null, record.address, record.family),
      servername: url.hostname,
      headers: { "user-agent": "SuburbMates-website-safety/1.0" },
    }, (response) => {
      response.resume();
      resolve({ status: response.statusCode ?? 0, location: response.headers.location ?? null });
    });
    request.on("timeout", () => request.destroy(new Error("Request timed out.")));
    request.on("error", reject);
    request.end();
  });
}

export async function inspectWebsite(value) {
  const initial = parseHttpsUrl(value);
  const initialDomain = getDomain(initial.hostname) || initial.hostname;
  let current = initial;
  const redirects = [];
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const record = await resolvePublicHost(current.hostname);
    const response = await requestPinned(current, record);
    if (response.status >= 300 && response.status < 400 && response.location) {
      if (hop === MAX_REDIRECTS) throw new Error("Redirect limit exceeded.");
      const next = new URL(response.location, current);
      parseHttpsUrl(next.href);
      redirects.push(next.href);
      current = next;
      continue;
    }
    return {
      status: response.status,
      finalUrl: current.href,
      redirectCount: redirects.length,
      sameRegistrableDomain: (getDomain(current.hostname) || current.hostname) === initialDomain,
      redirects,
    };
  }
  throw new Error("Redirect limit exceeded.");
}

async function fetchPublishedWebsites() {
  const base = requireEnv("WEBSITE_CHECK_SUPABASE_URL").replace(/\/$/, "");
  const key = requireEnv("WEBSITE_CHECK_SUPABASE_PUBLISHABLE_KEY");
  const endpoint = new URL("/rest/v1/published_vendors", base);
  endpoint.searchParams.set("select", "id,slug,business_name,website");
  endpoint.searchParams.set("website", "not.is.null");
  endpoint.searchParams.set("order", "id.asc");
  const response = await fetch(endpoint, { headers: { apikey: key, authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Public website catalogue returned ${response.status}.`);
  return response.json();
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  const allRows = await fetchPublishedWebsites();
  const limit = Number.parseInt(process.env.WEBSITE_CHECK_LIMIT || "0", 10);
  const rows = Number.isInteger(limit) && limit > 0 ? allRows.slice(0, limit) : allRows;
  const results = new Array(rows.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(8, rows.length) }, async () => {
    while (next < rows.length) {
      const index = next++;
      const row = rows[index];
      try {
        results[index] = { id: row.id, slug: row.slug, website: row.website, outcome: "checked", ...(await inspectWebsite(row.website)) };
      } catch (error) {
        results[index] = { id: row.id, slug: row.slug, website: row.website, outcome: "flagged", error: error instanceof Error ? error.message : "Unknown check failure." };
      }
    }
  });
  await Promise.all(workers);
  const report = { checkedAt: new Date().toISOString(), total: results.length, flagged: results.filter((row) => row.outcome === "flagged").length, results };
  const output = process.env.WEBSITE_CHECK_REPORT_PATH || "artifacts/website-safety-report.json";
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Website safety report: ${report.total} checked, ${report.flagged} flagged.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error) => { console.error(error); process.exitCode = 1; });
