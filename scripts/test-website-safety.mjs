import assert from "node:assert/strict";
import fs from "node:fs";
import { collectWebsitePages, isPublicAddress, parseHttpsUrl } from "./website-safety.mjs";

assert.equal(parseHttpsUrl("https://example.com/path").hostname, "example.com");
assert.throws(() => parseHttpsUrl("http://example.com"));
assert.throws(() => parseHttpsUrl("https://user@example.com"));
for (const address of ["127.0.0.1", "10.0.0.1", "169.254.1.1", "192.168.1.1", "::1", "fc00::1", "fe80::1"]) assert.equal(isPublicAddress(address), false);
for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) assert.equal(isPublicAddress(address), true);
const calls = [];
const websites = Array.from({ length: 1601 }, (_, index) => ({ id: index + 1 }));
assert.equal((await collectWebsitePages(async (from, to) => {
  calls.push([from, to]);
  return { data: websites.slice(from, to + 1), count: websites.length };
})).length, 1601);
assert.deepEqual(calls, [[0, 999], [1000, 1999]]);
await assert.rejects(
  collectWebsitePages(async (from) => ({ data: from === 0 ? websites.slice(0, 1000) : [], count: websites.length })),
  /ended early/,
);
const workflow = fs.readFileSync(".github/workflows/website-safety.yml", "utf8");
assert.match(workflow, /workflow_dispatch: \{\}/);
assert.match(workflow, /Record evidence summary/);
assert.doesNotMatch(workflow, /Fail when review is needed/);
assert.doesNotMatch(workflow, /website check\(s\) need review/);
assert.doesNotMatch(workflow, /issues: write/);
console.log("Website safety policy tests passed.");
