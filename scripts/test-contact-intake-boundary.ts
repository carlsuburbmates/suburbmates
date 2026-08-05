import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("web/src/app/(directory)/contact/page.tsx", "utf8");
const form = fs.readFileSync("web/src/app/(directory)/contact/ContactForm.tsx", "utf8");
const actions = fs.readFileSync("web/src/app/(directory)/contact/actions.ts", "utf8");

assert.match(page, /ContactForm/);
assert.doesNotMatch(page, /cf-turnstile/);
assert.match(form, /TurnstileField siteKey=\{siteKey\} action="contact"/);
assert.match(form, /Send support request/);
assert.match(form, /Sending securely/);
assert.match(form, /min-w-0/);
assert.match(actions, /verifyTurnstileToken\(token, "contact"\)/);
assert.match(actions, /submit_contact_request/);
console.log("Contact intake boundary checks passed.");
