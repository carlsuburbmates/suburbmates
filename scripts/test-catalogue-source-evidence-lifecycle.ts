import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260827141339_catalogue_source_evidence_lifecycle.sql", "utf8");

assert.match(migration, /CREATE TABLE public\.catalogue_sources/);
assert.match(migration, /openstreetmap-candidate-v1/);
assert.match(migration, /victorian-liquor-licences-v1/);
assert.match(migration, /Creative Commons Attribution 4\.0 International/);
assert.match(migration, /source_contract_version TEXT/);
assert.match(migration, /CREATE TABLE public\.listing_field_evidence/);
assert.match(migration, /field_name IN \('business_name'.*'trading_hours'\)/s);
assert.match(migration, /CREATE TABLE public\.catalogue_field_conflicts/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
assert.match(migration, /REVOKE ALL ON TABLE[\s\S]+FROM PUBLIC, anon, authenticated/);
assert.match(migration, /GRANT ALL ON TABLE[\s\S]+TO service_role/);
assert.doesNotMatch(migration, /GRANT .* TO (anon|authenticated)/);
console.log("Catalogue source evidence lifecycle checks passed.");
