import assert from "node:assert/strict";
import fs from "node:fs";
const workflow = fs.readFileSync(".github/workflows/licensed-category-context-images.yml", "utf8");
assert.match(workflow, /schedule:/);
assert.match(workflow, /workflow_dispatch:/);
assert.match(workflow, /AUTOMATION_INGEST_TOKEN/);
assert.match(workflow, /category-context-images/);
assert.doesNotMatch(workflow, /PEXELS_API_KEY/);
console.log("Licensed category-context refresh is bounded, scheduled and keeps provider credentials in the Worker.");
