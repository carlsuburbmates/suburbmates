import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { escapeCsv } from "./acquire-openstreetmap";
import {
  extractTaxPractitionersBoardResourceUrl,
  parseTaxPractitionersBoardWorkbook,
  selectDarebinTaxPractitionerCandidates,
  TPB_RESOURCE_PAGE_URL,
} from "../web/src/lib/automation/tax-practitioners-board";
import { getTodayAest } from "../web/src/lib/automation/victorian-liquor-licences";

const MAX_RESOURCE_BYTES = 40 * 1024 * 1024;
const SOURCE_REQUEST_HEADERS = {
  accept: "text/html,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;q=0.9,*/*;q=0.5",
  "user-agent": "SuburbMates-catalogue-evidence/1.0 (+https://suburbmates.com.au)",
};

export async function acquireTaxPractitionersBoard(fetchImpl: typeof fetch = fetch) {
  const resourcePage = await fetchImpl(TPB_RESOURCE_PAGE_URL, { signal: AbortSignal.timeout(20_000), headers: SOURCE_REQUEST_HEADERS });
  if (!resourcePage.ok) throw new Error(`Tax Practitioners Board resource page returned ${resourcePage.status}.`);
  const resourceUrl = extractTaxPractitionersBoardResourceUrl(await resourcePage.text());
  const workbookResponse = await fetchImpl(resourceUrl, { signal: AbortSignal.timeout(30_000), headers: SOURCE_REQUEST_HEADERS });
  if (!workbookResponse.ok) throw new Error(`Tax Practitioners Board workbook returned ${workbookResponse.status}.`);
  const length = Number(workbookResponse.headers.get("content-length") ?? 0);
  if (length > MAX_RESOURCE_BYTES) throw new Error("Tax Practitioners Board workbook exceeds the safe acquisition size limit.");
  const workbook = new Uint8Array(await workbookResponse.arrayBuffer());
  if (workbook.byteLength > MAX_RESOURCE_BYTES || workbook[0] !== 0x50 || workbook[1] !== 0x4b) {
    throw new Error("Tax Practitioners Board workbook is not a permitted XLSX archive.");
  }

  const catchments = new Set<string>(JSON.parse(readFileSync(path.resolve(process.cwd(), "data/darebin-catchment.json"), "utf8")));
  const candidates = selectDarebinTaxPractitionerCandidates(
    parseTaxPractitionersBoardWorkbook(workbook), resourceUrl, catchments, getTodayAest(),
  );
  const destination = process.env.TPB_OUTPUT_PATH
    ? path.resolve(process.env.TPB_OUTPUT_PATH)
    : path.resolve(process.cwd(), "data/vendor-candidates-tax-practitioners-board.csv");
  const header = "business_name,address,category_slug,suburb_slug,contact_email,phone,website,trading_hours,source_record_key,source_url,source_checked_on,verification_status,notes";
  const rows = candidates.map((candidate) => [
    candidate.businessName, candidate.streetAddress, candidate.categorySlug, candidate.suburbSlug, "", "", "", "", candidate.sourceRecordKey,
    candidate.sourceUrl, candidate.sourceCheckedOn, "pending_review", candidate.notes,
  ].map(escapeCsv).join(","));
  writeFileSync(destination, [header, ...rows].join("\n"), "utf8");
  console.log(`Wrote ${candidates.length} organisation-only Tax Practitioners Board candidates to ${destination}.`);
}

if (process.argv[1]?.endsWith("acquire-tax-practitioners-board.ts")) {
  acquireTaxPractitionersBoard().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
