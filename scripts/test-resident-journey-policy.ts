import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path: string) {
  return readFile(path, "utf8");
}

async function run() {
  const [home, homeClient, heroSearch, browse, taxonomy, profile, contact, directoryLayout] = await Promise.all([
    source("web/src/app/(directory)/page.tsx"),
    source("web/src/components/ui/HomeClient.tsx"),
    source("web/src/components/ui/HeroSearch.tsx"),
    source("web/src/app/(directory)/businesses/page.tsx"),
    source("web/src/app/(directory)/[suburb]/[service]/page.tsx"),
    source("web/src/app/vendor/[slug]/page.tsx"),
    source("web/src/components/minisite/contact/ContactComponents.tsx"),
    source("web/src/app/(directory)/layout.tsx"),
  ]);

  assert.match(home, /NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED/, "public home must remain behind the launch flag");
  assert.match(home, /<LaunchPage\s*\/>/, "holding home must remain available before release");
  assert.match(homeClient, /ReactDOM\.preload\("\/hero-bg\.jpg", \{ as: "image", fetchPriority: "high" \}\)/, "the public hero image must preload at high priority");
  assert.match(heroSearch, /Search business name or keyword/, "home search must accept a business name or keyword");
  assert.match(heroSearch, /params\.set\("q", query\.trim\(\)\)/, "home search must carry keyword search into the directory");
  assert.match(homeClient, /Find or claim your business/, "home must direct owners to the search-first claim journey");
  assert.match(homeClient, /href="\/join\?add=1"/, "home must provide a separate missing-business route");
  assert.match(homeClient, /City of Darebin/, "home must describe the approved local area");
  assert.match(browse, /vendorsError/, "directory fetch failures must not appear as an empty result");
  assert.match(taxonomy, /vendorsRes\.error/, "taxonomy fetch failures must not appear as an empty result");
  assert.doesNotMatch(browse, /tier === "premium"/, "public browse must not present an unapproved premium tier");
  assert.doesNotMatch(taxonomy, /tier === "premium"/, "taxonomy results must not present an unapproved premium tier");
  assert.match(contact, /google\.com\/maps\/search/, "public address must provide a directions action");
  assert.match(profile, /listing_correction/, "profiles must provide a safe report-problem entry point");
  assert.match(directoryLayout, /Skip to main content/, "public pages must offer a keyboard skip link");
  assert.match(directoryLayout, /hidden[^\"]*xl:block/, "the fixed header must keep the tagline out of constrained layouts");
  assert.match(directoryLayout, /Mobile navigation/, "the fixed header must provide a mobile navigation path");
  for (const route of ["/businesses", "/categories", "/locations", "/how-it-works", "/contact", "/privacy", "/login"]) {
    assert(directoryLayout.includes(`href: "${route}"`) || directoryLayout.includes(`href="${route}"`), `layout must link to ${route}`);
  }

  console.log("Resident journey policy tests passed.");
}

await run();
