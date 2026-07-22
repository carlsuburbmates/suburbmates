import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260722012126_candidate_qualification_handoff.sql", "utf8");

assert.match(migration, /CREATE TABLE public\.candidate_handoff_runs/);
assert.match(migration, /UNIQUE \(source, artifact_sha256\)/);
assert.match(migration, /CREATE TABLE public\.candidate_handoff_records/);
assert.match(migration, /qualification_outcome IN \('qualified', 'exception'\)/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /REVOKE ALL ON TABLE public\.candidate_handoff_runs, public\.candidate_handoff_records FROM PUBLIC, anon, authenticated/);
assert.match(migration, /PERFORM private\.require_active_operator\(\)/);
assert.match(migration, /candidate_handoff_exception_/);
assert.doesNotMatch(migration, /GRANT .* TO anon/);
assert.doesNotMatch(migration, /is_published = true/);

console.log("Candidate handoff database boundary checks passed.");
