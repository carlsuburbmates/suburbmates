import assert from "node:assert/strict";
import { isValidAbn, normalizeAbn, parseAbnResponse, providerFailure } from "../web/src/lib/automation/abn-policy";

assert.equal(normalizeAbn("34 241 177 887"), "34241177887");
assert.equal(isValidAbn("34241177887"), true);
assert.equal(isValidAbn("34241177888"), false);
assert.equal(isValidAbn("not-an-abn"), false);

const checkedAt = "2026-07-22T00:00:00.000Z";
assert.deepEqual(parseAbnResponse("<root><entityStatusCode>Active</entityStatusCode><organisationName>Example &amp; Co</organisationName></root>", checkedAt), {
  abnStatus: "active", entityStatus: "Active", officialNames: ["Example & Co"], checkedAt, errorMessage: null,
});
assert.deepEqual(parseAbnResponse("<root><entityStatusCode>Active</entityStatusCode><mainName>Example Holdings</mainName><businessName>Example Services</businessName></root>", checkedAt).officialNames, ["Example Holdings", "Example Services"]);
assert.equal(parseAbnResponse("<root><entityStatusCode>Cancelled</entityStatusCode></root>", checkedAt).abnStatus, "inactive");
assert.equal(parseAbnResponse("<root><exceptionCode>SEARCH</exceptionCode><exceptionDescription>No records found</exceptionDescription></root>", checkedAt).abnStatus, "not_found");
assert.equal(providerFailure(checkedAt).abnStatus, "provider_failure");

console.log("ABN validation checks passed.");
