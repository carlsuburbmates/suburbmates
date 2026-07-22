import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260722020000_operator_abn_evidence.sql"), "utf8");
const action = fs.readFileSync(path.join(root, "web/src/app/ops/listings/actions.ts"), "utf8");
const publicPage = fs.readFileSync(path.join(root, "web/src/app/vendor/[slug]/page.tsx"), "utf8");

assert.match(migration, /private\.require_active_operator\(\)/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.ops_record_abn_check[\s\S]*FROM PUBLIC, anon, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.ops_record_abn_check[\s\S]*TO authenticated/);
assert.doesNotMatch(migration, /UPDATE public\.vendors/);
assert.match(migration, /evidence\.checked_at >= timezone\('utc'::text, now\(\)\) - interval '90 days'/);
assert.match(migration, /evidence\.evidence_data ->> 'abn_status' = 'active'/);
assert.match(action, /verifyOpsAdmin\(detailPath\)/);
assert.match(action, /ops_record_abn_check/);
assert.doesNotMatch(action, /createAdminClient/);
assert.match(publicPage, /vendor\.abn_checked/);

console.log("ABN evidence boundary checks passed.");
