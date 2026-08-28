import assert from "node:assert/strict";
import { qualifyCandidate } from "./candidate-qualification";

const options = {
  allowedSources: new Set(["openstreetmap", "operator", "community"]),
  allowedSuburbs: new Set(["northcote"]),
  allowedCategories: new Set(["plumber"]),
  existingListings: [{ id: "existing-1", businessName: "Acme Plumbing", streetAddress: "1 High Street", phone: "03 9000 0000", website: "https://acme.example/" }],
};

const valid = { source: "openstreetmap", businessName: "Northcote Plumbing", categorySlug: "plumber", suburbSlug: "northcote", streetAddress: "20 High Street", phone: "03 8111 2222", website: "https://northcote-plumbing.example" };

assert.equal(qualifyCandidate(valid, options).outcome, "qualified");
assert.equal(qualifyCandidate({ ...valid, source: "victorian_liquor_licences" }, { ...options, allowedSources: new Set(["victorian_liquor_licences"]) }).outcome, "qualified", "Approved source keys with separators must not become unapproved after normalization.");
assert.deepEqual(qualifyCandidate({ ...valid, phone: "03 9000 0000" }, options).reasons, ["strong_duplicate"]);
assert.equal(qualifyCandidate({ ...valid, businessName: "Acme Plumbing", streetAddress: "99 Elsewhere Road", phone: "03 8111 2222", website: "https://different.example" }, options).outcome, "qualified");
assert.equal(qualifyCandidate({ ...valid, businessName: "Different Business", streetAddress: "1 High Street" }, options).outcome, "qualified");
assert.equal(qualifyCandidate({ ...valid, phone: "", website: "", contactEmail: "" }, options).outcome, "qualified", "A licensed, identifiable local business can receive a useful profile before contact details are available.");
assert(qualifyCandidate({ ...valid, website: "http://unsafe.example" }, options).reasons.includes("unsafe_or_invalid_website"));
assert(qualifyCandidate({ ...valid, websiteSafety: "unsafe" }, options).reasons.includes("unsafe_or_broken_destination"));
assert(qualifyCandidate({ ...valid, suburbSlug: "melbourne" }, options).reasons.includes("outside_geographic_scope"));
assert(qualifyCandidate({ ...valid, source: "google" }, options).reasons.includes("unapproved_source"));

console.log("Candidate qualification policy tests passed.");
