import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync("supabase/migrations/20260715000000_self_service_claims.sql", "utf8");

assert.match(migration, /DO \$\$/);
assert.match(migration, /to_regclass\('public\.claim_requests'\)/);
assert.match(migration, /DROP TRIGGER IF EXISTS trg_check_vendor_claimable ON public\.claim_requests/);

console.log("Fresh local Supabase bootstrap guard checks passed.");
