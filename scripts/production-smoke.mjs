const BASE_URL = normalizeBaseUrl(process.env.BASE_URL || "https://suburbmates.com.au");
const PAGE_SIZE = 1000;
const REQUEST_TIMEOUT_MS = 15_000;
const REQUEST_ATTEMPTS = 3;

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) {
    throw new Error("BASE_URL must be a credential-free HTTPS origin.");
  }
  return url.origin;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "user-agent": "SuburbMates-production-smoke/1.0",
          ...options.headers,
        },
      });
      if (response.status >= 500 && attempt < REQUEST_ATTEMPTS) {
        await response.body?.cancel();
        await delay(500 * attempt);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < REQUEST_ATTEMPTS) await delay(500 * attempt);
    }
  }
  throw new Error(`Request failed after ${REQUEST_ATTEMPTS} attempts: ${url}`, { cause: lastError });
}

async function expectResponse(path, expectedStatus, expectedType, bodyPattern) {
  const url = new URL(path, BASE_URL);
  const response = await request(url);
  assert(response.status === expectedStatus, `${url.pathname} returned ${response.status}, expected ${expectedStatus}.`);
  const contentType = response.headers.get("content-type") || "";
  assert(contentType.includes(expectedType), `${url.pathname} returned unexpected content type ${contentType || "(missing)"}.`);
  const body = await response.text();
  if (bodyPattern) assert(bodyPattern.test(body), `${url.pathname} did not contain its expected public content.`);
  return body;
}

async function expectRedirect(url, expectedStatus, expectedLocation) {
  const response = await request(url, { redirect: "manual" });
  assert(response.status === expectedStatus, `${url} returned ${response.status}, expected redirect ${expectedStatus}.`);
  const location = response.headers.get("location");
  const resolvedLocation = location ? new URL(location, url).href : null;
  assert(resolvedLocation === expectedLocation, `${url} redirected to ${resolvedLocation || "(missing)"}, expected ${expectedLocation}.`);
}

function parseContentRange(value) {
  const match = value?.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (!match) throw new Error(`Supabase returned invalid Content-Range: ${value || "(missing)"}.`);
  return { from: Number(match[1]), to: Number(match[2]), total: Number(match[3]) };
}

async function fetchPublishedVendors() {
  const supabaseUrl = requireEnv("SMOKE_SUPABASE_URL").replace(/\/+$/, "");
  const supabaseKey = requireEnv("SMOKE_SUPABASE_PUBLISHABLE_KEY");
  const endpoint = new URL("/rest/v1/published_vendors", supabaseUrl);
  endpoint.searchParams.set("select", "id,slug,category_slug,suburb_slug");
  endpoint.searchParams.set("order", "id.asc");

  const rows = [];
  const ids = new Set();
  let expectedTotal;

  while (expectedTotal === undefined || rows.length < expectedTotal) {
    const from = rows.length;
    const to = from + PAGE_SIZE - 1;
    const response = await request(endpoint, {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        prefer: "count=exact",
        range: `${from}-${to}`,
        "range-unit": "items",
      },
    });
    assert(response.status === 200 || response.status === 206, `Supabase public catalogue returned ${response.status}.`);
    const range = parseContentRange(response.headers.get("content-range"));
    assert(range.from === from, `Supabase public catalogue started at ${range.from}, expected ${from}.`);
    if (expectedTotal === undefined) expectedTotal = range.total;
    assert(range.total === expectedTotal, "Supabase public catalogue count changed during pagination.");

    const page = await response.json();
    assert(Array.isArray(page), "Supabase public catalogue response was not an array.");
    assert(page.length > 0 || rows.length === expectedTotal, `Supabase public catalogue ended early at ${from}.`);
    for (const row of page) {
      assert(typeof row.id === "string" && row.id.length > 0, `Supabase row at ${rows.length} has no ID.`);
      assert(!ids.has(row.id), `Supabase public catalogue contains duplicate vendor ${row.id}.`);
      ids.add(row.id);
      rows.push(row);
      assert(rows.length <= expectedTotal, "Supabase returned more public vendors than its exact count.");
    }
  }

  assert(rows.length === expectedTotal, `Supabase returned ${rows.length} vendors, expected ${expectedTotal}.`);
  return rows;
}

