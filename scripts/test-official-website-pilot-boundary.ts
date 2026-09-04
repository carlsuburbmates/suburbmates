import assert from "node:assert/strict";
import fs from "node:fs";

const script = fs.readFileSync("scripts/inspect-official-website-pilot.ts", "utf8");

assert.match(script, /\.from\("published_vendors"\)/);
assert.match(script, /\.eq\("is_claimed", false\)/);
assert.match(script, /selectBroadSample/);
assert.match(script, /inspectOfficialWebsite/);
assert.match(script, /No result was stored, applied, published, or used to change a listing/);
assert.match(script, /Terms\/reuse review remains pending/);
assert.doesNotMatch(script, /\.insert\(/);
assert.doesNotMatch(script, /\.update\(/);
assert.doesNotMatch(script, /\.upsert\(/);

console.log("Official website pilot inspection remains read-only and terms-gated.");
