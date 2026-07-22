import "server-only";

import { runtimeEnv } from "@/lib/runtime-env";
import { isValidAbn, parseAbnResponse, providerFailure, type AbnCheckResult } from "@/lib/automation/abn-policy";

export { ABN_CHECK_FRESHNESS_DAYS, normalizeAbn } from "@/lib/automation/abn-policy";

export type { AbnCheckResult } from "@/lib/automation/abn-policy";

export async function checkAbn(abn: string): Promise<AbnCheckResult> {
  const checkedAt = new Date().toISOString();
  if (!isValidAbn(abn)) return { abnStatus: "invalid", entityStatus: null, officialNames: [], checkedAt, errorMessage: "This is not a valid 11-digit ABN." };

  const guid = runtimeEnv("ABR_GUID");
  if (!guid) return { abnStatus: "provider_failure", entityStatus: null, officialNames: [], checkedAt, errorMessage: "ABN Lookup is not configured." };

  const url = new URL("https://abr.business.gov.au/abrxmlsearch/ABRXMLSearch.asmx/SearchByABNv202001");
  url.searchParams.set("searchString", abn);
  url.searchParams.set("includeHistoricalDetails", "N");
  url.searchParams.set("authenticationGuid", guid);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return providerFailure(checkedAt);
    const xml = await response.text();
    return parseAbnResponse(xml, checkedAt);
  } catch {
    return providerFailure(checkedAt);
  } finally {
    clearTimeout(timeout);
  }
}
