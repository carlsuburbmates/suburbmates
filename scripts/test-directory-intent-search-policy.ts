import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260827142810_public_directory_intent_search.sql", "utf8");

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.search_published_vendors/);
assert.match(migration, /FROM public\.published_vendors AS vendor/);
assert.doesNotMatch(migration, /FROM public\.vendors\b/);
assert.match(migration, /SECURITY INVOKER/);
assert.match(migration, /SET search_path = ''/);
assert.match(migration, /\('pets', 'pet'\)/);
assert.match(migration, /\('antique', 'antiques'\)/);
assert.match(migration, /\('vet', 'veterinary'\)/);
assert.match(migration, /stores no query text|never retained/i);
assert.match(migration, /ORDER BY match_priority, match_distance ASC, business_name ASC, id ASC/);
assert.match(migration, /GRANT EXECUTE[\s\S]*TO anon, authenticated, service_role/);
console.log("Directory intent-search policy checks passed.");