async function fetchTaxonomyPageEligibility() {
  const supabaseUrl = requireEnv("SMOKE_SUPABASE_URL").replace(/\/+$/, "");
  const supabaseKey = requireEnv("SMOKE_SUPABASE_PUBLISHABLE_KEY");
  const endpoint = new URL("/rest/v1/taxonomy_page_eligibility", supabaseUrl);
  endpoint.searchParams.set("select", "route_type,suburb_slug,category_slug,qualified_listing_count");
  endpoint.searchParams.set("order", "route_type.asc,suburb_slug.asc,category_slug.asc");

  const rows = [];
  const keys = new Set();
  let expectedTotal;

  while (expectedTotal === undefined || rows.length < expectedTotal) {
    const from = rows.length;
    const to = from + PAGE_SIZE - 1;
    const response = await request(endpoint, {
      headers: {
        apikey: supabaseKey,
        authorization: `Bearer ${supabaseKey}`,
        prefer: "count=exact",
        range: `${from}-${to}`,
        "range-unit": "items",
      },
    });
    assert(response.status === 200 || response.status === 206, `Supabase taxonomy eligibility returned ${response.status}.`);
    const range = parseContentRange(response.headers.get("content-range"));
    assert(range.from === from, `Supabase taxonomy eligibility started at ${range.from}, expected ${from}.`);
    if (expectedTotal === undefined) expectedTotal = range.total;
    assert(range.total === expectedTotal, "Supabase taxonomy eligibility count changed during pagination.");

    const page = await response.json();
    assert(Array.isArray(page), "Supabase taxonomy eligibility response was not an array.");
    assert(page.length > 0 || rows.length === expectedTotal, `Supabase taxonomy eligibility ended early at ${from}.`);
    for (const row of page) {
      const key = `${row.route_type}:${row.suburb_slug || ""}:${row.category_slug || ""}`;
      assert(!keys.has(key), `Supabase taxonomy eligibility contains duplicate route ${key}.`);
      keys.add(key);
      rows.push(row);
      assert(rows.length <= expectedTotal, "Supabase returned more taxonomy eligibility rows than its exact count.");
    }
  }

  assert(rows.length === expectedTotal, `Supabase returned ${rows.length} taxonomy rows, expected ${expectedTotal}.`);
  return rows;
}

function buildExpectedSitemap(vendors, taxonomyRows) {
  const urls = new Set([
    BASE_URL,
    `${BASE_URL}/businesses`,
    `${BASE_URL}/locations`,
    `${BASE_URL}/categories`,
    `${BASE_URL}/how-it-works`,
    `${BASE_URL}/contact`,
    `${BASE_URL}/privacy`,
  ]);
  for (const vendor of vendors) {
    urls.add(`${BASE_URL}/vendor/${vendor.slug}`);
  }
  for (const row of taxonomyRows) {
    if (row.route_type === "suburb" && row.suburb_slug && !row.category_slug) {
      urls.add(`${BASE_URL}/${row.suburb_slug}`);
    } else if (row.route_type === "category" && row.category_slug && !row.suburb_slug) {
      urls.add(`${BASE_URL}/categories/${row.category_slug}`);
    } else if (row.route_type === "pair" && row.suburb_slug && row.category_slug) {
      urls.add(`${BASE_URL}/${row.suburb_slug}/${row.category_slug}`);
    }
  }
  return urls;
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function parseSitemap(xml) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeXml(match[1].trim()));
  assert(urls.length > 0, "Live sitemap contained no URLs.");
  const unique = new Set(urls);
  assert(unique.size === urls.length, `Live sitemap contains ${urls.length - unique.size} duplicate URL(s).`);
  for (const value of unique) {
    const url = new URL(value);
    assert(url.origin === BASE_URL, `Live sitemap contains a non-canonical origin: ${url.origin}.`);
  }
  return unique;
}

function compareUrlSets(actual, expected) {
  const missing = [...expected].filter((url) => !actual.has(url));
  const extra = [...actual].filter((url) => !expected.has(url));
  const summary = (values) => values.slice(0, 5).map((url) => new URL(url).pathname).join(", ");
  assert(missing.length === 0, `Live sitemap is missing ${missing.length} URL(s): ${summary(missing)}.`);
  assert(extra.length === 0, `Live sitemap has ${extra.length} unexpected URL(s): ${summary(extra)}.`);
}

