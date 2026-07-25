export type CandidateInput = {
  source: string;
  businessName: string;
  categorySlug: string;
  suburbSlug: string;
  streetAddress?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  website?: string | null;
  websiteSafety?: "safe" | "unsafe" | "unknown";
};

export type ExistingListing = {
  id: string;
  businessName: string;
  streetAddress?: string | null;
  phone?: string | null;
  website?: string | null;
};

export type Qualification = {
  outcome: "qualified" | "exception";
  reasons: string[];
  duplicateVendorId: string | null;
  normalized: { businessName: string; streetAddress: string; phone: string; website: string };
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function qualifyCandidate(candidate: CandidateInput, options: { allowedSources: ReadonlySet<string>; allowedSuburbs: ReadonlySet<string>; allowedCategories: ReadonlySet<string>; existingListings: readonly ExistingListing[] }): Qualification {
  const normalized = { businessName: normalizeText(candidate.businessName), streetAddress: normalizeText(candidate.streetAddress), phone: normalizePhone(candidate.phone), website: normalizeWebsite(candidate.website) };
  const reasons: string[] = [];
  const source = normalizeText(candidate.source);
  const suburb = normalizeText(candidate.suburbSlug);
  const category = normalizeText(candidate.categorySlug);
  if (!options.allowedSources.has(source)) reasons.push("unapproved_source");
  if (!normalized.businessName || normalized.businessName.length < 2) reasons.push("invalid_business_name");
  if (!options.allowedSuburbs.has(suburb)) reasons.push("outside_geographic_scope");
  if (!options.allowedCategories.has(category)) reasons.push("unsupported_category");
  if (!hasReachableContact(candidate, normalized)) reasons.push("missing_reachable_contact");
  if (candidate.website && !normalized.website) reasons.push("unsafe_or_invalid_website");
  if (candidate.websiteSafety === "unsafe") reasons.push("unsafe_or_broken_destination");
  const duplicate = findStrongDuplicate(normalized, options.existingListings);
  if (duplicate) reasons.push("strong_duplicate");
  return { outcome: reasons.length === 0 ? "qualified" : "exception", reasons, duplicateVendorId: duplicate?.id ?? null, normalized };
}

function hasReachableContact(candidate: CandidateInput, normalized: Qualification["normalized"]) {
  return emailPattern.test(candidate.contactEmail?.trim().toLowerCase() ?? "") || normalized.phone.length >= 8 || Boolean(normalized.website);
}
function findStrongDuplicate(normalized: Qualification["normalized"], listings: readonly ExistingListing[]) {
  return listings.find((listing) => {
    const website = normalizeWebsite(listing.website); const phone = normalizePhone(listing.phone); const name = normalizeText(listing.businessName); const address = normalizeText(listing.streetAddress);
    return (normalized.website !== "" && normalized.website === website) || (normalized.phone !== "" && normalized.phone === phone) || (normalized.businessName !== "" && normalized.businessName === name && normalized.streetAddress !== "" && normalized.streetAddress === address);
  });
}
export function normalizeText(value: string | null | undefined) { return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
export function normalizePhone(value: string | null | undefined) { return (value ?? "").replace(/\D/g, "").replace(/^61(?=\d{9,10}$)/, "0"); }
export function normalizeWebsite(value: string | null | undefined) {
  const raw = value?.trim(); if (!raw) return "";
  try { const url = new URL(raw); return url.protocol === "https:" && !url.username && !url.password ? `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}` : ""; } catch { return ""; }
}
