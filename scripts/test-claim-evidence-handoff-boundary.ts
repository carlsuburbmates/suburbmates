import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260721235307_claim_evidence_handoff.sql", "utf8");
const client = fs.readFileSync("web/src/app/(directory)/claim/ClaimClient.tsx", "utf8");
const join = fs.readFileSync("web/src/app/(directory)/join/page.tsx", "utf8");

assert.match(join, /\/claim\?listing=/);
assert.match(client, /selectedListingId/);
assert.match(client, /Selected profile/);
assert.match(client, /p_abn/);
assert.match(client, /Support your claim/);
assert.match(migration, /p_abn TEXT DEFAULT NULL/);
assert.match(migration, /'email_match', true/);
assert.match(migration, /'abn_status', CASE WHEN v_abn IS NULL THEN 'not_provided' ELSE 'provided_unverified' END/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.submit_claim_for_current_email\(UUID, TEXT, TEXT\) FROM PUBLIC, anon, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.submit_claim_for_current_email\(UUID, TEXT, TEXT\) TO authenticated/);

for (const forbidden of ["is_published = true", "SET owner_id =", "GRANT EXECUTE ON FUNCTION public.submit_claim_for_current_email(UUID, TEXT, TEXT) TO anon"]) {
  assert(!migration.includes(forbidden), `Claim evidence handoff must not contain ${forbidden}.`);
}

console.log("Claim evidence handoff boundary checks passed.");
