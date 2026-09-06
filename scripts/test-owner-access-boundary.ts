import assert from "node:assert/strict";
import fs from "node:fs";

const action = fs.readFileSync("web/src/app/(directory)/claim/access/actions.ts", "utf8");
const form = fs.readFileSync("web/src/app/(directory)/claim/access/OwnerAccessForm.tsx", "utf8");
const page = fs.readFileSync("web/src/app/(directory)/claim/access/page.tsx", "utf8");
const claim = fs.readFileSync("web/src/app/(directory)/claim/page.tsx", "utf8");

assert.match(action, /verifyTurnstileToken\(token, "owner_access"\)/);
assert.match(action, /signInWithOtp\(\{ email, options: \{ shouldCreateUser: true \} \}\)/);
assert.doesNotMatch(action, /createAdminClient|owner_id|is_claimed|ownership_status|is_published/);
assert.match(form, /verifyOtp\(\{ email: state\.email, token, type: "email" \}\)/);
assert.match(form, /Ownership still requires a reviewed claim/);
assert.match(page, /Account access never grants ownership by itself/);
assert.match(claim, /Create owner access/);
assert.doesNotMatch(action, /\.from\(|\.rpc\(|\.update\(|\.insert\(|\.upsert\(/);

console.log("Public owner access remains Turnstile-protected authentication only; claims and ownership stay reviewed.");
