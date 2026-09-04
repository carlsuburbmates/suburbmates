import assert from "node:assert/strict";
import { extractOfficialWebsiteFacts, inspectOfficialWebsite, isRobotsPathAllowed } from "../web/src/lib/official-website-enrichment";

const html = `
  <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"LocalBusiness","name":"Example Bakery","description":"This promotional copy must never be imported.","image":"https://example.test/image.jpg","telephone":"03 9000 1234","email":"Hello@Example.Test","address":{"@type":"PostalAddress","streetAddress":"1 Example Street","addressLocality":"Northcote","addressRegion":"VIC","postalCode":"3070"},"openingHoursSpecification":[{"dayOfWeek":["https://schema.org/Monday"],"opens":"08:00","closes":"16:00"}],"serviceType":["Sourdough baking","Wedding cakes"],"areaServed":["Darebin"],"accessibilityFeature":["WheelchairAccessible"],"potentialAction":[{"@type":"ReserveAction","target":"https://example.test/book"}]}
  </script>`;

const facts = extractOfficialWebsiteFacts(html);
assert.deepEqual(facts, [
  { fieldName: "phone", value: "03 9000 1234" },
  { fieldName: "email", value: "hello@example.test" },
  { fieldName: "trading_hours", value: "Monday 08:00–16:00" },
  { fieldName: "street_address", value: "1 Example Street, Northcote, VIC, 3070" },
  { fieldName: "service", value: "Sourdough baking" },
  { fieldName: "service", value: "Wedding cakes" },
  { fieldName: "area_served", value: "Darebin" },
  { fieldName: "accessibility", value: "WheelchairAccessible" },
  { fieldName: "booking_url", value: "https://example.test/book" },
]);
assert.doesNotMatch(JSON.stringify(facts), /promotional copy|image\.jpg/i, "Copy and images must not leave the extractor.");

assert.equal(isRobotsPathAllowed("User-agent: *\nDisallow: /private\nAllow: /private/about", "SuburbMates-official-website-enrichment/1.0", "/"), true);
assert.equal(isRobotsPathAllowed("User-agent: *\nDisallow: /private\nAllow: /private/about", "SuburbMates-official-website-enrichment/1.0", "/private"), false);
assert.equal(isRobotsPathAllowed("User-agent: *\nDisallow: /private\nAllow: /private/about", "SuburbMates-official-website-enrichment/1.0", "/private/about"), true);

const responses = [
  new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } }),
  new Response(html, { status: 200, headers: { "content-type": "text/html" } }),
];
const inspection = await inspectOfficialWebsite("https://example.test/", {
  now: () => new Date("2026-09-04T00:00:00.000Z"),
  fetchImpl: async () => responses.shift() ?? new Response(null, { status: 500 }),
});
assert.equal(inspection.outcome, "eligible");
assert.equal(inspection.sourceUrl, "https://example.test/");
assert.match(inspection.contentFingerprint ?? "", /^[0-9a-f]{64}$/);
assert.equal(inspection.facts.length, 9);

const blocked = await inspectOfficialWebsite("https://example.test/private", {
  fetchImpl: async () => new Response("User-agent: *\nDisallow: /private", { status: 200 }),
});
assert.equal(blocked.outcome, "blocked");
assert.match(blocked.reason ?? "", /Robots rules disallow/);

const inaccessibleRobots = await inspectOfficialWebsite("https://example.test/", {
  fetchImpl: async () => { throw new Error("network"); },
});
assert.equal(inaccessibleRobots.outcome, "blocked");
assert.match(inaccessibleRobots.reason ?? "", /Robots rules could not be retrieved/);

console.log("Official website enrichment boundary checks passed.");
