import assert from "node:assert/strict";
import fs from "node:fs";

const workflow = fs.readFileSync(".github/workflows/operations-health.yml", "utf8");
const reconciler = fs.readFileSync("scripts/reconcile-operations-health.mjs", "utf8");
const hubspot = fs.readFileSync(".github/workflows/hubspot-decision-inbox.yml", "utf8");

assert.match(workflow, /workflow_run:/);
assert.match(workflow, /schedule:/);
assert.match(workflow, /actions: read/);
assert.match(workflow, /issues: write/);
assert.match(workflow, /node scripts\/reconcile-operations-health\.mjs/);
assert.match(reconciler, /runs\?status=completed&per_page=1/);
assert.doesNotMatch(reconciler, /event=schedule/);
assert.match(reconciler, /run\.conclusion !== "success"/);
assert.match(reconciler, /ageHours > expected\.maximumAgeHours/);
assert.match(reconciler, /state: "closed"/);
assert.match(reconciler, /Public and owner data were not changed/);
assert.match(reconciler, /Re-run failed jobs/);
assert.match(hubspot, /cron: "7 \* \* \* \*"/);
assert.doesNotMatch(hubspot, /\*\/15/);

console.log("Operations health reconciliation is consolidated, actionable, and recovery-aware.");
