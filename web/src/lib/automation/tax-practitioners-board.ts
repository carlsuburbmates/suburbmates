import { strFromU8, unzipSync } from "fflate";

export const TPB_RESOURCE_PAGE_URL = "https://www.data.gov.au/data/dataset/tpb-register/resource/6d698ad4-bdea-4e8e-99f3-fe17d66f8ff5";

const RESOURCE_HOSTS = new Set(["www.data.gov.au", "data.gov.au"]);
const MAX_WORKSHEET_BYTES = 128 * 1024 * 1024;

export type TaxPractitionersBoardCandidate = {
  sourceRecordKey: string;
  businessName: string;
  categorySlug: "accountant";
  suburbSlug: string;
  streetAddress: string;
  sourceUrl: string;
  sourceCheckedOn: string;
  notes: string;
};

type SpreadsheetRow = Record<string, string>;

export function extractTaxPractitionersBoardResourceUrl(datasetHtml: string): string {
  const matches = datasetHtml.matchAll(/https?:[^\s"'<>]+\.xlsx(?:\?[^\s"'<>]*)?/gi);
  for (const match of matches) {
    const value = decodeXml(match[0]);
    try {
      const url = new URL(value);
      if (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        RESOURCE_HOSTS.has(url.hostname.toLowerCase()) &&
        /\/download\/tpb-public-register-[^/]+\.xlsx$/i.test(url.pathname)
      ) return url.toString();
    } catch {
      // Keep looking for the current first-party workbook link.
    }
  }
  throw new Error("The Tax Practitioners Board resource page did not expose a permitted XLSX workbook.");
}

export function parseTaxPractitionersBoardWorkbook(workbook: Uint8Array): SpreadsheetRow[] {
  const files = unzipSync(workbook);
  const worksheets = Object.entries(files)
    .filter(([name, contents]) => /^xl\/worksheets\/[^/]+\.xml$/i.test(name) && contents.byteLength <= MAX_WORKSHEET_BYTES)
    .map(([, contents]) => parseWorksheetRows(strFromU8(contents)));

  for (const rows of worksheets) {
    const headerIndex = rows.findIndex((row) => row.includes("Trading Name (Agent) (Organisation)") && row.includes("Business Address"));
    const headers = rows[headerIndex];
    if (!headers) continue;
    return rows.slice(headerIndex + 1)
      .filter((row) => row.some((value) => value))
      .map((row) => Object.fromEntries(headers.flatMap((header, index) => header ? [[header, row[index] ?? ""]] : [])));
  }

  throw new Error("The Tax Practitioners Board workbook has an unexpected organisation-register header.");
}

export function selectDarebinTaxPractitionerCandidates(
  rows: readonly SpreadsheetRow[],
  sourceUrl: string,
  allowedSuburbs: ReadonlySet<string>,
  sourceCheckedOn: string,
): TaxPractitionersBoardCandidate[] {
  return rows.flatMap((row) => {
    const businessName = text(row["Trading Name (Agent) (Organisation)"]);
    const streetAddress = text(row["Business Address"]);
    const suburbSlug = slugify(row.City);
    if (
      !businessName ||
      !streetAddress ||
      isPostalAddress(streetAddress) ||
      normalise(row.State) !== "VIC" ||
      normalise(row["Public Register Status"]) !== "REGISTERED" ||
      !suburbSlug ||
      !allowedSuburbs.has(suburbSlug)
    ) return [];

    return [{
      sourceRecordKey: `tpb-org:${slugify(businessName)}:${slugify(streetAddress)}`,
      businessName,
      categorySlug: "accountant",
      suburbSlug,
      streetAddress,
      sourceUrl,
      sourceCheckedOn,
      notes: "Filtered public-register organisation record limited to organisation trading name, business address and active registration status.",
    }];
  });
}

function parseWorksheetRows(xml: string): string[][] {
  const output: string[][] = [];
  for (const rowMatch of xml.matchAll(/<(?:[\w.-]+:)?row\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<(?:[\w.-]+:)?c\b([^>]*)>([\s\S]*?)<\/(?:[\w.-]+:)?c>/g)) {
      const reference = cellMatch[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!reference) continue;
      const column = columnIndex(reference);
      row[column] = [...cellMatch[2].matchAll(/<(?:[\w.-]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[\w.-]+:)?t>/g)]
        .map((part) => decodeXml(part[1]))
        .join("");
    }
    output.push(row);
  }
  return output;
}

function columnIndex(reference: string): number {
  return [...reference].reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function isPostalAddress(value: string) {
  return /\b(?:p\.?\s*o\.?\s*box|gpo\s*box|locked\s*bag)\b/i.test(value);
}

function text(value: string | undefined) { return value?.trim() ?? ""; }
function normalise(value: string | undefined) { return text(value).replace(/\s+/g, " ").toUpperCase(); }
function slugify(value: string | undefined) { return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function decodeXml(value: string) { return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); }
