import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

async function source(path: string) {
  return readFile(path, "utf8");
}

async function run() {
  const [
    home,
    homeClient,
    heroSearch,
    browse,
    taxonomy,
    profile,
    publicDirectoryShell,
    directoryBrowse,
    join,
    locality,
  ] = await Promise.all([
    source("web/src/app/(directory)/page.tsx"),
    source("web/src/components/ui/HomeClient.tsx"),
    source("web/src/components/ui/HeroSearch.tsx"),
    source("web/src/app/(directory)/businesses/page.tsx"),
    source("web/src/app/(directory)/[suburb]/[service]/page.tsx"),
    source("web/src/app/vendor/[slug]/page.tsx"),
    source("web/src/components/ui/PublicDirectoryShell.tsx"),
    source("web/src/components/ui/DirectoryBrowseClient.tsx"),
    source("web/src/app/(directory)/join/page.tsx"),
    source("web/src/app/(directory)/[suburb]/page.tsx"),
  ]);

  assert.match(
    home,
    /NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED/,
    "public home must remain behind the launch flag",
  );
  assert.match(
    home,
    /<LaunchPage\s*\/>/,
    "holding home must remain available before release",
  );
  assert.doesNotMatch(
    homeClient,
    /hero-bg\.jpg/,
    "the public home must not rely on unverified generic imagery",
  );
  assert.match(
    heroSearch,
    /Search business name or keyword/,
    "home search must accept a business name or keyword",
  );
  assert.match(
    heroSearch,
    /params\.set\("q", query\.trim\(\)\)/,
    "home search must carry keyword search into the directory",
  );
  assert.match(
    heroSearch,
    /action="\/businesses"/,
    "home search must retain a browser-native directory fallback",
  );
  assert.match(
    heroSearch,
    /name="q"/,
    "home search fallback must submit the keyword",
  );
  assert.match(
    heroSearch,
    /hero-service-options/,
    "home search must offer a compact service typeahead",
  );
  assert.match(
    heroSearch,
    /form-input/,
    "hero controls must use the shared visible-focus form treatment",
  );
  assert.match(
    homeClient,
    /Find your business/,
    "home must direct owners to the search-first claim journey",
  );
  assert.match(
    homeClient,
    /href="\/join#find-business"/,
    "home must return missing-business owners to the required search-first journey",
  );
  assert.doesNotMatch(
    homeClient,
    /\/join\?add=1/,
    "home must not bypass the find-first gate for missing businesses",
  );
  assert.match(
    homeClient,
    /Darebin/,
    "home must describe the approved local area",
  );
  assert.match(
    homeClient,
    /Browse all businesses/,
    "home previews must provide a path to the full directory",
  );
  assert.match(
    homeClient,
    /View profile/,
    "home previews must direct people to the complete profile",
  );
  assert.doesNotMatch(
    homeClient,
    /Call Direct/,
    "home previews must not duplicate profile contact controls",
  );
  assert.match(
    homeClient,
    /conciseDetail/,
    "home previews must use concise existing listing detail when available",
  );

  assert.match(
    browse,
    /vendorsRes\.error/,
    "directory fetch failures must not appear as an empty result",
  );
  assert.match(
    browse,
    /count: "exact"/,
    "directory results must retain an exact page count",
  );
  assert.match(
    browse,
    /clampedPage !== requestedPage/,
    "an out-of-range directory page must reload its valid page",
  );
  assert.match(
    browse,
    /rpc\("search_published_vendors"/,
    "directory keyword search must use the public typo-tolerant reader",
  );
  assert.match(
    browse,
    /p_suburb_slug: suburb \|\| null/,
    "directory keyword search must preserve suburb filtering",
  );
  assert.match(
    browse,
    /p_category_slug: category \|\| null/,
    "directory keyword search must preserve category filtering",
  );
  assert.match(
    taxonomy,
    /vendorsRes\.error/,
    "taxonomy fetch failures must not appear as an empty result",
  );
  assert.doesNotMatch(
    browse,
    /tier === "premium"/,
    "public browse must not present an unapproved premium tier",
  );
  assert.match(
    directoryBrowse,
    /directory-service-options/,
    "browse must offer a compact service typeahead instead of exposing the full category list",
  );
  assert.match(
    directoryBrowse,
    /Popular services/,
    "browse must offer fast, low-noise paths for common services",
  );
  assert.match(
    directoryBrowse,
    /Add a suburb/,
    "browse must keep the optional suburb filter secondary to keyword search",
  );
  assert.doesNotMatch(
    taxonomy,
    /tier === "premium"/,
    "taxonomy results must not present an unapproved premium tier",
  );

  assert.match(
    profile,
    /google\.com\/maps\/search/,
    "public address must provide a directions action",
  );
  assert.match(
    profile,
    /listing_correction/,
    "profiles must provide a safe report-problem entry point",
  );
  assert.match(
    profile,
    /JSON\.stringify\(structuredData\)/,
    "profile structured data must be generated from the public listing projection",
  );
  assert.doesNotMatch(
    profile,
    /<main id="main-content">/,
    "profiles must use the directory layout's single main landmark",
  );
  assert.match(
    profile,
    /Email business/,
    "profiles must describe email as direct business contact, not a quote request",
  );
  assert.match(
    profile,
    /Known local details/,
    "thin profiles must describe their recorded public facts instead of presenting an empty placeholder",
  );
  assert.match(
    profile,
    /describeKnownProfile/,
    "thin-profile copy must remain derived from existing public listing fields",
  );
  assert.doesNotMatch(
    profile,
    /Request Quote/,
    "profiles must not present SuburbMates as a quote broker",
  );
  assert.match(
    profile,
    /\/claim\?listing=\$\{encodeURIComponent\(vendor\.id\)\}/,
    "profiles must preserve the selected listing when owners start a claim",
  );
  assert.match(
    profile,
    /Own this business\? Claim and improve this profile/,
    "unclaimed profiles must make the owner improvement journey discoverable without competing with direct contact",
  );
  assert.match(
    locality,
    /published local business listings in \$\{name\}/,
    "locality metadata must not claim that listings serve an area without evidence",
  );
  assert.doesNotMatch(
    taxonomy,
    /Servicing \{suburb\.name\}/,
    "locality/category cards must not claim a listing serves an area without evidence",
  );

  assert.match(
    join,
    /id="find-business"/,
    "owner entry must provide an anchored find-first destination",
  );
  assert.match(
    join,
    /htmlFor="join-business-search"/,
    "owner search must label the business-name control",
  );
  assert.match(
    join,
    /htmlFor="join-suburb"/,
    "owner search must label the suburb control",
  );
  assert.match(
    join,
    /const mayChooseMissingPath/,
    "missing-business choices must remain gated by a search",
  );
  assert.doesNotMatch(
    join,
    /message\.add === "1"/,
    "the old direct-add query must not bypass find-first",
  );

  assert.match(
    directoryBrowse,
    /Loading matching businesses/,
    "directory changes must show pending feedback",
  );
  assert.match(
    directoryBrowse,
    /aria-pressed=\{viewMode === "grid"\}/,
    "directory view controls must expose their selected state",
  );
  assert.match(
    publicDirectoryShell,
    /Skip to main content/,
    "public pages must offer a keyboard skip link",
  );
  assert.match(
    publicDirectoryShell,
    /hidden[^\"]*xl:block/,
    "the fixed header must keep the tagline out of constrained layouts",
  );
  assert.match(
    publicDirectoryShell,
    /Mobile navigation/,
    "the fixed header must provide a mobile navigation path",
  );
  for (const route of [
    "/businesses",
    "/categories",
    "/locations",
    "/how-it-works",
    "/contact",
    "/privacy",
    "/login",
  ]) {
    assert(
      publicDirectoryShell.includes(`href: "${route}"`) ||
        publicDirectoryShell.includes(`href="${route}"`),
      `layout must link to ${route}`,
    );
  }
  console.log("Resident journey policy tests passed.");
}

await run();
