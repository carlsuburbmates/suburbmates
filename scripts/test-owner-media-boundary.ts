import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260722023000_moderated_owner_media.sql"), "utf8");
const ownerRoute = fs.readFileSync(path.join(root, "web/src/app/api/owner/media/route.ts"), "utf8");
const publicRoute = fs.readFileSync(path.join(root, "web/src/app/api/media/[mediaId]/route.ts"), "utf8");

assert.match(migration, /'owner-media-proposals', 'owner-media-proposals', false, 2097152/);
assert.match(migration, /REVOKE ALL ON TABLE public\.listing_media_proposals FROM PUBLIC, anon, authenticated/);
assert.match(migration, /private\.require_active_operator\(\)/);
assert.match(migration, /publication_unchanged/);
assert.doesNotMatch(migration, /UPDATE public\.vendors/);
assert.match(ownerRoute, /imageContentType\(bytes\)/);
assert.match(ownerRoute, /const admin = createAdminClient\(\)/);
assert.match(ownerRoute, /admin\.storage\.from\("owner-media-proposals"\)\.upload/);
assert.match(ownerRoute, /Only the claimed owner can propose media/);
assert.match(publicRoute, /NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED !== "true"/);
assert.match(publicRoute, /resolve_public_media/);
assert.doesNotMatch(ownerRoute, /getPublicUrl/);

console.log("Owner media privacy and holding-gate boundary checks passed.");
