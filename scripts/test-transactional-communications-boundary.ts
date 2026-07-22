import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const delivery = fs.readFileSync(path.join(root, "web/src/lib/communications/stage1-status.ts"), "utf8");
const stage1 = fs.readFileSync(path.join(root, "supabase/migrations/20260722030000_stage1_status_communications.sql"), "utf8");
const stage2 = fs.readFileSync(path.join(root, "supabase/migrations/20260722031500_stage2_outcome_communications.sql"), "utf8");
const claims = fs.readFileSync(path.join(root, "web/src/app/ops/claims/actions.ts"), "utf8");
const profileEdits = fs.readFileSync(path.join(root, "web/src/app/ops/profile-edits/actions.ts"), "utf8");
const listings = fs.readFileSync(path.join(root, "web/src/app/ops/listings/actions.ts"), "utf8");
const contact = fs.readFileSync(path.join(root, "web/src/app/ops/contact/actions.ts"), "utf8");

assert.match(delivery, /runtimeEnv\("TRANSACTIONAL_STATUS_EMAILS_ENABLED"\) !== "true"/);
assert.match(delivery, /entityType: "claim_request" \| "profile_change"/);
assert.match(delivery, /entityType: "business_submission" \| "contact_request"/);
assert.match(delivery, /record_communication_delivery/);
assert.doesNotMatch(delivery, /setTimeout|setInterval|retry/i);
assert.doesNotMatch(delivery, /UPDATE public\.vendors|owner_id|is_published/);

for (const migration of [stage1, stage2]) {
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /TO service_role/);
  assert.doesNotMatch(migration, /GRANT EXECUTE[\s\S]*TO authenticated/);
}

assert.match(claims, /ops_decide_claim[\s\S]*sendStage1Status\("claim_request"/);
assert.match(profileEdits, /ops_decide_profile_change[\s\S]*sendStage1Status\("profile_change"/);
assert.match(listings, /ops_set_business_submission_status[\s\S]*sendStage2Outcome\("business_submission"/);
assert.match(contact, /status === "resolved"\) await sendStage2Outcome\("contact_request"/);

console.log("Transactional communications boundary checks passed.");
