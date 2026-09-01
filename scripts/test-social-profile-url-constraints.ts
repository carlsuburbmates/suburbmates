import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260902090000_fix_social_profile_url_constraints.sql", "utf8");

assert.ok(
  migration.includes("'^https://(www\\.|m\\.)?facebook\\.com/[^[:space:]]+$'"),
  "Facebook accepts only direct HTTPS profile URLs on its supported hosts.",
);
assert.ok(
  migration.includes("'^https://(www\\.)?instagram\\.com/[^[:space:]]+$'"),
  "Instagram accepts only direct HTTPS profile URLs on its supported hosts.",
);
assert.doesNotMatch(migration, /www\\\\\./, "The SQL regex must not require a literal backslash before a domain dot.");

console.log("Social-profile URL constraint checks passed.");
