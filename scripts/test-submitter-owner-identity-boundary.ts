import assert from "node:assert/strict";
import fs from "node:fs";

const submission = fs.readFileSync("supabase/migrations/20260722000839_private_business_submission_status.sql", "utf8");
const claim = fs.readFileSync("supabase/migrations/20260721235307_claim_evidence_handoff.sql", "utf8");

assert.match(submission, /submitter_email TEXT NOT NULL/);
assert.doesNotMatch(submission, /submitter_email TEXT NOT NULL UNIQUE/);
assert.doesNotMatch(submission, /submitter_email UUID/);
assert.match(claim, /lower\(coalesce\(v_vendor\.contact_email, ''\)\) <> v_email/);
assert.match(claim, /claimant_user_id, claimant_email/);
assert.doesNotMatch(claim, /business_submission_requests/);

console.log("Submitter-owner identity boundary checks passed.");
