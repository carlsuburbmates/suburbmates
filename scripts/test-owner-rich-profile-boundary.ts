import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260904152000_owner_rich_profile_fields.sql", "utf8");
const editor = fs.readFileSync("web/src/app/(directory)/dashboard/ProfileEditor.tsx", "utf8");
const dashboard = fs.readFileSync("web/src/app/(directory)/dashboard/page.tsx", "utf8");
const preview = fs.readFileSync("web/src/app/(directory)/dashboard/WebsiteProfilePreview.tsx", "utf8");
const profile = fs.readFileSync("web/src/app/vendor/[slug]/page.tsx", "utf8");
const ops = fs.readFileSync("web/src/app/ops/profile-edits/[requestId]/page.tsx", "utf8");

assert.match(migration, /ADD COLUMN IF NOT EXISTS services TEXT\[\]/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS booking_url TEXT/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS menu_url TEXT/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS area_served TEXT\[\]/);
assert.match(migration, /ADD COLUMN IF NOT EXISTS accessibility_features TEXT\[\]/);
assert.match(migration, /CREATE OR REPLACE VIEW public\.published_vendors/);
assert.match(migration, /Only the approved owner can propose changes to this listing/);
assert.match(migration, /private\.require_active_operator\(\)/);
assert.match(migration, /publication_unchanged/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.submit_vendor_profile_change_with_channels[\s\S]*FROM PUBLIC, anon, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.submit_vendor_profile_change_with_channels[\s\S]*TO authenticated/);
assert.doesNotMatch(migration, /INSERT INTO public\.vendors/);
assert.doesNotMatch(migration, /listing_media_proposals[\s\S]*website image/i);

assert.match(editor, /p_services: listFromText\(services\)/);
assert.match(editor, /p_booking_url: bookingUrl/);
assert.match(editor, /p_menu_url: menuUrl/);
assert.match(editor, /p_area_served: listFromText\(areaServed\)/);
assert.match(editor, /p_accessibility_features: listFromText\(accessibilityFeatures\)/);
assert.ok(editor.indexOf("<WebsiteProfilePreview") < editor.indexOf('<div className="grid grid-cols-1'), "Website import should precede manual profile entry.");
assert.match(dashboard, /vendor\.services\.length >= 3/);
assert.match(dashboard, /Approved real image/);
assert.match(dashboard, /proposal_status === "approved"/);
assert.match(dashboard, /Current hours/);
assert.match(preview, /Factual business summary/);
assert.match(preview, /nothing is published automatically/);
assert.match(profile, /PublicServiceDetails/);
assert.match(profile, /bookingUrl/);
assert.match(ops, /services: "Services and specialties"/);
assert.match(ops, /sameValue/);

console.log("Owner rich-profile moderation boundary checks passed.");
