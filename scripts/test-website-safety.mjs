import assert from "node:assert/strict";
import { isPublicAddress, parseHttpsUrl } from "./website-safety.mjs";

assert.equal(parseHttpsUrl("https://example.com/path").hostname, "example.com");
assert.throws(() => parseHttpsUrl("http://example.com"));
assert.throws(() => parseHttpsUrl("https://user@example.com"));
for (const address of ["127.0.0.1", "10.0.0.1", "169.254.1.1", "192.168.1.1", "::1", "fc00::1", "fe80::1"]) assert.equal(isPublicAddress(address), false);
for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(address), true);
console.log("Website safety policy tests passed.");
