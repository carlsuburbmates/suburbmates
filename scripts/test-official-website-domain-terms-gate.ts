import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260904183000_official_website_domain_terms_gate.sql", "utf8");
const page = fs.readFileSync("web/src/app/ops/system/website-pilot/page.tsx", "utf8");
const action = fs.readFileSync("web/src/app/ops/system/website-pilot/actions.ts", "utf8");

assert.match(migration, /CREATE TABLE public\.official_website_domain_reviews/);
assert.match(migration, /review_status IN \('pending', 'approved', 'blocked'\)/);
assert.match(migration, /private\.require_active_operator\(\)/);
assert.match(migration, /An https terms or permission record is required before approval/);
assert.match(migration, /source_enabled_unchanged/);
assert.match(migration, /REVOKE ALL ON TABLE public\.official_website_domain_reviews FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.ops_decide_official_website_domain_review/);
assert.doesNotMatch(migration, /UPDATE public\.vendors/);
assert.doesNotMatch(migration, /INSERT INTO public\.listing_field_evidence/);
assert.match(page, /ops_list_official_website_domain_reviews/);
assert.match(page, /bounded runner may then inspect only that approved host/);
assert.match(page, /never creates a business, publishes one, imports media or page copy, or creates Work/);
assert.match(page, /automatic runner remains safely idle/);
assert.match(action, /verifyOpsAdmin/);
assert.match(action, /ops_decide_official_website_domain_review/);
assert.match(action, /revalidatePath\("\/ops\/system"\)/);

console.log("Official website terms gate is operator-only and cannot change public listings.");
