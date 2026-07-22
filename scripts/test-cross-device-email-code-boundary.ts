import assert from "node:assert/strict";
import fs from "node:fs";

const login = fs.readFileSync("web/src/app/(directory)/login/page.tsx", "utf8");
const communications = fs.readFileSync("docs/REFERENCE/SuburbMates — Communications and Account-Access Specification.md", "utf8");

assert.match(login, /supabase\.auth\.signInWithOtp\(\{\s*email,/);
assert.match(login, /supabase\.auth\.verifyOtp\(\{ email, token, type: "email" \}\)/);
assert.match(login, /data\.session/);
assert.match(login, /requestAnimationFrame/);
assert.match(login, /autoComplete="one-time-code"/);
assert.match(login, /safeNext\(/);
assert.match(login, /startsWith\("\/"\) && !value\.startsWith\("\/\/"\)/);
assert.doesNotMatch(login, /emailRedirectTo/);
assert.match(communications, /Email-code sign-in/);

console.log("Cross-device email-code boundary checks passed.");
