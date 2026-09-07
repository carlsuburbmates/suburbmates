import assert from "node:assert/strict";
import fs from "node:fs";
import { factualSummary, planOfficialWebsiteApplication } from "../web/src/lib/official-website-application-plan";

const vendor = { id: "vendor", business_name: "Example", website: "https://example.test", suburb_slug: "northcote", ownership_status: "unclaimed", description: null, contact_email: null, phone: "03 9000 0000", street_address: null, trading_hours: null, services: [], booking_url: null, menu_url: null, area_served: [], accessibility_features: [] };
const facts = [{ fieldName: "phone" as const, value: "03 9000 1111" }, { fieldName: "email" as const, value: "hello@example.test" }, { fieldName: "service" as const, value: "Sourdough baking" }, { fieldName: "service" as const, value: "Wedding cakes" }, { fieldName: "area_served" as const, value: "Darebin" }, { fieldName: "booking_url" as const, value: "https://example.test/book" }];
const plan = planOfficialWebsiteApplication(vendor, facts);
assert.equal(plan.updates.phone, undefined, "An existing field must never be overwritten.");
assert.deepEqual(plan.updates.services, ["Sourdough baking", "Wedding cakes"]);
assert.equal(plan.updates.booking_url, "https://example.test/book");
assert.equal(plan.updates.contact_email, "hello@example.test");
assert.ok(plan.facts.some((fact) => fact.fieldName === "contact_email"));
assert.ok(!plan.facts.some((fact) => fact.fieldName === "email"));
assert.ok(plan.conflictFields.includes("phone"));
assert.match(factualSummary(facts) ?? "", /Services include Sourdough baking, Wedding cakes\. Serves Darebin\./);
assert.equal(factualSummary([{ fieldName: "trading_hours", value: "Mo-Su 09:00-21:00" }]), null, "Hours alone must not create a low-value public description.");
assert.doesNotMatch(JSON.stringify(plan), /image|marketing|testimonial/i);
const addressPlan = planOfficialWebsiteApplication(vendor, [{ fieldName: "street_address", value: "100 William Street, Sydney, NSW, 2000" }]);
assert.equal(addressPlan.updates.street_address, undefined, "A head-office address outside the listing locality must not publish.");
const linkedPagePlan = planOfficialWebsiteApplication(vendor, [
  { fieldName: "service", value: "Emergency plumbing", sourceUrl: "https://example.test/services" },
  { fieldName: "booking_url", value: "https://example.test/book", sourceUrl: "https://example.test/booking" },
]);
assert.deepEqual(linkedPagePlan.updates.services, ["Emergency plumbing"], "A structured service from an eligible linked factual page may fill an empty service list.");
assert.equal(linkedPagePlan.updates.booking_url, "https://example.test/book", "A structured booking destination from an eligible linked factual page may fill an empty booking field.");
assert.ok(linkedPagePlan.facts.every((fact) => fact.sourceUrl?.startsWith("https://example.test/")), "Each linked-page fact must retain exact page provenance.");
const ambiguousContactPlan = planOfficialWebsiteApplication({ ...vendor, phone: null }, [
  { fieldName: "phone", value: "03 9000 1111" },
  { fieldName: "phone", value: "03 9000 2222" },
  { fieldName: "email", value: "north@example.test" },
  { fieldName: "email", value: "south@example.test" },
]);
assert.equal(ambiguousContactPlan.updates.phone, undefined, "Several structured phones must remain private ambiguity evidence.");
assert.equal(ambiguousContactPlan.updates.contact_email, undefined, "Several structured emails must remain private ambiguity evidence.");
assert.ok(ambiguousContactPlan.facts.every((fact) => fact.conflict), "Each ambiguous scalar value must be marked for private conflict review.");
const evidenceOnlyPlan = planOfficialWebsiteApplication(vendor, [
  { fieldName: "service", value: "Unreviewed heading", sourceUrl: "https://example.test/services", evidenceOnly: true },
]);
assert.deepEqual(evidenceOnlyPlan.updates, {}, "Low-confidence page headings must remain evidence-only during rollout.");
assert.equal(evidenceOnlyPlan.facts[0]?.evidenceOnly, true);
assert.equal(evidenceOnlyPlan.facts[0]?.applied, false);
const formattedDuplicatePlan = planOfficialWebsiteApplication({ ...vendor, phone: null }, [
  { fieldName: "phone", value: "03 9794 8688", sourceUrl: "https://example.test/" },
  { fieldName: "phone", value: "+61 3 9794 8688", sourceUrl: "https://example.test/contact" },
]);
assert.equal(formattedDuplicatePlan.updates.phone, "03 9794 8688", "Equivalent Australian phone formatting must not create false ambiguity.");
assert.equal(formattedDuplicatePlan.facts.filter((fact) => fact.fieldName === "phone").length, 1);
const equivalentExistingPlan = planOfficialWebsiteApplication(vendor, [
  { fieldName: "phone", value: "+61 3 9000 0000" },
]);
assert.ok(!equivalentExistingPlan.conflictFields.includes("phone"), "Equivalent Australian phone formatting must not create a private conflict.");
const runner = fs.readFileSync("web/src/lib/official-website-application.ts", "utf8");
const route = fs.readFileSync("web/src/app/api/automation/official-website-enrichment/route.ts", "utf8");
const workflow = fs.readFileSync(".github/workflows/official-website-enrichment.yml", "utf8");
const atomicMigration = fs.readFileSync("supabase/migrations/20260906200333_atomic_official_website_enrichment.sql", "utf8");
const rollbackMigration = fs.readFileSync("supabase/migrations/20260906200544_guarded_official_website_enrichment_rollback.sql", "utf8");
const acceptanceCorrection = fs.readFileSync("supabase/migrations/20260907105902_reject_low_quality_website_enrichment_acceptance.sql", "utf8");
const explicitEvidenceCorrection = fs.readFileSync("supabase/migrations/20260907165753_reject_noisy_explicit_website_evidence.sql", "utf8");
const pilotPage = fs.readFileSync("web/src/app/ops/system/website-pilot/page.tsx", "utf8");
const pilotActions = fs.readFileSync("web/src/app/ops/system/website-pilot/actions.ts", "utf8");
assert.match(runner, /official-business-site-application-v3/);
assert.match(runner, /official_website_inspections/);
assert.match(runner, /freshness_due_at/);
assert.match(runner, /currentVendorIds/);
assert.match(runner, /catalogue_enrichment_runs!inner\(status\)/);
assert.match(runner, /catalogue_enrichment_runs\.status.*completed/);
assert.match(runner, /termsOverride/);
assert.match(runner, /staleBefore/);
assert.match(runner, /Execution ended before the bounded batch completed/);
assert.match(runner, /linked_page_application: "qualified_empty_fields"/);
assert.match(runner, /linked_page_applied_fact_count/);
assert.match(runner, /planOfficialWebsiteApplication\(vendor, inspection\.facts\)/);
assert.doesNotMatch(runner, /const homepageFacts = inspection\.facts\.filter/);
assert.match(runner, /apply_official_website_enrichment_atomic/);
assert.doesNotMatch(runner, /from\("listing_field_evidence"\)\.upsert/);
assert.doesNotMatch(runner, /from\("vendors"\)\.update/);
assert.match(atomicMigration, /FOR UPDATE/);
assert.match(atomicMigration, /Only an unchanged published unclaimed listing may be enriched/);
assert.match(atomicMigration, /Listing changed before enrichment could be committed; no enrichment was applied/);
assert.match(atomicMigration, /INSERT INTO public\.listing_field_evidence/);
assert.match(atomicMigration, /INSERT INTO public\.catalogue_field_conflicts/);
assert.match(atomicMigration, /INSERT INTO public\.audit_events/);
assert.match(atomicMigration, /REVOKE ALL ON FUNCTION public\.apply_official_website_enrichment_atomic/);
assert.match(atomicMigration, /GRANT EXECUTE ON FUNCTION public\.apply_official_website_enrichment_atomic[\s\S]*TO service_role/);
assert.match(rollbackMigration, /ops_rollback_official_website_enrichment/);
assert.match(rollbackMigration, /Rollback stopped because at least one enriched value has since changed/);
assert.match(rollbackMigration, /vendor\.is_claimed IS FALSE/);
assert.match(rollbackMigration, /evidence_state = 'superseded', application_state = 'superseded'/);
assert.match(rollbackMigration, /official_website_factual_enrichment_rolled_back/);
assert.match(rollbackMigration, /GRANT EXECUTE ON FUNCTION public\.ops_rollback_official_website_enrichment[\s\S]*TO authenticated/);
assert.match(acceptanceCorrection, /ambiguous multi-location phone and email values/);
assert.match(acceptanceCorrection, /valid_hours_retained/);
assert.match(acceptanceCorrection, /evidence_retained_as_superseded/);
assert.match(explicitEvidenceCorrection, /official_website_evidence_quality_rejected/);
assert.match(explicitEvidenceCorrection, /public_values_unchanged/);
assert.match(explicitEvidenceCorrection, /evidence_state = 'rejected'/);
assert.match(pilotPage, /Safe enrichment rollback/);
assert.match(pilotPage, /Protected from rollback/);
assert.match(pilotActions, /ops_rollback_official_website_enrichment/);
assert.doesNotMatch(runner, /if \(!approvedHosts\.size\)/);
assert.match(route, /limit !== 1/);
assert.match(workflow, /cron: "13 20 \* \* \*"/);
assert.match(workflow, /seq 1 25/);
assert.match(workflow, /"\$batch"/);
assert.ok(workflow.includes('\\"limit\\":1'));
assert.doesNotMatch(workflow, /--retry/);
console.log("Official website application plans factual homepage and linked-page empty-field enrichment and conflicts.");
