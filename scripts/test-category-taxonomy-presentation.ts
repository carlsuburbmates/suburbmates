import assert from "node:assert/strict";
import fs from "node:fs";

const plan = fs.readFileSync("docs/REFERENCE/SuburbMates — Category Taxonomy Mapping Plan.md", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260901113000_correct_category_presentation_labels.sql", "utf8");

assert.match(plan, /\| `doityourself` \| Doityourself \| DIY \|/);
assert.match(plan, /\| `hifi` \| Hifi \| Hi-Fi \|/);
assert.match(plan, /\| `it` \| It \| IT \|/);
assert.match(migration, /UPDATE public\.categories/);
assert.match(migration, /WHEN 'doityourself' THEN 'DIY'/);
assert.match(migration, /WHEN 'hifi' THEN 'Hi-Fi'/);
assert.match(migration, /WHEN 'it' THEN 'IT'/);
assert.doesNotMatch(migration, /UPDATE public\.vendors/);
assert.doesNotMatch(migration, /DELETE|INSERT INTO public\.vendors/);

console.log("Category presentation mapping checks passed.");
