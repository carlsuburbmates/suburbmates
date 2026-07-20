import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path: string) {
  return readFile(path, "utf8");
}

async function run() {
  const [home, browse, taxonomy, profile, contact] = await Promise.all([
    source("web/src/app/(directory)/page.tsx"),
    source("web/src/app/(directory)/businesses/page.tsx"),
    source("web/src/app/(directory)/[suburb]/[service]/page.tsx"),
    source("web/src/app/vendor/[slug]/page.tsx"),
    source("web/src/components/minisite/contact/ContactComponents.tsx"),
  ]);

  assert.match(home, /NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED/, "public home must remain behind the launch flag");
  assert.match(home, /<LaunchPage\s*\/>/, "holding home must remain available before release");
  assert.match(browse, /vendorsError/, "directory fetch failures must not appear as an empty result");
  assert.match(taxonomy, /vendorsRes\.error/, "taxonomy fetch failures must not appear as an empty result");
  assert.doesNotMatch(browse, /tier === "premium"/, "public browse must not present an unapproved premium tier");
  assert.doesNotMatch(taxonomy, /tier === "premium"/, "taxonomy results must not present an unapproved premium tier");
  assert.match(contact, /google\.com\/maps\/search/, "public address must provide a directions action");
  assert.match(profile, /listing_correction/, "profiles must provide a safe report-problem entry point");

  console.log("Resident journey policy tests passed.");
}

await run();
