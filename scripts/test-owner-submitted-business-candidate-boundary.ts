import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260722003158_owner_submitted_business_candidate.sql", "utf8");
const actions = fs.readFileSync("web/src/app/(directory)/join/actions.ts", "utf8");
const join = fs.readFileSync("web/src/app/(directory)/join/page.tsx", "utf8");

assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /INSERT INTO public\.claim_requests/);
assert.match(migration, /'owner_submitted_candidate', true/);
assert.match(migration, /SET ownership_status = 'claim_pending'/);
assert.match(migration, /'publication_unchanged', true/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.submit_owned_business_candidate_for_current_user[\s\S]*TO authenticated/);
assert.match(actions, /submit_owned_business_candidate_for_current_user/);
assert.match(actions, /createClient\(\)/);
assert.match(join, /I own or represent it/);
assert.match(join, /Suggest a local business/);
assert.match(join, /Submit business and ownership request/);
for (const forbidden of ["is_published = true", "SET owner_id =", "is_claimed = true", "TO anon"]) {
  assert(!migration.includes(forbidden), `Owner candidate flow must not contain ${forbidden}.`);
}
console.log("Owner-submitted business candidate boundary checks passed.");
