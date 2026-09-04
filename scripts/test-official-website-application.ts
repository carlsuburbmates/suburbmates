import assert from "node:assert/strict";
import { factualSummary, planOfficialWebsiteApplication } from "../web/src/lib/official-website-application-plan";

const vendor = { id: "vendor", business_name: "Example", website: "https://example.test", ownership_status: "unclaimed", description: null, contact_email: null, phone: "03 9000 0000", street_address: null, trading_hours: null, services: [], booking_url: null, menu_url: null, area_served: [], accessibility_features: [] };
const facts = [{ fieldName: "phone" as const, value: "03 9000 1111" }, { fieldName: "service" as const, value: "Sourdough baking" }, { fieldName: "service" as const, value: "Wedding cakes" }, { fieldName: "area_served" as const, value: "Darebin" }, { fieldName: "booking_url" as const, value: "https://example.test/book" }];
const plan = planOfficialWebsiteApplication(vendor, facts);
assert.equal(plan.updates.phone, undefined, "An existing field must never be overwritten.");
assert.deepEqual(plan.updates.services, ["Sourdough baking", "Wedding cakes"]);
assert.equal(plan.updates.booking_url, "https://example.test/book");
assert.ok(plan.conflictFields.includes("phone"));
assert.match(factualSummary(facts) ?? "", /Services include Sourdough baking, Wedding cakes\. Serves Darebin\./);
assert.doesNotMatch(JSON.stringify(plan), /image|marketing|testimonial/i);
console.log("Official website application plans only factual empty-field enrichment and conflicts.");
