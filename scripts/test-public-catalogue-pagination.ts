import assert from "node:assert/strict";
import {
  buildPublicSitemapUrls,
  collectAllPages,
  PublicCatalogueReadError,
  publishedCategorySlugs,
  publishedSuburbSlugs,
  type PublicVendorRouteRow,
} from "../web/src/lib/public-catalogue";

function rows(count: number): PublicVendorRouteRow[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `vendor-${String(index + 1).padStart(4, "0")}`,
    category_slug: index >= 1000 ? "after-page-one" : `category-${index % 7}`,
    suburb_slug: index >= 1000 ? "late-suburb" : `suburb-${index % 3}`,
  }));
}

function mockFetcher(source: PublicVendorRouteRow[], calls: Array<[number, number]>) {
  return async (from: number, to: number) => {
    calls.push([from, to]);
    return { data: source.slice(from, to + 1), count: source.length, error: null };
  };
}

async function run() {
  const sixteenHundred = rows(1600);
  const calls: Array<[number, number]> = [];
  const collected = await collectAllPages(mockFetcher(sixteenHundred, calls));
  assert.equal(collected.length, 1600);
  assert.deepEqual(calls, [[0, 999], [1000, 1999]]);
  assert.equal(new Set(collected.map((row) => row.id)).size, 1600);

  const exactCalls: Array<[number, number]> = [];
  assert.equal((await collectAllPages(mockFetcher(rows(2000), exactCalls))).length, 2000);
  assert.deepEqual(exactCalls, [[0, 999], [1000, 1999]]);

  const emptyCalls: Array<[number, number]> = [];
  assert.deepEqual(await collectAllPages(mockFetcher([], emptyCalls)), []);
  assert.deepEqual(emptyCalls, [[0, 999]]);

  await assert.rejects(
    collectAllPages(async (from) => from === 0
      ? { data: sixteenHundred.slice(0, 1000), count: 1600, error: null }
      : { data: null, count: 1600, error: { code: "page_failed" } }),
    PublicCatalogueReadError,
  );

  await assert.rejects(
    collectAllPages(async (from) => ({
      data: sixteenHundred.slice(from, from + 1000),
      count: from === 0 ? 1600 : 1599,
      error: null,
    })),
    /count changed/,
  );

  await assert.rejects(
    collectAllPages(async (from) => ({
      data: from === 0 ? sixteenHundred.slice(0, 1000) : [sixteenHundred[999], ...sixteenHundred.slice(1001)],
      count: 1600,
      error: null,
    })),
    /duplicate or missing ID/,
  );

  await assert.rejects(
    collectAllPages(async (from) => ({ data: from === 0 ? sixteenHundred.slice(0, 1000) : [], count: 1600, error: null })),
    /ended early/,
  );
  await assert.rejects(
    collectAllPages(async () => ({ data: null, count: 1, error: null })),
    /data is missing/,
  );

  const urls = buildPublicSitemapUrls(sixteenHundred);
  assert.equal(new Set(urls).size, urls.length);
  assert(urls.every((url) => url.startsWith("https://suburbmates.com.au")));
  assert(urls.includes("https://suburbmates.com.au/vendor/vendor-1600"));
  assert(urls.includes("https://suburbmates.com.au/categories/after-page-one"));
  assert(urls.includes("https://suburbmates.com.au/late-suburb"));
  assert(urls.includes("https://suburbmates.com.au/late-suburb/after-page-one"));
  for (const route of ["", "/businesses", "/locations", "/categories", "/how-it-works", "/contact", "/privacy"]) {
    assert(urls.includes(`https://suburbmates.com.au${route}`));
  }
  assert(publishedCategorySlugs(sixteenHundred).includes("after-page-one"));
  assert(publishedSuburbSlugs(sixteenHundred).includes("late-suburb"));

  console.log("Public catalogue pagination and sitemap completeness tests passed.");
}

await run();
