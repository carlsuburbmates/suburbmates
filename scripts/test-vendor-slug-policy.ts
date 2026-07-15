import assert from "node:assert/strict";
import { allocateVendorSlug, normalizeVendorSlug, vendorSlugBase } from "./vendor-slug-policy.js";

assert.equal(normalizeVendorSlug("  Carl's Café & Repairs!  "), "carl-s-cafe-repairs");
assert.equal(normalizeVendorSlug("---"), "");
assert.equal(vendorSlugBase("Admin"), "admin-business");
assert.equal(vendorSlugBase("550e8400-e29b-41d4-a716-446655440000"), "550e8400-e29b-41d4-a716-446655440000-business");

const vendorId = "550e8400-e29b-41d4-a716-446655440000";
assert.equal(allocateVendorSlug("Carl's Café", "Brunswick", vendorId, () => true), "carl-s-cafe");

const baseTaken = new Set(["carl-s-cafe"]);
assert.equal(
  allocateVendorSlug("Carl's Café", "Brunswick", vendorId, (candidate) => !baseTaken.has(candidate)),
  "carl-s-cafe-brunswick",
);

const suburbTaken = new Set(["carl-s-cafe", "carl-s-cafe-brunswick"]);
assert.equal(
  allocateVendorSlug("Carl's Café", "Brunswick", vendorId, (candidate) => !suburbTaken.has(candidate)),
  "carl-s-cafe-brunswick-550e8400",
);

const firstSuffixTaken = new Set(["carl-s-cafe", "carl-s-cafe-brunswick", "carl-s-cafe-brunswick-550e8400"]);
assert.equal(
  allocateVendorSlug("Carl's Café", "Brunswick", vendorId, (candidate) => !firstSuffixTaken.has(candidate)),
  "carl-s-cafe-brunswick-550e8400e29b",
);

assert.throws(
  () => allocateVendorSlug("A very long business name ".repeat(10), "A very long suburb name", vendorId, () => false),
  /Unable to allocate/,
);

console.log("Vendor slug policy tests passed.");
