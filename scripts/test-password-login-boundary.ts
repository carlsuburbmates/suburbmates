import assert from "node:assert/strict";
import fs from "node:fs";

const login = fs.readFileSync("web/src/app/(directory)/login/page.tsx", "utf8");
const reset = fs.readFileSync("web/src/app/(directory)/reset-password/page.tsx", "utf8");
const communications = fs.readFileSync("docs/REFERENCE/SuburbMates — Communications and Account-Access Specification.md", "utf8");

assert.match(login, /supabase\.auth\.signInWithPassword\(\{ email, password \}\)/);
assert.match(login, /resetPasswordForEmail\(email, \{ redirectTo \}\)/);
assert.match(login, /auth\/callback\?next=\/reset-password/);
assert.match(login, /shouldCreateUser: false/);
assert.match(reset, /auth\.updateUser\(\{ password \}\)/);
assert.match(reset, /password\.length < 12/);
assert.match(login, /minLength=\{12\}/);
assert.match(communications, /Email-and-password sign-in/);
assert.doesNotMatch(login, /signUp\(/);

console.log("Password login boundary checks passed.");
