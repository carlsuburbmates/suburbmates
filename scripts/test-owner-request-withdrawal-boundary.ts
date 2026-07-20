import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("supabase/migrations/20260720125025_owner_request_withdrawal.sql", "utf8");

for (const functionName of [
  "list_current_owner_claim_requests()",
  "withdraw_current_owner_claim(UUID)",
  "withdraw_current_owner_profile_change(UUID)",
]) {
  assert.match(source, new RegExp(`REVOKE ALL ON FUNCTION public\\.${functionName.replace(/[()]/g, "\\$&")} FROM PUBLIC, anon, service_role`));
}

assert.match(source, /CREATE OR REPLACE FUNCTION public\.withdraw_current_owner_claim\(p_claim_request_id UUID\)/);
assert.match(source, /claim\.claimant_user_id = v_user_id/);
assert.match(source, /claim\.claim_status IN \('pending', 'needs_information'\)/);
assert.match(source, /'claim_withdrawn'/);
assert.match(source, /CREATE OR REPLACE FUNCTION public\.withdraw_current_owner_profile_change\(p_change_request_id UUID\)/);
assert.match(source, /change\.submitted_by = v_user_id/);
assert.match(source, /change\.change_status = 'pending'/);
assert.match(source, /'profile_change_withdrawn'/);
assert.match(source, /'publication_unchanged', v_vendor\.is_published/);

for (const forbidden of ["SET owner_id =", "is_published = true", "GRANT EXECUTE ON FUNCTION public.withdraw_current_owner_claim(UUID) TO anon"]) {
  assert(!source.includes(forbidden), `Owner withdrawal must not contain ${forbidden}.`);
}

console.log("Owner-request withdrawal security boundary checks passed.");
