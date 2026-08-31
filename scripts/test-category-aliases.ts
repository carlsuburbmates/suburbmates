import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260901150000_category_aliases_jewelry_to_jeweller.sql", "utf8");
const helper = fs.readFileSync("web/src/lib/category-aliases.ts", "utf8");
const businesses = fs.readFileSync("web/src/app/(directory)/businesses/page.tsx", "utf8");
const categoryRoute = fs.readFileSync("web/src/app/(directory)/categories/[slug]/page.tsx", "utf8");
const pairRoute = fs.readFileSync("web/src/app/(directory)/[suburb]/[service]/page.tsx", "utf8");
const candidateRoute = fs.readFileSync("web/src/app/api/automation/candidates/route.ts", "utf8");
const joinActions = fs.readFileSync("web/src/app/(directory)/join/actions.ts", "utf8");

assert.match(migration, /CREATE TABLE IF NOT EXISTS public\.category_aliases/);
assert.match(migration, /VALUES \('jeweller', 'Jeweller', 'Find local jewellers in Darebin\.'\)/);
assert.match(migration, /VALUES \('jewelry', 'jeweller'\)/);
assert.match(migration, /CREATE TRIGGER normalize_vendor_category_alias/);
assert.match(migration, /UPDATE public\.vendors/);
assert.match(migration, /SET category_slug = private\.canonical_category_slug/);
assert.doesNotMatch(migration, /DELETE FROM public\.vendors|DELETE FROM public\.categories/);
assert.match(helper, /canonicalCategorySlug/);
assert.match(helper, /canonicalDirectoryCategories/);
assert.match(businesses, /const category = canonicalCategorySlug/);
assert.match(categoryRoute, /permanentRedirect\("\/categories\/" \+ categorySlug\)/);
assert.match(pairRoute, /permanentRedirect\("\/" \+ suburbSlug \+ "\/" \+ categorySlug\)/);
assert.match(candidateRoute, /categorySlug: canonicalCategorySlug/);
assert.match(joinActions, /p_category_slug: canonicalCategory/);
assert.match(joinActions, /p_category_slug: canonicalCategorySlug/);

console.log("Category alias mapping checks passed.");
