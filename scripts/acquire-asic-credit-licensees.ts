import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { escapeCsv } from "./acquire-openstreetmap";
import { getTodayAest } from "../web/src/lib/automation/victorian-liquor-licences";

export const ASIC_CREDIT_LICENSEE_DATASET_URL = "https://www.data.gov.au/data/dataset/asic-credit-licensee";
const DATA_API_URL = "https://data.gov.au/data/api/3/action/package_show?id=asic-credit-licensee";
const RESOURCE_HOSTS = new Set(["data.gov.au", "www.data.gov.au"]);
const MAX_RESOURCE_BYTES = 16 * 1024 * 1024;
const ORGANISATION_MARKER = /(?:\bPTY\.?\s*LTD\b|\bLIMITED\b|\bLTD\b|\bINCORPORATED\b|\bINC\b|\bASSOCIATION\b|\bCO-?OPERATIVE\b|\bBANK\b|\bCREDIT\s+UNION\b)/i;

type DataGovResource = { format?: unknown; name?: unknown; url?: unknown };
type AsicCreditLicenseeRow = Record<string, string>;

export type AsicCreditLicenseeCandidate = {
  sourceRecordKey: string;
  businessName: string;
  categorySlug: "financial";
  suburbSlug: string;
  sourceUrl: string;
  sourceCheckedOn: string;
  notes: string;
};

export function extractAsicCreditLicenseeResourceUrl(payload: unknown): string {
  if (!payload || typeof payload !== "object") throw new Error("ASIC credit licensee metadata was invalid.");
  const result = (payload as { result?: unknown }).result;
  if (!result || typeof result !== "object") throw new Error("ASIC credit licensee metadata did not include a dataset.");
  const dataset = result as { license_id?: unknown; resources?: unknown };
  if (dataset.license_id !== "cc-by" || !Array.isArray(dataset.resources)) {
    throw new Error("ASIC credit licensee metadata did not confirm the CC BY source contract.");
  }
  for (const candidate of dataset.resources as DataGovResource[]) {
    if (candidate.format !== "CSV" || candidate.name !== "Credit Licence Dataset - Current" || typeof candidate.url !== "string") continue;
    try {
      const url = new URL(candidate.url);
      if (url.protocol === "https:" && RESOURCE_HOSTS.has(url.hostname.toLowerCase()) && /\/credit_lic_\d{6}\.csv$/i.test(url.pathname)) {
        return url.toString();
      }
    } catch {
      // Continue looking for the current first-party CSV resource.
    }
  }
  throw new Error("ASIC credit licensee metadata did not expose a permitted current CSV resource.");
}

export function selectDarebinAsicCreditLicenseeCandidates(
  rows: readonly AsicCreditLicenseeRow[],
  sourceUrl: string,
  allowedSuburbs: ReadonlySet<string>,
  sourceCheckedOn: string,
): AsicCreditLicenseeCandidate[] {
  return rows.flatMap((row) => {
    const licenceNumber = text(row.CRED_LIC_NUM);
    const legalName = text(row.CRED_LIC_NAME);
    const businessName = text(row.CRED_LIC_BN) || legalName;
    const suburbSlug = slugify(row.CRED_LIC_LOCALITY);
    if (
      text(row.CRED_LIC_STATUS).toUpperCase() !== "APPR" ||
      text(row.CRED_LIC_STATE).toUpperCase() !== "VIC" ||
      !licenceNumber ||
      !legalName ||
      !ORGANISATION_MARKER.test(legalName) ||
      !businessName ||
      !suburbSlug ||
      !allowedSuburbs.has(suburbSlug)
    ) return [];

    return [{
      sourceRecordKey: `asic-credit:${createHash("sha256").update(licenceNumber).digest("hex")}`,
      businessName,
      categorySlug: "financial",
      suburbSlug,
      sourceUrl,
      sourceCheckedOn,
      notes: "Filtered ASIC Credit Licensee organisation record limited to an active corporate or institutional business name and principal Darebin locality.",
    }];
  });
}

export async function acquireAsicCreditLicensees(fetchImpl: typeof fetch = fetch) {
  const metadataResponse = await fetchImpl(DATA_API_URL, { signal: AbortSignal.timeout(20_000) });
  if (!metadataResponse.ok) throw new Error(`ASIC credit licensee metadata returned ${metadataResponse.status}.`);
  const sourceUrl = extractAsicCreditLicenseeResourceUrl(await metadataResponse.json());
  const resourceResponse = await fetchImpl(sourceUrl, { signal: AbortSignal.timeout(30_000) });
  if (!resourceResponse.ok) throw new Error(`ASIC credit licensee CSV returned ${resourceResponse.status}.`);
  const length = Number(resourceResponse.headers.get("content-length") ?? 0);
  if (length > MAX_RESOURCE_BYTES) throw new Error("ASIC credit licensee CSV exceeds the safe acquisition size limit.");
  const resource = await resourceResponse.text();
  if (resource.length > MAX_RESOURCE_BYTES) throw new Error("ASIC credit licensee CSV exceeds the safe acquisition size limit.");
  const rows = parse(resource, { columns: true, skip_empty_lines: true, relax_quotes: true }) as AsicCreditLicenseeRow[];
  const catchments = new Set<string>(JSON.parse(readFileSync(path.resolve(process.cwd(), "data/darebin-catchment.json"), "utf8")));
  const candidates = selectDarebinAsicCreditLicenseeCandidates(rows, sourceUrl, catchments, getTodayAest());
  const destination = process.env.ASIC_CREDIT_LICENSEE_OUTPUT_PATH
    ? path.resolve(process.env.ASIC_CREDIT_LICENSEE_OUTPUT_PATH)
    : path.resolve(process.cwd(), "data/vendor-candidates-asic-credit-licensees.csv");
  const header = "business_name,address,category_slug,suburb_slug,contact_email,phone,website,trading_hours,source_record_key,source_url,source_checked_on,verification_status,notes";
  const outputRows = candidates.map((candidate) => [
    candidate.businessName, "", candidate.categorySlug, candidate.suburbSlug, "", "", "", "", candidate.sourceRecordKey,
    candidate.sourceUrl, candidate.sourceCheckedOn, "pending_review", candidate.notes,
  ].map(escapeCsv).join(","));
  writeFileSync(destination, [header, ...outputRows].join("\n"), "utf8");
  console.log(`Wrote ${candidates.length} organisation-only ASIC Credit Licensee candidates to ${destination}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  acquireAsicCreditLicensees().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

function text(value: string | undefined) { return value?.replace(/\s+/g, " ").trim() ?? ""; }
function slugify(value: string | undefined) { return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
