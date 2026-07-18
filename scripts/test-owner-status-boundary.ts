import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('supabase/migrations/20260718110510_owner_status_feed.sql', 'utf8');

assert.match(source, /CREATE OR REPLACE FUNCTION public\.list_current_owner_request_statuses\(\)/);
assert.match(source, /SECURITY DEFINER/);
assert.match(source, /SET search_path = ''/);
assert.match(source, /v_user_id UUID := auth\.uid\(\)/);
assert.match(source, /IF v_user_id IS NULL THEN/);
assert.match(source, /claim\.claimant_user_id = v_user_id/);
assert.match(source, /change\.submitted_by = v_user_id/);
assert.match(source, /REVOKE ALL ON FUNCTION public\.list_current_owner_request_statuses\(\) FROM PUBLIC, anon, service_role/);
assert.match(source, /GRANT EXECUTE ON FUNCTION public\.list_current_owner_request_statuses\(\) TO authenticated/);

for (const forbidden of ['operator_note', 'business_name', 'vendor_id', 'request_id', 'INSERT INTO', 'UPDATE ', 'DELETE FROM']) {
  assert(!source.includes(forbidden), `Owner status feed must not expose or write ${forbidden}.`);
}

console.log('Owner-status feed security boundary checks passed.');
