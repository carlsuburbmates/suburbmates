import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260723155744_distinguish_bulk_automation_from_operator_actions.sql", "utf8");
const work = fs.readFileSync("web/src/lib/ops/work.ts", "utf8");
const catalogue = fs.readFileSync("web/src/app/ops/catalogue-review/page.tsx", "utf8");
const candidateRoute = fs.readFileSync("web/src/app/api/automation/candidates/route.ts", "utf8");

assert.match(migration, /PERFORM private\.require_active_operator\(\)/);
assert.match(migration, /candidate_manual_review_count/);
assert.match(migration, /catalogue_manual_review_count/);
assert.match(migration, /SELECT DISTINCT ON \(record\.source_record_key\)/);
assert.match(migration, /Safely superseded by a resumed candidate handoff attempt/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.ops_action_overview\(\) FROM PUBLIC, anon, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.ops_action_overview\(\) TO authenticated/);
assert.match(work, /qualification_reasons\.length === 1/);
assert.match(work, /possible_duplicate/);
assert.match(work, /not a Business/);
assert.match(work, /later_review/);
assert.match(catalogue, /Open this listing and make a listing decision/);
assert.match(candidateRoute, /Safely superseded by a resumed candidate handoff attempt/);
assert.match(candidateRoute, /recovered_by_job_id/);

console.log("Ops action queue boundary checks passed.");
