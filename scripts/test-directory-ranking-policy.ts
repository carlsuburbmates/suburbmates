import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const publicDirectoryRoutes = [
  "web/src/app/(directory)/businesses/page.tsx",
  "web/src/app/(directory)/[suburb]/[service]/page.tsx",
];
const typoSearchMigration = "supabase/migrations/20260818093000_public_directory_typo_search.sql";

async function run() {
  for (const route of publicDirectoryRoutes.slice(1)) {
    const source = await readFile(route, "utf8");
    assert.doesNotMatch(source, /\.order\(["']tier["']/, `${route} must not rank public results by commercial tier`);
    assert.match(source, /\.order\(["']business_name["']/, `${route} must have a deterministic non-commercial ordering`);
  }

  const businesses = await readFile(publicDirectoryRoutes[0], "utf8");
  const migration = await readFile(typoSearchMigration, "utf8");
  assert.match(businesses, /rpc\("search_published_vendors"/, "keyword search must use the public typo-tolerant reader");
  assert.match(businesses, /browsePage/, "empty keyword browsing must retain the direct public reader");
  assert.doesNotMatch(businesses, /\.order\(["']tier["']/, "directory search must not rank by commercial tier");
  assert.match(migration, /FROM public\.published_vendors AS vendor/, "typo search must use the safe public projection");
  assert.doesNotMatch(migration, /FROM public\.vendors\b/, "typo search must not read the private canonical table");
  assert.match(migration, /SECURITY INVOKER/, "typo search must run with caller privileges");
  assert.match(migration, /GRANT EXECUTE[\s\S]*TO anon, authenticated, service_role/, "only public-reader roles may execute typo search");
  assert.match(migration, /ORDER BY match_priority, match_distance ASC, business_name ASC, id ASC/, "typo search must retain deterministic non-commercial ordering");

  console.log("Public directory ranking policy tests passed.");
}

await run();
