import assert from "node:assert/strict";
import {
  extractAsicCreditLicenseeResourceUrl,
  selectDarebinAsicCreditLicenseeCandidates,
} from "./acquire-asic-credit-licensees";

const sourceUrl = "https://data.gov.au/data/dataset/fa0b0d71-b8b8-4af8-bc59-0b000ce0d5e4/resource/example/download/credit_lic_202608.csv";
const rows = [
  { CRED_LIC_NUM: "123", CRED_LIC_NAME: "Acme Credit Pty Ltd", CRED_LIC_BN: "Acme Lending", CRED_LIC_STATUS: "APPR", CRED_LIC_STATE: "VIC", CRED_LIC_LOCALITY: "Northcote", CRED_LIC_ABN_ACN: "private-id" },
  { CRED_LIC_NUM: "124", CRED_LIC_NAME: "Jane Personal", CRED_LIC_BN: "Jane Lending", CRED_LIC_STATUS: "APPR", CRED_LIC_STATE: "VIC", CRED_LIC_LOCALITY: "Northcote" },
  { CRED_LIC_NUM: "125", CRED_LIC_NAME: "Old Finance Pty Ltd", CRED_LIC_STATUS: "CEAS", CRED_LIC_STATE: "VIC", CRED_LIC_LOCALITY: "Northcote" },
  { CRED_LIC_NUM: "126", CRED_LIC_NAME: "Outside Finance Pty Ltd", CRED_LIC_STATUS: "APPR", CRED_LIC_STATE: "VIC", CRED_LIC_LOCALITY: "Elsewhere" },
  { CRED_LIC_NUM: "127", CRED_LIC_NAME: "Interstate Finance Pty Ltd", CRED_LIC_STATUS: "APPR", CRED_LIC_STATE: "NSW", CRED_LIC_LOCALITY: "Northcote" },
];

const candidates = selectDarebinAsicCreditLicenseeCandidates(rows, sourceUrl, new Set(["northcote"]), "2026-09-01");
assert.equal(candidates.length, 1);
assert.equal(candidates[0]?.businessName, "Acme Lending");
assert.equal(candidates[0]?.categorySlug, "financial");
assert.equal(candidates[0]?.suburbSlug, "northcote");
assert.match(candidates[0]?.sourceRecordKey ?? "", /^asic-credit:[a-f0-9]{64}$/);
assert.doesNotMatch(JSON.stringify(candidates), /123|private-id|Jane Personal/);
assert.equal(extractAsicCreditLicenseeResourceUrl({ result: { license_id: "cc-by", resources: [{ format: "CSV", name: "Credit Licence Dataset - Current", url: sourceUrl }] } }), sourceUrl);
assert.throws(() => extractAsicCreditLicenseeResourceUrl({ result: { license_id: "other-closed", resources: [] } }), /CC BY/);
assert.throws(() => extractAsicCreditLicenseeResourceUrl({ result: { license_id: "cc-by", resources: [{ format: "CSV", name: "Credit Licence Dataset - Current", url: "https://example.com/credit_lic_202608.csv" }] } }), /permitted current CSV/);
console.log("ASIC Credit Licensee source acquisition checks passed.");
