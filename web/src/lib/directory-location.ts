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
