import assert from "node:assert/strict";
import fs from "node:fs";
import { qualifyExistingCatalogueListing } from "../web/src/lib/automation/existing-catalogue-requalification";

const options = {
  allowedSuburbs: new Set(["northcote"]),
  allowedCategories: new Set(["plumber"]),
  existingListings: [
    { id: "other", businessName: "Other Plumbing", streetAddress: "2 Main Street", phone: "03 9000 0000", website: "https://other.example" },
  ],
};
const valid = {
  id: "self",
  businessName: "Acme Plumbing",
  streetAddress: "1 Main Street",
  phone: "03 8111 2222",
  website: null,
  contactEmail: null,
  listingSource: "approved_import",
  sourceUrl: "https://www.openstreetmap.org/node/1",
  sourceCheckedOn: "2026-07-23",
  categorySlug: "plumber",
  suburbSlug: "northcote",
};

assert.equal(qualifyExistingCatalogueListing(valid, options).outcome, "qualified");
assert(qualifyExistingCatalogueListing({ ...valid, phone: null, website: null, contactEmail: null }, options).reasons.includes("missing_reachable_contact"));
assert(qualifyExistingCatalogueListing({ ...valid, listingSource: "seeded_by_suburbmates", sourceUrl: null, sourceCheckedOn: null }, options).reasons.includes("unproven_existing_provenance"));
assert(qualifyExistingCatalogueListing({ ...valid, phone: "03 9000 0000" }, options).reasons.includes("strong_duplicate"));
assert(!qualifyExistingCatalogueListing(valid, { ...options, existingListings: [{ ...valid }] }).reasons.includes("strong_duplicate"));

const migration = fs.readFileSync("supabase/migrations/20260722155335_existing_catalogue_requalification.sql", "utf8");
assert.match(migration, /UNIQUE \(policy_version, catalogue_fingerprint\)/);
assert.match(migration, /UNIQUE \(run_id, vendor_id\)/);
assert.match(migration, /never changes listing lifecycle or visibility/i);
assert.match(migration, /PERFORM private\.require_active_operator\(\)/);

console.log("Existing catalogue requalification policy tests passed.");
