import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260904183000_official_website_domain_terms_gate.sql", "utf8");
const page = fs.readFileSync("web/src/app/ops/system/website-pilot/page.tsx", "utf8");
const action = fs.readFileSync("web/src/app/ops/system/website-pilot/actions.ts", "utf8");
const autonomousMigration = fs.readFileSync("supabase/migrations/20260905045911_autonomous_official_website_terms_assessment.sql", "utf8");

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
assert.match(page, /automatically checks robots and clearly linked same-domain terms/);
assert.match(page, /never creates or publishes a business, imports media or page copy, or creates Work/);
assert.match(page, /operator block always wins/);
assert.match(autonomousMigration, /official-business-site-application-v3/);
assert.match(autonomousMigration, /automated_clear/);
assert.match(autonomousMigration, /terms_fingerprint/);
assert.doesNotMatch(autonomousMigration, /UPDATE public\.vendors/);
assert.match(action, /verifyOpsAdmin/);
assert.match(action, /ops_decide_official_website_domain_review/);
assert.match(action, /revalidatePath\("\/ops\/system"\)/);

console.log("Official website terms gate is operator-only and cannot change public listings.");
