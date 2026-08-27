import assert from "node:assert/strict";
import { strToU8, zipSync } from "fflate";
import {
  extractVictorianLiquorResourceUrl,
  parseVictorianLiquorWorkbook,
  selectDarebinLiquorCandidates,
} from "../web/src/lib/automation/victorian-liquor-licences";

const sheet = `<?xml version="1.0"?><worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Licence Num</t></is></c><c r="B1" t="inlineStr"><is><t>Trading As</t></is></c><c r="C1" t="inlineStr"><is><t>Category</t></is></c><c r="D1" t="inlineStr"><is><t>Address</t></is></c><c r="E1" t="inlineStr"><is><t>Suburb</t></is></c><c r="F1" t="inlineStr"><is><t>Council</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>123</t></is></c><c r="B2" t="inlineStr"><is><t>Local &amp; Co</t></is></c><c r="C2" t="inlineStr"><is><t>Restaurant and cafe licence</t></is></c><c r="D2" t="inlineStr"><is><t>1 High St</t></is></c><c r="E2" t="inlineStr"><is><t>Northcote</t></is></c><c r="F2" t="inlineStr"><is><t>DAREBIN CITY COUNCIL</t></is></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>456</t></is></c><c r="B3" t="inlineStr"><is><t>Outside</t></is></c><c r="C3" t="inlineStr"><is><t>General licence</t></is></c><c r="E3" t="inlineStr"><is><t>Elsewhere</t></is></c><c r="F3" t="inlineStr"><is><t>OTHER COUNCIL</t></is></c></row></sheetData></worksheet>`;
const workbook = zipSync({ "xl/worksheets/sheet1.xml": strToU8(sheet) });
const rows = parseVictorianLiquorWorkbook(workbook);
assert.equal(rows.length, 2);
assert.equal(rows[0]["Trading As"], "Local & Co");
const candidates = selectDarebinLiquorCandidates(rows, "https://www.vic.gov.au/sites/default/files/example.xlsx", new Set(["northcote"]), "2026-08-28");
assert.deepEqual(candidates, [{
  sourceRecordKey: "123", businessName: "Local & Co", categorySlug: "cafe", suburbSlug: "northcote", streetAddress: "1 High St",
  sourceUrl: "https://www.vic.gov.au/sites/default/files/example.xlsx", sourceCheckedOn: "2026-08-28",
  notes: "Victorian liquor licence: Restaurant and cafe licence. Trading hours retained as private field evidence only until an owner or approved public-hours policy confirms display.",
}]);
assert.equal(extractVictorianLiquorResourceUrl('<a href="https://www.vic.gov.au/sites/default/files/Current.xlsx">file</a>'), "https://www.vic.gov.au/sites/default/files/Current.xlsx");
assert.throws(() => extractVictorianLiquorResourceUrl('<a href="https://example.com/file.xlsx">file</a>'), /permitted XLSX/);
assert.throws(() => parseVictorianLiquorWorkbook(zipSync({ "xl/worksheets/sheet1.xml": strToU8("<worksheet><sheetData/></worksheet>") })), /unexpected header/);
console.log("Victorian liquor source acquisition checks passed.");
