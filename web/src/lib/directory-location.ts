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
 * Make machine-formatted address segments easier to scan without changing the
 * stored source value. State abbreviations and ordinary mixed-case text are
 * preserved; this is deliberately a display-only presentation helper.
 */
export function displayDirectoryStreetAddress(value: string | null | undefined) {
  const address = value?.trim();
  if (!address) return null;

  return address
    .replace(/\b\p{Lu}{2,}\b/gu, (word: string) => {
      if (["ACT", "NSW", "NT", "PO", "QLD", "SA", "TAS", "VIC", "WA"].includes(word)) return word;
      const lower = word.toLocaleLowerCase("en-AU");
      return `${lower[0]?.toLocaleUpperCase("en-AU") ?? ""}${lower.slice(1)}`;
    });
}
