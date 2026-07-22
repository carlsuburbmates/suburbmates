export const ABN_CHECK_FRESHNESS_DAYS = 90;

export type AbnCheckResult = {
  abnStatus: "active" | "inactive" | "invalid" | "not_found" | "provider_failure";
  entityStatus: string | null;
  officialNames: string[];
  checkedAt: string;
  errorMessage: string | null;
};

export function normalizeAbn(value: string) {
  return value.replace(/\s+/g, "");
}

export function isValidAbn(value: string) {
  if (!/^\d{11}$/.test(value)) return false;
  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  return value.split("").reduce((sum, digit, index) => sum + (Number(digit) - (index === 0 ? 1 : 0)) * weights[index], 0) % 89 === 0;
}

export function parseAbnResponse(xml: string, checkedAt: string): AbnCheckResult {
  const exception = text(xml, "exceptionDescription");
  if (exception) return {
    abnStatus: text(xml, "exceptionCode") === "SEARCH" ? "not_found" : "provider_failure",
    entityStatus: null, officialNames: [], checkedAt, errorMessage: safeProviderMessage(exception),
  };
  const entityStatus = text(xml, "entityStatusCode");
  if (!entityStatus) return providerFailure(checkedAt);
  return {
    abnStatus: entityStatus.toLowerCase() === "active" ? "active" : "inactive",
    entityStatus, officialNames: names(xml), checkedAt, errorMessage: null,
  };
}

export function providerFailure(checkedAt: string): AbnCheckResult {
  return { abnStatus: "provider_failure", entityStatus: null, officialNames: [], checkedAt, errorMessage: "ABN Lookup is temporarily unavailable. Try again later." };
}

function text(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decode(match[1].trim()) : null;
}

function names(xml: string) {
  // ABN Lookup may return different name types depending on whether the
  // entity is an individual, non-individual, or has suppressed details.
  // Preserve the available official names as private evidence; no name is
  // used to make an ownership or publication decision.
  const values = ["organisationName", "mainName", "legalName", "givenName", "familyName", "businessName", "mainTradingName", "otherTradingName"]
    .flatMap((tag) => [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi"))].map((match) => decode(match[1].trim())))
    .filter(Boolean);
  return [...new Set(values)].slice(0, 10);
}

function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function safeProviderMessage(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 500);
}
