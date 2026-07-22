import assert from "node:assert/strict";
import fs from "node:fs";

const route = fs.readFileSync("web/src/app/api/automation/candidates/route.ts", "utf8");
const workflow = fs.readFileSync(".github/workflows/catalogue-discovery.yml", "utf8");

assert.match(route, /AUTOMATION_INGEST_TOKEN/);
assert.match(route, /MAX_CANDIDATES = 100/);
assert.match(route, /source !== allowedSource/);
assert.match(route, /hostname !== "www\.openstreetmap\.org"/);
assert.match(route, /qualification_outcome: qualification\.outcome/);
assert.match(route, /listing_status: "published"/);
assert.match(route, /ownership_status: "unclaimed"/);
assert.match(route, /candidate_handoff_exception_created/);
assert.doesNotMatch(route, /stripe/i);
assert.match(workflow, /candidate:handoff/);
assert.match(workflow, /AUTOMATION_INGEST_TOKEN/);

console.log("Candidate automation ingestion boundary checks passed.");
