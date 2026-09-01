import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260830110000_moderated_owner_trading_hours.sql", "utf8");
const socialProfiles = fs.readFileSync("supabase/migrations/20260901230000_add_moderated_source_social_links.sql", "utf8");
const editor = fs.readFileSync("web/src/app/(directory)/dashboard/ProfileEditor.tsx", "utf8");
const dashboard = fs.readFileSync("web/src/app/(directory)/dashboard/page.tsx", "utf8");
const opsDetail = fs.readFileSync("web/src/app/ops/profile-edits/[requestId]/page.tsx", "utf8");

assert.match(migration, /CREATE OR REPLACE FUNCTION public\.list_current_owner_vendors_with_hours/);
assert.match(migration, /WHERE vendor\.owner_id = auth\.uid\(\)/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.submit_vendor_profile_change_with_hours/);
assert.match(migration, /v_hours TEXT/);
assert.match(migration, /length\(coalesce\(v_hours, ''\)\) > 300/);
assert.match(migration, /Only the approved owner can propose changes to this listing/);
assert.match(migration, /FOR UPDATE/);
assert.match(migration, /'trading_hours', v_vendor\.trading_hours/);
assert.match(migration, /'trading_hours', v_hours/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.ops_list_profile_changes/);
assert.match(migration, /'trading_hours', vendor\.trading_hours/);
assert.match(migration, /CREATE OR REPLACE FUNCTION public\.ops_decide_profile_change/);
assert.match(migration, /trading_hours = nullif\(v_change\.proposed_changes ->> 'trading_hours', ''\)/);
assert.match(migration, /WHEN v_change\.base_values \? 'trading_hours' THEN v_current_values/);
assert.match(migration, /ELSE v_current_values - 'trading_hours'/);
assert.match(migration, /private\.require_active_operator\(\)/);
assert.match(migration, /publication_unchanged/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.submit_vendor_profile_change_with_hours[\s\S]*FROM PUBLIC, anon, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.submit_vendor_profile_change_with_hours[\s\S]*TO authenticated/);

assert.match(socialProfiles, /CREATE FUNCTION public\.list_current_owner_vendors_with_channels/);
assert.match(socialProfiles, /CREATE OR REPLACE FUNCTION public\.submit_vendor_profile_change_with_channels/);
assert.match(socialProfiles, /Only the approved owner can propose changes to this listing/);
assert.match(socialProfiles, /'facebook_url', v_vendor\.facebook_url/);
assert.match(socialProfiles, /'instagram_url', v_vendor\.instagram_url/);
assert.match(socialProfiles, /facebook_url = CASE WHEN v_change\.proposed_changes \? 'facebook_url'/);
assert.match(socialProfiles, /instagram_url = CASE WHEN v_change\.proposed_changes \? 'instagram_url'/);
assert.match(socialProfiles, /IF NOT \(v_change\.base_values \? 'facebook_url'\)/);
assert.match(socialProfiles, /IF NOT \(v_change\.base_values \? 'instagram_url'\)/);
assert.match(socialProfiles, /publication_unchanged/);
assert.match(socialProfiles, /REVOKE ALL ON FUNCTION public\.submit_vendor_profile_change_with_channels[\s\S]*FROM PUBLIC, anon, service_role/);
assert.match(socialProfiles, /GRANT EXECUTE ON FUNCTION public\.submit_vendor_profile_change_with_channels[\s\S]*TO authenticated/);

assert.match(editor, /submit_vendor_profile_change_with_channels/);
assert.match(editor, /p_trading_hours: tradingHours \|\| null/);
assert.match(editor, /p_facebook_url: facebookUrl \|\| null/);
assert.match(editor, /p_instagram_url: instagramUrl \|\| null/);
assert.match(editor, /Facebook profile/);
assert.match(editor, /Instagram profile/);
assert.match(editor, /Opening hours/);
assert.match(editor, /reviewed before publication/);
assert.match(dashboard, /list_current_owner_vendors_with_channels/);
assert.match(opsDetail, /trading_hours: "Opening hours"/);
assert.match(opsDetail, /facebook_url: "Facebook profile"/);
assert.match(opsDetail, /instagram_url: "Instagram profile"/);
assert.match(opsDetail, /Object\.keys\(request\.base_values\)/);

console.log("Owner trading-hours moderation boundary checks passed.");
