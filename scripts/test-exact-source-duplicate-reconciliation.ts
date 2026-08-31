import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("web/src/app/api/automation/candidates/route.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260901210000_reconcile_exact_osm_source_duplicates.sql", "utf8");

assert.match(route, /A prior qualified record is the stable identity for this exact/);
assert.match(route, /if \(priorQualified\.data\?\.vendor_id\) \{/);
assert.match(route, /existingListings = await loadCandidateDuplicateCandidates/);
assert.match(route, /qualification_outcome: "qualified"/);
assert.match(route, /Could not link recovered source qualification evidence/);
assert.match(route, /refreshQualifiedSourceListing/);

assert.match(migration, /HAVING count\(\*\) = 2/);
assert.match(migration, /HAVING count\(DISTINCT record\.vendor_id\) = 1/);
assert.match(migration, /legacy\.ownership_status = 'unclaimed'/);
assert.match(migration, /legacy\.is_claimed = false/);
assert.match(migration, /NOT EXISTS \(SELECT 1 FROM public\.claim_requests/);
assert.match(migration, /NOT EXISTS \(SELECT 1 FROM public\.listing_change_requests/);
assert.match(migration, /NOT EXISTS \(SELECT 1 FROM public\.listing_media_proposals/);
assert.match(migration, /NOT EXISTS \(SELECT 1 FROM public\.business_submission_requests/);
assert.match(migration, /listing_status = 'unpublished'/);
assert.match(migration, /confirmed_exact_source_duplicate_unpublished/);
assert.match(migration, /fields_merged', false/);
assert.match(migration, /history_retained', true/);
assert.doesNotMatch(migration, /DELETE FROM public\.vendors/);

console.log("Exact source duplicate reconciliation checks passed.");
