import { strFromU8, unzipSync } from "fflate";

export const VICTORIAN_LIQUOR_DATASET_URL = "https://discover.data.vic.gov.au/dataset/victorian-liquor-licences-by-location";

const RESOURCE_HOST = "www.vic.gov.au";
const RESOURCE_PATH_PREFIX = "/sites/default/files/";
const DAREBIN_COUNCIL = "DAREBIN CITY COUNCIL";

export type VictorianLiquorCandidate = {
  sourceRecordKey: string;
  businessName: string;
  categorySlug: string;
  suburbSlug: string;
  streetAddress?: string;
  tradingHours?: string;
  sourceUrl: string;
  sourceCheckedOn: string;
  notes: string;
};

type SpreadsheetRow = Record<string, string>;

export function extractVictorianLiquorResourceUrl(datasetHtml: string): string {
  const matches = datasetHtml.matchAll(/https?:[^\s"'<>]+\.xlsx(?:\?[^\s"'<>]*)?/gi);
  for (const match of matches) {
    const value = decodeXml(match[0]);
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && url.hostname === RESOURCE_HOST && url.pathname.startsWith(RESOURCE_PATH_PREFIX)) {
        return url.toString();
      }
    } catch {
      // Keep looking for a valid, first-party resource link.
    }
  }
  throw new Error("The Victorian liquor dataset page did not expose a permitted XLSX resource.");
}

export function parseVictorianLiquorWorkbook(workbook: Uint8Array): SpreadsheetRow[] {
  const files = unzipSync(workbook);
  const sheet = files["xl/worksheets/sheet1.xml"];
  if (!sheet) throw new Error("The Victorian liquor workbook is missing its first worksheet.");

  const rows = parseWorksheetRows(strFromU8(sheet));
  const headerIndex = rows.findIndex((row) => row.includes("Licence Num") && row.includes("Trading As") && row.includes("Council"));
  const headers = rows[headerIndex];
  if (!headers) {
    throw new Error("The Victorian liquor workbook has an unexpected header row.");
  }

  return rows.slice(headerIndex + 1)
    .filter((row) => row.some((value) => value))
    .map((row) => Object.fromEntries(headers.flatMap((header, index) => header ? [[header, row[index] ?? ""]] : [])));
}

export function selectDarebinLiquorCandidates(
  rows: readonly SpreadsheetRow[],
  sourceUrl: string,
  allowedSuburbs: ReadonlySet<string>,
  sourceCheckedOn: string,
): VictorianLiquorCandidate[] {
  return rows.flatMap((row) => {
    if (normalise(row.Council) !== DAREBIN_COUNCIL) return [];
    const sourceRecordKey = text(row["Licence Num"]);
    const businessName = text(row["Trading As"]);
    const suburbSlug = slugify(row.Suburb);
    const categorySlug = categoryForLicence(row.Category);
    if (!sourceRecordKey || !businessName || !suburbSlug || !allowedSuburbs.has(suburbSlug) || !categorySlug) return [];

    return [{
      sourceRecordKey,
      businessName,
      categorySlug,
      suburbSlug,
      ...(text(row.Address) ? { streetAddress: text(row.Address) } : {}),
      ...(text(row["Trading Hours"]) ? { tradingHours: text(row["Trading Hours"]) } : {}),
      sourceUrl,
      sourceCheckedOn,
      notes: `Victorian liquor licence: ${text(row.Category) || "unspecified category"}. Trading hours retained as private field evidence only until an owner or approved public-hours policy confirms display.`,
    }];
  });
}

export function getTodayAest(now: Date = new Date()): string {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Melbourne", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function parseWorksheetRows(xml: string): string[][] {
  const output: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const row: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const reference = cellMatch[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      if (!reference) continue;
      const column = columnIndex(reference);
      const value = [...cellMatch[2].matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((part) => decodeXml(part[1])).join("");
      row[column] = value;
    }
    output.push(row);
  }
  return output;
}

function columnIndex(reference: string): number {
  return [...reference].reduce((value, character) => value * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

function categoryForLicence(value: string | undefined): string | null {
  const category = text(value).toLowerCase();
  if (category.includes("restaurant") || category.includes("cafe")) return "cafe";
  if (category.includes("packaged liquor")) return "alcohol";
  if (category.includes("wine producer")) return "wine";
  if (category.includes("general licence")) return "pub";
  if (category.includes("on-premises")) return "bar";
  return null;
}

function text(value: string | undefined) { return value?.trim() ?? ""; }
function normalise(value: string | undefined) { return text(value).replace(/\s+/g, " ").toUpperCase(); }
function slugify(value: string | undefined) { return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function decodeXml(value: string) { return value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"); }
