import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260904170000_official_website_pilot_system_summary.sql", "utf8");
const system = fs.readFileSync("web/src/app/ops/system/page.tsx", "utf8");

assert.match(migration, /private\.require_active_operator\(\)/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.ops_get_official_website_pilot_summary\(\) FROM PUBLIC, anon, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.ops_get_official_website_pilot_summary\(\) TO authenticated/);
assert.doesNotMatch(migration, /INSERT INTO public\./);
assert.doesNotMatch(migration, /UPDATE public\./);
assert.match(system, /ops_get_official_website_pilot_summary/);
assert.match(system, /It does not start collection, create Work/);
assert.match(system, /Held for terms review/);

console.log("Official website pilot System summary remains aggregate and read-only.");
