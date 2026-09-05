import assert from "node:assert/strict";
import fs from "node:fs";
import { extractOwnerWebsitePreview } from "../web/src/lib/owner-authorised-website-preview";

const preview = extractOwnerWebsitePreview(`
  <html><head>
    <meta property="og:image" content="https://example.test/images/cafe-hero.jpg" />
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"LocalBusiness","name":"Example Cafe","description":"Do not copy this page text.","logo":{"url":"https://example.test/images/logo.png","caption":"Example Cafe logo"},"telephone":"03 9000 1234","email":"hello@example.test","openingHoursSpecification":[{"dayOfWeek":["https://schema.org/Monday","https://schema.org/Tuesday"],"opens":"08:00","closes":"16:00"}],"sameAs":["https://www.facebook.com/example/?tracking=1","https://www.instagram.com/example/#about","https://example.test/about"],"makesOffer":[{"itemOffered":{"name":"Breakfast catering"}},{"itemOffered":{"name":"Coffee beans"}}],"areaServed":[{"name":"Preston"},{"name":"Thornbury"}],"amenityFeature":{"name":"Step-free entrance"},"potentialAction":{"@type":"ReserveAction","target":"https://example.test/book"},"menu":"https://example.test/menu"}
    </script>
  </head></html>
`, "https://example.test/", "2026-09-04T00:00:00.000Z");

assert.equal(preview.phone, "03 9000 1234");
assert.equal(preview.email, "hello@example.test");
assert.equal(preview.tradingHours, "Monday, Tuesday 08:00–16:00");
assert.equal(preview.facebookUrl, "https://www.facebook.com/example/");
assert.equal(preview.instagramUrl, "https://www.instagram.com/example/");
assert.deepEqual(preview.services, ["Breakfast catering", "Coffee beans"]);
assert.deepEqual(preview.areaServed, ["Preston", "Thornbury"]);
assert.deepEqual(preview.accessibilityFeatures, ["Step-free entrance"]);
assert.equal(preview.bookingUrl, "https://example.test/book");
assert.equal(preview.menuUrl, "https://example.test/menu");
assert.equal(preview.summary, "Offers Breakfast catering, Coffee beans. Serves Preston, Thornbury.");
assert.deepEqual(preview.imageCandidates, [
  { url: "https://example.test/images/logo.png", mediaKind: "logo", altText: "Example Cafe logo" },
  { url: "https://example.test/images/cafe-hero.jpg", mediaKind: "listing_image", altText: "Business image from the recorded website" },
]);
assert.equal("description" in preview, false, "Website copy must never be extracted into the owner preview.");

const route = fs.readFileSync("web/src/app/api/owner/website-preview/route.ts", "utf8");
const utility = fs.readFileSync("web/src/lib/owner-authorised-website-preview.ts", "utf8");
const editor = fs.readFileSync("web/src/app/(directory)/dashboard/ProfileEditor.tsx", "utf8");
const component = fs.readFileSync("web/src/app/(directory)/dashboard/WebsiteProfilePreview.tsx", "utf8");

assert.match(route, /supabase\.auth\.getUser\(\)/);
assert.match(route, /list_current_owner_vendors_with_channels/);
assert.match(route, /Cache-Control.*private, no-store/);
assert.match(route, /if \(!vendor\.website\)/);
assert.match(utility, /MAX_HTML_BYTES/);
assert.match(utility, /MAX_JSON_LD_BLOCKS/);
assert.match(utility, /redirect: "manual"/);
assert.match(utility, /sameHostOrWwwVariant/);
assert.match(utility, /approvedLinkedPages/);
assert.match(utility, /slice\(0, 4\)/);
assert.match(utility, /No page text, HTML, media, cookies, or result is persisted here/);
assert.match(utility, /imageCandidates/);
assert.match(utility, /sameHostOrWwwVariant/);
assert.match(utility, /slice\(0, 6\)/);
assert.doesNotMatch(utility, /description:/);
assert.match(utility, /factualSummary/);
assert.match(component, /Factual business summary/);
assert.match(component, /I am authorised to ask SuburbMates/);
assert.match(component, /same-domain About, Services, Contact/);
assert.match(component, /nothing is published automatically/);
assert.match(component, /Existing form values are never overwritten/);
assert.match(editor, /WebsiteProfilePreview/);
assert.match(editor, /submit_vendor_profile_change_with_channels/);

console.log("Owner-authorised website preview checks passed.");
