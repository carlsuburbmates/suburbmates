import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync("supabase/migrations/20260901123000_label_darebin_catchment_area.sql", "utf8");
const profile = fs.readFileSync("web/src/app/vendor/[slug]/page.tsx", "utf8");
const location = fs.readFileSync("web/src/lib/directory-location.ts", "utf8");

assert.match(migration, /UPDATE public\.suburbs/);
assert.match(migration, /SET name = 'Darebin area'/);
assert.doesNotMatch(migration, /UPDATE public\.vendors|DELETE|INSERT INTO public\.vendors/);
assert.match(location, /DIRECTORY_CATCHMENT_SLUG = "darebin"/);
assert.match(location, /DIRECTORY_CATCHMENT_NAME = "Darebin area"/);
assert.match(location, /displayDirectoryStreetAddress/);
assert.match(profile, /isDirectoryCatchment\(vendor\.suburb_slug\)/);
assert.match(profile, /addressLocality: isCatchment \? undefined : suburbName/);
assert.ok(profile.includes("{displayedStreetAddress}{!isCatchment && <>, {suburbName}</>}"));
assert.match(profile, /The recorded street address is \$\{streetAddress\}; the listing is in the \$\{suburbName\}/);

console.log("Catchment location presentation checks passed.");
