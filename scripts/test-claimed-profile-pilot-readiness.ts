import assert from "node:assert/strict";
import fs from "node:fs";
const migration = fs.readFileSync("supabase/migrations/20260905010000_claimed_profile_pilot_readiness.sql", "utf8");
assert.match(migration, /private\.require_active_operator\(\)/);
assert.match(migration, /cardinality\(services\) >= 3/);
assert.match(migration, /proposal_status = 'approved'/);
assert.match(migration, /REVOKE ALL ON FUNCTION public\.ops_get_claimed_profile_pilot_summary\(\) FROM PUBLIC, anon, service_role/);
assert.doesNotMatch(migration, /INSERT INTO public\.|UPDATE public\.|DELETE FROM public\./);
console.log("Claimed-profile pilot readiness remains aggregate, operator-only and read-only.");
