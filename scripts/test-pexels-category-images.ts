import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync("web/src/lib/pexels-category-images.ts", "utf8");
assert.match(source, /import "server-only"/);
assert.match(source, /orientation", "landscape"/);
assert.match(source, /unsafeAlt/);
assert.match(source, /providerPhotoId/);
assert.match(source, /photographerUrl/);
assert.match(source, /PEXELS_API_KEY/);
assert.match(source, /Pexels provider key is not configured/);
assert.doesNotMatch(source, /Google|Maps|closed directory/i);
console.log("Pexels category images remain taxonomy-led, landscape-only and credit-preserving.");
