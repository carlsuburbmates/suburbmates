import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260830120000_public_vendor_source_summaries.sql", "utf8");
const page = fs.readFileSync("web/src/app/vendor/[slug]/page.tsx", "utf8");

assert.match(migration, /CREATE FUNCTION public\.list_public_vendor_source_summaries\(p_vendor_id UUID\)/);
assert.match(migration, /STABLE\s+SECURITY DEFINER\s+SET search_path = ''/);
assert.match(migration, /FROM public\.published_vendors AS vendor/);
assert.match(migration, /evidence\.evidence_state = 'active'/);
assert.match(migration, /evidence\.application_state = 'applied'/);
assert.match(migration, /source\.permitted_use = 'store_and_display'/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.list_public_vendor_source_summaries\(UUID\) TO anon, authenticated/);
for (const privateValue of ["source_record_key", "value_text", "catalogue_field_conflicts", "artifact_sha256", "source_url"]) {
  assert(!migration.includes(privateValue), `Public source summary must not expose ${privateValue}.`);
}
assert.match(page, /list_public_vendor_source_summaries/);
assert.match(page, /Information sources/);
assert.match(page, /Selected public details on this profile are backed by a public source/);
console.log("Public source-summary privacy boundary checks passed.");
