import assert from "node:assert/strict";
import { extractPublicProfileFacts } from "../web/src/lib/public-profile-facts";

assert.deepEqual(extractPublicProfileFacts(null), []);
assert.deepEqual(extractPublicProfileFacts("An owner-written profile."), []);
assert.deepEqual(
  extractPublicProfileFacts("Cuisine: Italian, Pizza. Takeaway available. Outdoor seating. Vegan options. Source-reported wheelchair access."),
  [
    { label: "Cuisine", value: "Italian, Pizza" },
    { label: "Takeaway" },
    { label: "Outdoor seating" },
    { label: "Vegan options" },
    { label: "Wheelchair access", sourceReported: true },
  ],
);
assert.deepEqual(
  extractPublicProfileFacts("Cuisine: Thai. Vegetarian menu. Delivery available."),
  [
    { label: "Cuisine", value: "Thai" },
    { label: "Delivery" },
    { label: "Vegetarian menu" },
  ],
);

console.log("Public profile-fact presentation checks passed.");
