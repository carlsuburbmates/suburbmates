import assert from "node:assert/strict";
import fs from "node:fs";

const work = fs.readFileSync("web/src/lib/ops/work.ts", "utf8");
const layout = fs.readFileSync("web/src/app/ops/layout.tsx", "utf8");
const page = fs.readFileSync("web/src/app/ops/page.tsx", "utf8");
const businesses = fs.readFileSync("web/src/app/ops/listings/page.tsx", "utf8");
const system = fs.readFileSync("web/src/app/ops/system/page.tsx", "utf8");
const registerMigration = fs.readFileSync("supabase/migrations/20260725120000_alphabetical_ops_business_register.sql", "utf8");

assert.match(layout, /Work/);
assert.match(layout, /Businesses/);
assert.match(layout, /System/);
assert.doesNotMatch(layout, />Candidates</);
assert.doesNotMatch(layout, />Catalogue review</);
assert.match(page, /All open work/);
assert.match(page, /Open work list/);
assert.match(page, /Act now/);
assert.match(page, /Needs a decision/);
assert.match(page, /Later review/);
assert.match(work, /possible_duplicate/);
assert.match(work, /qualification_reasons\.length === 1/);
assert.match(work, /"act_now"/);
assert.match(work, /"needs_decision"/);
assert.match(work, /"later_review"/);
assert.match(page, /ops_list_candidate_handoff_records/);
assert.match(page, /ops_list_existing_catalogue_requalification_exceptions/);
assert.match(businesses, /Business register/);
assert.match(businesses, /"all"/);
assert.doesNotMatch(businesses, /Tier: \{listing\.tier\}/);
assert.match(registerMigration, /PERFORM private\.require_active_operator\(\)/);
assert.match(registerMigration, /CASE WHEN v_status = 'all' THEN vendor\.business_name END ASC/);
assert.match(system, /Commercial readiness/);
assert.match(system, /Billing is off/);
for (const forbidden of ["work_items", "realtime", "Stripe checkout", "subscription", "invoice", "ABN request"]) {
  assert(!page.includes(forbidden) && !work.includes(forbidden), `Ops Work must not introduce ${forbidden}`);
}
console.log("Ops workspace boundary checks passed.");
