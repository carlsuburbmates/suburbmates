import assert from "node:assert/strict";
import { extractOfficialWebsiteFacts, inspectOfficialWebsite, isRobotsPathAllowed, linkedFactualPageUrls } from "../web/src/lib/official-website-enrichment";

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
const unsafeHours = extractOfficialWebsiteFacts(`<script type="application/ld+json">{"name":"Example Bakery","openingHours":["", "", "Mo 11:30-10:00"]}</script>`);
assert.ok(!unsafeHours.some((fact) => fact.fieldName === "trading_hours"), "Blank or ambiguous overnight hours must not publish.");
const missingDayHours = extractOfficialWebsiteFacts(`<script type="application/ld+json">{"name":"Example Bakery","openingHours":"Mo 11:00-18:00, , We 11:00-18:00"}</script>`);
assert.ok(!missingDayHours.some((fact) => fact.fieldName === "trading_hours"), "An empty weekday segment inside an otherwise valid schedule must not publish.");

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
assert.equal(inspection.termsStatus, "automated_clear");
assert.equal(inspection.termsBasis, "no_linked_terms_restriction_found");

assert.deepEqual(
  linkedFactualPageUrls('<a href="/services">Our services</a><a href="https://other.test/menu">Menu</a><a href="/about">About</a>', new URL("https://example.test/"))
    .map((url) => url.toString()),
  ["https://example.test/services"],
  "Only bounded, same-domain factual links are eligible.",
);

const linkedResponses = [
  new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } }),
  new Response(`${html}<a href="/services">Services</a>`, { status: 200, headers: { "content-type": "text/html" } }),
  new Response('<script type="application/ld+json">{"name":"Example Bakery","serviceType":["Bread delivery"]}</script>', { status: 200, headers: { "content-type": "text/html" } }),
];
const linkedInspection = await inspectOfficialWebsite("https://example.test/", {
  expectedBusinessName: "Example Bakery",
  fetchImpl: async () => linkedResponses.shift() ?? new Response(null, { status: 500 }),
});
const linkedFact = linkedInspection.facts.find((fact) => fact.value === "Bread delivery");
assert.equal(linkedFact?.sourceUrl, "https://example.test/services");
assert.equal(linkedInspection.facts.find((fact) => fact.value === "Sourdough baking")?.sourceUrl, "https://example.test/");

const mismatchResponses = [
  new Response("User-agent: *\nAllow: /", { status: 200 }),
  new Response(`<script type="application/ld+json">{"name":"Different Company","telephone":"03 9000 9999"}</script>`, { status: 200, headers: { "content-type": "text/html" } }),
];
const mismatch = await inspectOfficialWebsite("https://example.test/", { expectedBusinessName: "Example Bakery", fetchImpl: async () => mismatchResponses.shift()! });
assert.equal(mismatch.outcome, "unsupported");
assert.deepEqual(mismatch.facts, []);

const hostMatchResponses = [
  new Response("User-agent: *\nAllow: /", { status: 200 }),
  new Response(`<title>Welcome</title><script type="application/ld+json">{"telephone":"03 9000 9999"}</script>`, { status: 200, headers: { "content-type": "text/html" } }),
];
const hostMatch = await inspectOfficialWebsite("https://example-bakery.test/", { expectedBusinessName: "Example Bakery", fetchImpl: async () => hostMatchResponses.shift()! });
assert.equal(hostMatch.outcome, "eligible", "A matching official hostname can verify identity when structured name metadata is absent.");

const termsResponses = [
  new Response("User-agent: *\nAllow: /", { status: 200, headers: { "content-type": "text/plain" } }),
  new Response(`${html}<a href="/terms">Terms of use</a>`, { status: 200, headers: { "content-type": "text/html" } }),
  new Response("<h1>Terms</h1><p>You must not use an automated tool to scrape or extract content without our written permission.</p>", { status: 200, headers: { "content-type": "text/html" } }),
];
const termsHeld = await inspectOfficialWebsite("https://example.test/", { fetchImpl: async () => termsResponses.shift() ?? new Response(null, { status: 500 }) });
assert.equal(termsHeld.outcome, "blocked");
assert.equal(termsHeld.termsStatus, "manual_review");
assert.equal(termsHeld.termsBasis, "possible_automation_restriction");
assert.equal(termsHeld.termsUrl, "https://example.test/terms");
assert.match(termsHeld.termsFingerprint ?? "", /^[0-9a-f]{64}$/);
assert.deepEqual(termsHeld.facts, []);

const operatorBlocked = await inspectOfficialWebsite("https://example.test/", { termsOverride: "blocked", fetchImpl: async () => { throw new Error("must not fetch"); } });
assert.equal(operatorBlocked.termsStatus, "blocked");
assert.equal(operatorBlocked.outcome, "blocked");

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
