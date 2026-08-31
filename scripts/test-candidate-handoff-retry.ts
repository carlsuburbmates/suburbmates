import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const script = readFileSync("scripts/submit-candidate-handoff.ts", "utf8");

assert.match(script, /MAX_ATTEMPTS = 20/);
assert.match(script, /PROCESSING_RECEIPT_DELAY_MS = 65_000/);
assert.match(script, /RESOURCE_RECOVERY_DELAY_MS = 120_000/);
assert.match(script, /worker exceeded resource limits/i);
assert.match(script, /Worker resource recovery window/);
assert.match(script, /retryDelayForNetworkFailure/);
assert.match(script, /resourceRecoveryDelay/);
assert.match(script, /response\.status === 202\n      \? PROCESSING_RECEIPT_DELAY_MS/);

console.log("Candidate handoff retry recovery checks passed.");
