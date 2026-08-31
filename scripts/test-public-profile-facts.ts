import assert from "node:assert/strict";
import {
  extractPublicProfileFacts,
  hasOnlyStructuredPublicProfileFacts,
} from "../web/src/lib/public-profile-facts";

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
assert.equal(hasOnlyStructuredPublicProfileFacts("Source-reported Wi-Fi. Source-reported contactless payment."), true);
assert.equal(hasOnlyStructuredPublicProfileFacts("Cuisine: Italian, Pizza. Takeaway available."), true);
assert.equal(hasOnlyStructuredPublicProfileFacts("A friendly local cafe. Takeaway available."), false);
assert.equal(hasOnlyStructuredPublicProfileFacts(null), false);
assert.deepEqual(
  extractPublicProfileFacts("Cuisine: Thai. Vegetarian menu. Delivery available."),
  [
    { label: "Cuisine", value: "Thai" },
    { label: "Delivery" },
    { label: "Vegetarian menu" },
  ],
);
assert.deepEqual(
  extractPublicProfileFacts("Source-reported Wi-Fi. Source-reported contactless payment. Drive-through available."),
  [
    { label: "Wi-Fi", sourceReported: true },
    { label: "Contactless payment", sourceReported: true },
    { label: "Drive-through", sourceReported: true },
  ],
);

console.log("Public profile-fact presentation checks passed.");
