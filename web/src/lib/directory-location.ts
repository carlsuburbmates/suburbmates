export const DIRECTORY_CATCHMENT_SLUG = "darebin";
export const DIRECTORY_CATCHMENT_NAME = "Darebin area";

export function isDirectoryCatchment(slug: string | null | undefined) {
  return slug === DIRECTORY_CATCHMENT_SLUG;
}

export function displayDirectoryLocation(slug: string | null | undefined) {
  if (!slug) return "Local area";
  if (isDirectoryCatchment(slug)) return DIRECTORY_CATCHMENT_NAME;
  return slug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

/**
 * Make a clearly machine-formatted street address easier to scan without
 * changing the stored source value. Mixed-case owner or source formatting is
 * preserved exactly; this is deliberately a display-only presentation helper.
 */
export function displayDirectoryStreetAddress(value: string | null | undefined) {
  const address = value?.trim();
  if (!address) return null;

  const letters = address.match(/\p{L}/gu) ?? [];
  const isUpperCaseSourceValue = letters.length >= 3
    && letters.every((letter) => letter === letter.toLocaleUpperCase("en-AU"));
  if (!isUpperCaseSourceValue) return address;

  return address
    .toLocaleLowerCase("en-AU")
    .replace(/(^|[\s,])(\p{L})/gu, (_, prefix: string, letter: string) => `${prefix}${letter.toLocaleUpperCase("en-AU")}`)
    .replace(/(\d)([a-z])\b/gu, (_, digit: string, letter: string) => `${digit}${letter.toLocaleUpperCase("en-AU")}`)
    .replace(/\bVic\b/g, "VIC")
    .replace(/\bNsw\b/g, "NSW")
    .replace(/\bAct\b/g, "ACT")
    .replace(/\bNt\b/g, "NT")
    .replace(/\bPo\b/g, "PO");
}
