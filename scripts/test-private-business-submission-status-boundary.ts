import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260722000839_private_business_submission_status.sql", "utf8");
const joinActions = fs.readFileSync("web/src/app/(directory)/join/actions.ts", "utf8");
const joinPage = fs.readFileSync("web/src/app/(directory)/join/page.tsx", "utf8");
const dashboard = fs.readFileSync("web/src/app/(directory)/dashboard/page.tsx", "utf8");
const opsListingDetail = fs.readFileSync("web/src/app/ops/listings/[vendorId]/page.tsx", "utf8");

assert.match(migration, /submitter_email TEXT NOT NULL/);
assert.match(migration, /request\.submitter_email=v_email/);
assert.match(migration, /REVOKE ALL ON TABLE public\.business_submission_requests FROM PUBLIC, anon, authenticated/);
assert.match(migration, /'publication_unchanged',true/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.list_current_business_submission_statuses\(\) TO authenticated/);
assert.match(joinActions, /submit_business_listing_with_status/);
assert.match(dashboard, /list_current_business_submission_statuses/);
assert.match(dashboard, /Listing and ownership outcomes are shown separately on this page\./);
assert.match(dashboard, /Check Your ownership requests below for ownership status\./);
assert.doesNotMatch(dashboard, /They do not publish a listing or assign ownership\./);
assert.match(joinPage, /No sign-in is needed\./);
assert.match(joinPage, /You do not need an account to submit\./);
assert.match(opsListingDetail, /"submission_status"/);
assert.match(opsListingDetail, /Private submitter status saved\. Publication was not changed\./);
assert.match(opsListingDetail, /If approved status messages are enabled, the system also attempts to notify the submitter\./);
for (const forbidden of ["is_published = true", "SET owner_id =", "TO anon"]) assert(!migration.includes(forbidden), `Private submission status must not contain ${forbidden}.`);
console.log("Private business-submission status boundary checks passed.");
