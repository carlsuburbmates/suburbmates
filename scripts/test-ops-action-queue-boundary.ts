import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260723015528_ops_action_overview.sql", "utf8");
const overview = fs.readFileSync("web/src/app/ops/page.tsx", "utf8");
const catalogue = fs.readFileSync("web/src/app/ops/catalogue-review/page.tsx", "utf8");

assert.match(migration, /PERFORM private\.require_active_operator\(\)/);
assert.match(migration, /candidate_exception_count/);
assert.match(migration, /catalogue_exception_count/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.ops_action_overview\(\) FROM PUBLIC, anon, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.ops_action_overview\(\) TO authenticated/);
assert.match(overview, /ops_action_overview/);
assert.match(overview, /Do these next/);
assert.match(overview, /Nothing needs your decision right now/);
assert.match(overview, /Triage discovered-business exceptions/);
assert.match(overview, /Review existing catalogue exceptions/);
assert.match(catalogue, /Open this listing and make a listing decision/);

console.log("Ops action queue boundary checks passed.");
