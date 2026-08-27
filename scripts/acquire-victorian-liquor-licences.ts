import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { escapeCsv } from "./acquire-openstreetmap";
import {
  extractVictorianLiquorResourceUrl,
  getTodayAest,
  parseVictorianLiquorWorkbook,
  selectDarebinLiquorCandidates,
  VICTORIAN_LIQUOR_DATASET_URL,
} from "../web/src/lib/automation/victorian-liquor-licences";

const MAX_RESOURCE_BYTES = 80 * 1024 * 1024;

export async function acquireVictorianLiquorLicences(fetchImpl: typeof fetch = fetch) {
  const datasetResponse = await fetchImpl(VICTORIAN_LIQUOR_DATASET_URL, { signal: AbortSignal.timeout(20_000) });
  if (!datasetResponse.ok) throw new Error(`Victorian liquor dataset page returned ${datasetResponse.status}.`);
  const resourceUrl = extractVictorianLiquorResourceUrl(await datasetResponse.text());
  const workbookResponse = await fetchImpl(resourceUrl, { signal: AbortSignal.timeout(20_000) });
  if (!workbookResponse.ok) throw new Error(`Victorian liquor workbook returned ${workbookResponse.status}.`);
  const length = Number(workbookResponse.headers.get("content-length") ?? 0);
  if (length > MAX_RESOURCE_BYTES) throw new Error("Victorian liquor workbook exceeds the safe acquisition size limit.");
  const workbook = new Uint8Array(await workbookResponse.arrayBuffer());
  if (workbook.byteLength > MAX_RESOURCE_BYTES || workbook[0] !== 0x50 || workbook[1] !== 0x4b) {
    throw new Error("Victorian liquor workbook is not a permitted XLSX archive.");
  }

  const catchments = new Set<string>(JSON.parse(readFileSync(path.resolve(process.cwd(), "data/darebin-catchment.json"), "utf8")));
  const candidates = selectDarebinLiquorCandidates(parseVictorianLiquorWorkbook(workbook), resourceUrl, catchments, getTodayAest());
  const destination = process.env.VICTORIAN_LIQUOR_OUTPUT_PATH
    ? path.resolve(process.env.VICTORIAN_LIQUOR_OUTPUT_PATH)
    : path.resolve(process.cwd(), "data/vendor-candidates-victorian-liquor-licences.csv");
  const header = "business_name,address,category_slug,suburb_slug,contact_email,phone,website,trading_hours,source_record_key,source_url,source_checked_on,verification_status,notes";
  const rows = candidates.map((candidate) => [
    candidate.businessName, candidate.streetAddress ?? "", candidate.categorySlug, candidate.suburbSlug, "", "", "", candidate.tradingHours ?? "", candidate.sourceRecordKey,
    candidate.sourceUrl, candidate.sourceCheckedOn, "pending_review", candidate.notes,
  ].map(escapeCsv).join(","));
  writeFileSync(destination, [header, ...rows].join("\n"), "utf8");
  console.log(`Wrote ${candidates.length} licensed Victorian liquor candidates to ${destination}.`);
}

if (process.argv[1]?.endsWith("acquire-victorian-liquor-licences.ts")) {
  acquireVictorianLiquorLicences().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
