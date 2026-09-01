import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const unified = readFileSync("docs/REFERENCE/SuburbMates — Unified Operations Specification.md", "utf8");
const decisionLog = readFileSync("docs/REFERENCE/SuburbMates — Decision Log.md", "utf8");
const automationReadme = readFileSync("docs/AUTOMATION/README.md", "utf8");
const automationWorkflows = readFileSync("docs/AUTOMATION/WORKFLOWS.md", "utf8");
const lifecycleContract = readFileSync("docs/REFERENCE/SuburbMates — Listing Lifecycle and Release-State Contract.md", "utf8");
const responsibilityMap = readFileSync("docs/REFERENCE/SuburbMates — Operations Responsibility and Follow-through Map.md", "utf8");
const catalogueCoverage = readFileSync("docs/catalogue-coverage.md", "utf8");
const existingCatalogueAudit = readFileSync("docs/AUTOMATION/EXISTING_CATALOGUE_REQUALIFICATION_AUDIT.md", "utf8");
const candidateOps = readFileSync("web/src/app/ops/candidates/page.tsx", "utf8");
const candidateDetail = readFileSync("web/src/app/ops/candidates/[recordId]/page.tsx", "utf8");
const catalogueReview = readFileSync("web/src/app/ops/catalogue-review/page.tsx", "utf8");

assert.match(unified, /## Historical-reference boundary/);
assert.match(unified, /must not be revived from this document/);
assert.match(unified, /Stripe checkout, subscriptions, invoices, payment-status operations, Premium presentation/);
assert.match(unified, /manual-only publication rule/);
assert.match(unified, /requires a new owner-approved benefit, price, lifecycle and reconciliation specification/);
assert.match(decisionLog, /D-018 — Modern directory automation, useful public profiles and value-first owner participation/);
assert.match(decisionLog, /Payment must never determine publication, ownership, legitimacy, factual trust signals or organic search ranking/);
assert.match(automationReadme, /versioned \*\*approved-source candidate handoff\*\*/);
assert.doesNotMatch(automationReadme, /sole narrow publication path is the token-protected OpenStreetMap candidate handoff/);
assert.match(automationWorkflows, /Tax Practitioners Board catalogue discovery/);
assert.match(automationWorkflows, /OpenStreetMap, the licensed Victorian liquor-licence source, the Tax Practitioners Board organisation-only register and the ASIC Credit Licensee register/);
assert.match(automationWorkflows, /Victorian locality boundary entry is supporting evidence for OSM location resolution only/);
for (const authority of [lifecycleContract, responsibilityMap, catalogueCoverage]) {
  assert.doesNotMatch(authority, /source, scope, contact, duplicate and safety checks/);
}
assert.match(lifecycleContract, /A missing website, phone or email is not itself a disqualifier/);
assert.match(responsibilityMap, /A missing website, phone or email does not itself hold an otherwise identifiable local business/);
assert.match(catalogueCoverage, /Missing website, phone or email is not a standalone exclusion/);
assert.match(existingCatalogueAudit, /historical 26 July evidence snapshot, not the current D-018 qualification policy/);
assert.match(existingCatalogueAudit, /D-018 superseded that rule/);
for (const source of [candidateOps, candidateDetail, catalogueReview]) {
  assert.match(source, /Historical evidence did not include a direct contact route/);
  assert.match(source, /This alone no longer blocks an otherwise qualifying approved-source listing/);
  assert.doesNotMatch(source, /There is no usable way for customers to contact the business\./);
}

console.log("Current authority boundary checks passed.");
