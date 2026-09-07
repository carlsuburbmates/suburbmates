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
assert.equal(extractOfficialWebsiteFacts(`<script type="application/ld+json">{"name":"Example Bakery","telephone":"123-456-7890"}</script>`).length, 0, "Obvious placeholder phones must never become evidence or public data.");
assert.equal(extractOfficialWebsiteFacts(`<script type="application/ld+json">{"name":"Example Bakery","telephone":"110-220-9800","email":"info@company.com"}</script>`).length, 0, "Template contact placeholders must never become evidence or public data.");
assert.equal(extractOfficialWebsiteFacts(`<script type="application/ld+json">{"name":"Example Bakery","email":"porto@portotheme.com"}</script>`).length, 0, "Theme-vendor placeholder emails must never become evidence or public data.");
assert.equal(extractOfficialWebsiteFacts(`<script type="application/ld+json">{"name":"Example Bakery","potentialAction":{"@type":"OrderAction","target":"https://example.test/my-account/orders/"}}</script>`).length, 0, "Customer account/order-history routes must never be classified as booking destinations.");
assert.doesNotMatch(JSON.stringify(facts), /promotional copy|image\.jpg/i, "Copy and images must not leave the extractor.");
const unsafeHours = extractOfficialWebsiteFacts(`<script type="application/ld+json">{"name":"Example Bakery","openingHours":["", "", "Mo 11:30-10:00"]}</script>`);
assert.ok(!unsafeHours.some((fact) => fact.fieldName === "trading_hours"), "Blank or ambiguous overnight hours must not publish.");
const missingDayHours = extractOfficialWebsiteFacts(`<script type="application/ld+json">{"name":"Example Bakery","openingHours":"Mo 11:00-18:00, , We 11:00-18:00"}</script>`);
assert.ok(!missingDayHours.some((fact) => fact.fieldName === "trading_hours"), "An empty weekday segment inside an otherwise valid schedule must not publish.");
const explicitHtmlFacts = extractOfficialWebsiteFacts(`
  <a href="tel:03%209000%201234">Call</a>
  <a href="mailto:hello@example.test?subject=Booking">Email</a>
  <a href="/book">Book now</a>
  <a href="/menu">View our menu</a>
  <span itemprop="serviceType">Wedding cakes</span>
  <meta itemprop="areaServed" content="Darebin">
`, "https://example.test/services");
assert.ok(explicitHtmlFacts.some((fact) => fact.fieldName === "phone" && fact.value === "03 9000 1234"));
assert.ok(explicitHtmlFacts.some((fact) => fact.fieldName === "email" && fact.value === "hello@example.test"));
assert.ok(explicitHtmlFacts.some((fact) => fact.fieldName === "booking_url" && fact.value === "https://example.test/book"));
assert.ok(explicitHtmlFacts.some((fact) => fact.fieldName === "menu_url" && fact.value === "https://example.test/menu"));
assert.ok(explicitHtmlFacts.some((fact) => fact.fieldName === "service" && fact.value === "Wedding cakes" && !fact.evidenceOnly));
assert.ok(explicitHtmlFacts.some((fact) => fact.fieldName === "area_served" && fact.value === "Darebin"));
const serviceHeadingFacts = extractOfficialWebsiteFacts(`<h2>Emergency plumbing</h2><h2>Why choose us</h2>`, "https://example.test/services");
assert.deepEqual(serviceHeadingFacts, [{ fieldName: "service", value: "Emergency plumbing", evidenceOnly: true, sourceUrl: "https://example.test/services" }]);
const noisyServiceHeadings = extractOfficialWebsiteFacts(`<h2>What is neuropsychology?</h2><h2>FAQs ON SERVICES</h2><h2>Get A Free Quote!</h2><h2>Schema Therapy</h2>`, "https://example.test/services");
assert.deepEqual(noisyServiceHeadings, [{ fieldName: "service", value: "Schema Therapy", evidenceOnly: true, sourceUrl: "https://example.test/services" }]);
const numberedServiceHeadings = extractOfficialWebsiteFacts(`<h2>1. Interior House Painting</h2><h2>III. Our Painting Process</h2><h2>Contact Us</h2><h2>Your Account</h2>`, "https://example.test/services");
assert.deepEqual(numberedServiceHeadings, [{ fieldName: "service", value: "Interior House Painting", evidenceOnly: true, sourceUrl: "https://example.test/services" }]);
const encodedAction = extractOfficialWebsiteFacts(`<a href="https://booking.test/widget?aid=146&amp;utm_source=partner">Book now</a>`, "https://example.test/");
assert.equal(encodedAction.find((fact) => fact.fieldName === "booking_url")?.value, "https://booking.test/widget?aid=146&utm_source=partner");
assert.equal(extractOfficialWebsiteFacts(`<a href="/">Book now</a>`, "https://example.test/").length, 0, "A homepage self-link is not a booking destination.");

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
