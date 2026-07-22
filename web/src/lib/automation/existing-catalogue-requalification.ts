import { qualifyCandidate, type ExistingListing, type Qualification } from "./candidate-qualification";

export type ExistingCatalogueListing = ExistingListing & {
  listingSource: string | null;
  sourceUrl: string | null;
  sourceCheckedOn: string | null;
  categorySlug: string | null;
  suburbSlug: string | null;
  contactEmail: string | null;
};

export type ExistingCatalogueQualification = Qualification & {
  reasons: string[];
};

export function qualifyExistingCatalogueListing(
  listing: ExistingCatalogueListing,
  options: { allowedSuburbs: ReadonlySet<string>; allowedCategories: ReadonlySet<string>; existingListings: readonly ExistingListing[] },
): ExistingCatalogueQualification {
  const base = qualifyCandidate(
    {
      source: "openstreetmap",
      businessName: listing.businessName,
      categorySlug: listing.categorySlug ?? "",
      suburbSlug: listing.suburbSlug ?? "",
      streetAddress: listing.streetAddress,
      contactEmail: listing.contactEmail,
      phone: listing.phone,
      website: listing.website,
      websiteSafety: "unknown",
    },
    {
      allowedSources: new Set(["openstreetmap"]),
      allowedSuburbs: options.allowedSuburbs,
      allowedCategories: options.allowedCategories,
      existingListings: options.existingListings.filter((candidate) => candidate.id !== listing.id),
    },
  );

  const reasons = [...base.reasons];
  if (listing.listingSource !== "approved_import" || !listing.sourceUrl || !listing.sourceCheckedOn) {
    reasons.push("unproven_existing_provenance");
  }
  return {
    ...base,
    outcome: reasons.length === 0 ? "qualified" : "exception",
    reasons,
  };
}