async function main() {
  const home = await expectResponse("/", 200, "text/html", /SuburbMates/i);

  const protectedRoutes = ["/ops", "/ops/claims", "/ops/listings", "/ops/profile-edits", "/ops/system"];
  await Promise.all(protectedRoutes.map((path) => expectRedirect(
    `${BASE_URL}${path}`,
    307,
    `${BASE_URL}/login?next=${encodeURIComponent("/ops")}`,
  )));

  if (/Preparing for launch/i.test(home)) {
    assert(
      /<meta[^>]+(?:name="robots"[^>]+content="noindex, nofollow"|content="noindex, nofollow"[^>]+name="robots")/i.test(home),
      "Holding homepage is missing noindex, nofollow robots metadata.",
    );
    assert(!/href="\/(?:businesses|categories|locations|contact|claim|dashboard)"/i.test(home), "Holding homepage exposes an unfinished public journey.");
    console.log("Production holding smoke passed: launch page is noindex and Ops remains protected.");
    return;
  }

  const [businesses, categories, locations, howItWorks, contact, privacy, sitemapXml] = await Promise.all([
    expectResponse("/businesses", 200, "text/html", /business/i),
    expectResponse("/categories", 200, "text/html", /categor/i),
    expectResponse("/locations", 200, "text/html", /location|suburb/i),
    expectResponse("/how-it-works", 200, "text/html", /how it works/i),
    expectResponse("/contact", 200, "text/html", /contact/i),
    expectResponse("/privacy", 200, "text/html", /privacy/i),
    expectResponse("/sitemap.xml", 200, "xml"),
    expectResponse("/robots.txt", 200, "text/plain"),
  ]);
  void businesses;
  void locations;
  void howItWorks;
  void contact;
  void privacy;
  await expectRedirect(
    "https://www.suburbmates.com.au/businesses?suburb=northcote",
    308,
    `${BASE_URL}/businesses?suburb=northcote`,
  );

  const invalidVendor = await request(`${BASE_URL}/vendor/00000000-0000-0000-0000-000000000000`, { redirect: "manual" });
  assert(invalidVendor.status === 404, `Unknown vendor route returned ${invalidVendor.status}, expected 404.`);

  const [vendors, taxonomyRows] = await Promise.all([
    fetchPublishedVendors(),
    fetchTaxonomyPageEligibility(),
  ]);
  assert(vendors.length > 0, "Public catalogue unexpectedly contains no published vendors.");
  assert(taxonomyRows.length > 0, "Taxonomy eligibility projection unexpectedly contains no qualified routes.");
  const sampleVendor = await request(`${BASE_URL}/vendor/${vendors[0].slug}`);
  assert(sampleVendor.status === 200, `Published vendor sample returned ${sampleVendor.status}.`);
  const sampleBody = await sampleVendor.text();
  assert(sampleBody.includes(`${BASE_URL}/vendor/${vendors[0].slug}`), "Published vendor sample is missing its canonical URL.");
  await expectRedirect(
    `${BASE_URL}/vendor/${vendors[0].id}`,
    308,
    `${BASE_URL}/vendor/${vendors[0].slug}`,
  );

  const expected = buildExpectedSitemap(vendors, taxonomyRows);
  const actual = parseSitemap(sitemapXml);
  compareUrlSets(actual, expected);

  const categorySlugs = new Set(vendors.flatMap((vendor) => vendor.category_slug ? [vendor.category_slug] : []));
  for (const slug of categorySlugs) {
    assert(categories.includes(`href="/categories/${slug}"`), `Category index is missing /categories/${slug}.`);
  }

  const suburbSlugs = new Set(vendors.flatMap((vendor) => vendor.suburb_slug ? [vendor.suburb_slug] : []));
  const combinations = new Set(vendors.flatMap((vendor) => vendor.suburb_slug && vendor.category_slug
    ? [`${vendor.suburb_slug}/${vendor.category_slug}`]
    : []));
  console.log(`Production smoke passed: ${vendors.length} vendors, ${taxonomyRows.length} eligible taxonomy routes, ${categorySlugs.size} categories, ${suburbSlugs.size} suburbs, ${combinations.size} suburb/category pages, ${actual.size} sitemap URLs.`);
}

main().catch((error) => {
  console.error(`Production smoke failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  process.exitCode = 1;
});
