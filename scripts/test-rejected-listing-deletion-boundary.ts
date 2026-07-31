import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260731094423_delete_rejected_ops_listings.sql", "utf8");
const actions = fs.readFileSync("web/src/app/ops/listings/actions.ts", "utf8");
const detail = fs.readFileSync("web/src/app/ops/listings/[vendorId]/page.tsx", "utf8");

assert.match(migration, /private\.require_active_operator\(\)/);
assert.match(migration, /listing_status IS DISTINCT FROM 'rejected'/);
assert.match(migration, /is_published OR v_vendor\.published_at IS NOT NULL/);
assert.match(migration, /rejected_listing_permanently_deleted/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.ops_delete_rejected_listing/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.ops_delete_rejected_listing\(UUID, TEXT\) TO authenticated/);
assert.match(actions, /confirmation !== "DELETE"/);
assert.match(actions, /ops_delete_rejected_listing/);
assert.match(detail, /status === "rejected"/);
assert.match(detail, /Permanently delete rejected listing/);
assert.match(detail, /Type DELETE to confirm/);

console.log("Rejected-listing deletion boundary checks passed.");
