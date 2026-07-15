const RESERVED_VENDOR_SLUGS = new Set(["admin", "api", "claim", "edit", "new", "ops"]);
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function normalizeVendorSlug(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function vendorSlugBase(businessName: string): string {
  let slug = normalizeVendorSlug(businessName) || "business";
  if (RESERVED_VENDOR_SLUGS.has(slug) || UUID_SHAPE.test(slug)) slug += "-business";
  return slug.slice(0, 100).replace(/-+$/g, "");
}

export function allocateVendorSlug(
  businessName: string,
  suburbSlug: string | null,
  vendorId: string,
  isAvailable: (candidate: string) => boolean,
): string {
  const base = vendorSlugBase(businessName);
  const suburb = normalizeVendorSlug(suburbSlug).slice(0, 40).replace(/-+$/g, "");
  if (isAvailable(base)) return base;

  if (suburb) {
    const candidate = `${base.slice(0, 119 - suburb.length).replace(/-+$/g, "")}-${suburb}`;
    if (isAvailable(candidate)) return candidate;
  }

  const compactId = vendorId.toLowerCase().replace(/-/g, "");
  for (let suffixLength = 8; suffixLength <= 32; suffixLength = Math.min(suffixLength + 4, 32)) {
    const suffix = compactId.slice(0, suffixLength);
    const prefixBudget = suburb ? 118 - suburb.length - suffix.length : 119 - suffix.length;
    const prefix = base.slice(0, prefixBudget).replace(/-+$/g, "");
    const candidate = suburb ? `${prefix}-${suburb}-${suffix}` : `${prefix}-${suffix}`;
    if (isAvailable(candidate)) return candidate;
    if (suffixLength === 32) break;
  }

  throw new Error("Unable to allocate a unique vendor slug.");
}
