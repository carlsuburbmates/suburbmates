import assert from "node:assert/strict";
import fs from "node:fs";
import { strToU8, zipSync } from "fflate";
import {
  extractTaxPractitionersBoardResourceUrl,
  parseTaxPractitionersBoardWorkbook,
  selectDarebinTaxPractitionerCandidates,
} from "../web/src/lib/automation/tax-practitioners-board";

const cells = (values: string[]) => values.map((value, index) => `<x:c r="${String.fromCharCode(65 + index)}1" t="inlineStr"><x:is><x:t>${value}</x:t></x:is></x:c>`).join("");
const row = (number: number, values: string[]) => `<x:row r="${number}">${values.map((value, index) => `<x:c r="${String.fromCharCode(65 + index)}${number}" t="inlineStr"><x:is><x:t>${value}</x:t></x:is></x:c>`).join("")}</x:row>`;
const headers = ["(Do Not Modify) Practitioner", "Agent", "Trading Name (Agent) (Individual)", "Trading Name (Agent) (Organisation)", "City", "State", "Business Address", "Public Register Status"];
const sheet = `<?xml version="1.0"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData><x:row r="1">${cells(headers)}</x:row>${row(2, ["opaque-id", "Jane Personal", "Personal Tax", "Acme Tax Pty Ltd", "Northcote", "VIC", "1 High Street, Northcote VIC 3070", "Registered"])}${row(3, ["individual-id", "Sam Individual", "Sam Tax", "", "Northcote", "VIC", "2 High Street", "Registered"])}${row(4, ["postal-id", "Pat Personal", "", "Postal Tax", "Northcote", "VIC", "PO Box 2", "Registered"])}${row(5, ["old-id", "Casey Personal", "", "Old Tax", "Northcote", "VIC", "3 High Street", "Cancelled"])}${row(6, ["outside-id", "Lee Personal", "", "Outside Tax", "Elsewhere", "VIC", "4 High Street", "Registered"])} </x:sheetData></x:worksheet>`;
const workbook = zipSync({ "xl/worksheets/sheet2.xml": strToU8(sheet) });
const rows = parseTaxPractitionersBoardWorkbook(workbook);
assert.equal(rows.length, 5);
const candidates = selectDarebinTaxPractitionerCandidates(rows, "https://data.gov.au/data/dataset/tpb-register/resource/example/download/tpb-public-register-2026.xlsx", new Set(["northcote"]), "2026-08-31");
assert.deepEqual(candidates, [{
  sourceRecordKey: "tpb-org:acme-tax-pty-ltd:1-high-street-northcote-vic-3070",
  businessName: "Acme Tax Pty Ltd", categorySlug: "accountant", suburbSlug: "northcote", streetAddress: "1 High Street, Northcote VIC 3070",
  sourceUrl: "https://data.gov.au/data/dataset/tpb-register/resource/example/download/tpb-public-register-2026.xlsx", sourceCheckedOn: "2026-08-31",
  notes: "Filtered public-register organisation record limited to organisation trading name, business address and active registration status.",
}]);
assert.deepEqual(selectDarebinTaxPractitionerCandidates([
  {
    "Trading Name (Agent) (Organisation)": "Line Break Tax",
    City: "Northcote",
    State: "VIC",
    "Business Address": "1 High Street\nNorthcote VIC 3070",
    "Public Register Status": "Registered",
  },
], "https://data.gov.au/data/dataset/tpb-register/resource/example/download/tpb-public-register-2026.xlsx", new Set(["northcote"]), "2026-08-31")[0]?.streetAddress, "1 High Street Northcote VIC 3070");
assert.doesNotMatch(JSON.stringify(candidates), /Jane Personal|Personal Tax|opaque-id/);
assert.equal(extractTaxPractitionersBoardResourceUrl('<a href="https://data.gov.au/data/dataset/tpb-register/resource/example/download/tpb-public-register-2026.xlsx">file</a>'), "https://data.gov.au/data/dataset/tpb-register/resource/example/download/tpb-public-register-2026.xlsx");
assert.throws(() => extractTaxPractitionersBoardResourceUrl('<a href="https://example.com/tpb-public-register-2026.xlsx">file</a>'), /permitted XLSX/);
assert.throws(() => parseTaxPractitionersBoardWorkbook(zipSync({ "xl/worksheets/sheet1.xml": strToU8("<worksheet><sheetData/></worksheet>") })), /unexpected organisation-register header/);
const acquisition = fs.readFileSync("scripts/acquire-tax-practitioners-board.ts", "utf8");
const workflow = fs.readFileSync(".github/workflows/catalogue-tax-practitioners-board.yml", "utf8");
assert.match(acquisition, /SuburbMates-catalogue-evidence\/1\.0/);
assert.match(acquisition, /headers: SOURCE_REQUEST_HEADERS/g);
assert.match(workflow, /max-parallel: 1/);
assert.match(workflow, /shard_index: \[0, 1, 2, 3\]/);
assert.match(workflow, /--shard-index \$\{\{ matrix\.shard_index \}\} --shard-count 4/);
console.log("Tax Practitioners Board source acquisition checks passed.");
