import assert from "node:assert/strict";
import fs from "node:fs";
import { makeHubSpotDecisionTask } from "../web/src/lib/hubspot/decision-task.ts";

const privateText = "private requester@example.test ABN 12345678901 confidential message";
const contactTask = makeHubSpotDecisionTask({
  workId: "contact:11111111-1111-4111-8111-111111111111",
  kind: "contact",
  priority: "needs_decision",
  href: "/ops/contact/11111111-1111-4111-8111-111111111111",
  title: privateText,
  topic: "privacy",
}, "123", "https://suburbmates.com.au", "2026-08-05T00:00:00.000Z");

assert.equal(contactTask.properties.hs_task_subject, "Review privacy request");
assert.doesNotMatch(JSON.stringify(contactTask), /requester@example|12345678901|confidential message/);
assert.match(contactTask.properties.hs_task_body, /^Open the protected SuburbMates decision: https:\/\/suburbmates\.com\.au\/ops\/contact\//);
assert.throws(() => makeHubSpotDecisionTask({ workId: "bad", kind: "system", priority: "act_now", href: "/contact" }, "123", "https://suburbmates.com.au", "2026-08-05T00:00:00.000Z"));

const integration = fs.readFileSync("web/src/lib/hubspot/decision-inbox.ts", "utf8");
const route = fs.readFileSync("web/src/app/api/automation/hubspot-decision-inbox/route.ts", "utf8");
const workflow = fs.readFileSync(".github/workflows/hubspot-decision-inbox.yml", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260805112425_hubspot_decision_inbox.sql", "utf8");
const listings = fs.readFileSync("web/src/app/ops/listings/actions.ts", "utf8");
const claims = fs.readFileSync("web/src/app/ops/claims/actions.ts", "utf8");
const contact = fs.readFileSync("web/src/app/ops/contact/actions.ts", "utf8");

assert.match(integration, /HUBSPOT_PRIVATE_APP_TOKEN/);
assert.match(integration, /HUBSPOT_DECISION_INBOX_ENABLED/);
assert.match(integration, /candidate_handoff_records"\)\.select\("id, qualification_reasons"/);
assert.doesNotMatch(integration, /candidate_data|requester_email|requester_name|claimant_email|proposed_changes|ABN/);
assert.match(route, /HUBSPOT_DECISION_INBOX_SYNC_TOKEN/);
assert.match(workflow, /HUBSPOT_DECISION_INBOX_SYNC_TOKEN/);
assert.match(workflow, /hubspot-decision-inbox/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /REVOKE ALL ON TABLE public\.hubspot_decision_inbox_items FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT ALL ON TABLE public\.hubspot_decision_inbox_items TO service_role/);
assert.match(listings, /decision === "publish" \|\| decision === "reject"/);
assert.match(claims, /action !== "needs_information"/);
assert.match(contact, /status === "resolved" \|\| status === "spam"/);

console.log("HubSpot Decision Inbox boundary checks passed.");
