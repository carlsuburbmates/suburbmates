# SuburbMates Handover

**Purpose:** canonical current-state and operating context for future SuburbMates work.

**Repository:** `/Users/carlg/Documents/AI-Coding/suburbmates`

**Product authority:** the locked documents in `docs/REFERENCE/`. This handover records the implementation that currently exists; it must not override those specifications.

## Product objective

SuburbMates is a public local-business directory for the City of Darebin. Residents browse published listings and contact businesses directly. It is not a quote marketplace, lead seller, or payment gate.

The launch model is directory-first with deterministic safeguards:

- an approved-source discovery that passes source, in-scope identity/category, duplicate and safety rules may become an unclaimed listing; missing website, phone or email alone does not prevent a useful evidence-backed profile; raw submissions and uncertain candidates remain private for Ops;
- ownership, publication, payment, ABN evidence, tier, and SEO eligibility are independent states;
- an email match supports a claim but never grants ownership automatically;
- owner changes are proposals and never alter the public listing before review;
- automated checks and external integrations provide evidence; only the narrow deterministic approved-source policy may create an unclaimed listing;
- no workflow may invent business facts, silently delete records, or weaken audit history.

## Current hosted state

### Latest verified live state — 1 September 2026 (Australia/Melbourne)

- Source-health freshness is **live verified** at commit `20f7fcc` on Cloudflare Worker `0ce00386-dbee-4ddf-bc2c-9e63ee757ad4`; the clean [Verify run 33453348251](https://github.com/carlsuburbmates/suburbmates/actions/runs/33453348251) is green. All four approved source workflows share the same run-level lifecycle: acquire and retain the source artifact, mark the protected handoff running, complete the paced private handoff, then record one terminal outcome. The genuine ASIC callback below confirmed the terminal update path writes the current `integration_health.updated_at` value with its success state, so System cannot present an earlier started time as the later check. Authenticated in-app `/ops/System` remains **All clear**. The existing Victorian and Tax Practitioners Board timestamps remain historical until their next genuine monthly handoffs; no synthetic production callback or fabricated audit event was created to demonstrate them.
- The fourth approved automated contract, the **ASIC Credit Licensee Dataset organisation-only register**, is **live verified** at commit `3e5150d` on Cloudflare Worker `0ce00386-dbee-4ddf-bc2c-9e63ee757ad4`. [GitHub Actions run 33454493700](https://github.com/carlsuburbmates/suburbmates/actions/runs/33454493700) acquired and hygiene-audited **33** active Victorian corporate/institutional candidates in the existing Darebin catchment, then completed all protected handoffs and its terminal callback. **1** candidate passed the deterministic approved-source qualification and became an unclaimed, locality-level Financial profile; **32** remain private exceptions. The public catalogue is now **2,260** profiles. The published ASIC profile has no street address, phone, email or website; raw licence numbers, ABNs/ACNs, authorisations, coordinates, postcodes and individual licensee names never enter the handoff. `asic_credit_licensees_source` is healthy and authenticated in-app `/ops/System` is **All clear**.
- The current approved OpenStreetMap refresh is **live verified**. [GitHub Actions run 33448988775](https://github.com/carlsuburbmates/suburbmates/actions/runs/33448988775) acquired and passed hygiene audit for **1,598** source rows, then completed all eight deliberately serialised private-handoff shards and its terminal outcome callback successfully. **1,582** exact prior inputs replayed idempotently; the **16** newly recorded private receipts resolved to **3 qualified** and **13 exception** outcomes. The latter remain private evidence, not an operator backlog. Both `openstreetmap_source` and `candidate_handoff` are healthy, and authenticated in-app `/ops/System` returned to **All clear**. The post-run public projection remains **2,259** listings. No manual publication, source-policy expansion, owner-state change, or private-data exposure occurred.
- Structured profile facts now retain **visible provenance** at commit `9b0e1d7` on Cloudflare Worker `1ca043ce-2081-4295-ad62-ef379f5b2ff7`. The live `Grain Peddler` contactless-payment chip now visibly says **Source-reported**, alongside the existing source card and date. The qualifier was previously announced only to screen readers. This is presentational only: no fact, source evidence, owner state, request, audit event or tracking data changed.
- Sparse evidence-backed profiles now have a **live verified** truthful presentation at commit `8d5d911` on Cloudflare Worker `066a6514-e030-4805-a095-746315b12ec5`. When a profile contains only the bounded structured source details used in **At a glance**, it is headed **Known local details** rather than being misrepresented as an editorial business description. The live `Grain Peddler` profile now pairs its source-reported contactless-payment highlight with an honest local category, area, recorded-address and available-contact summary. Any remaining prose keeps the normal **About this business** presentation. This is display-only: it does not infer or persist a fact, alter a listing, hide owner-written prose, or change a source, owner, request or audit state.
- Source-reported OSM amenities now have a **live verified** profile presentation at commit `11ea271` on Cloudflare Worker `967380b8-ca9b-4836-a646-88d66dcf2010`. The public `Parkside Inn Motel` profile shows its existing exact `Source-reported Wi-Fi.` evidence as an **At a glance · Wi-Fi** badge. The same bounded presentation recognises only the exact stored expressions for source-reported contactless payment and food-category drive-through availability. It never derives or stores a new fact, changes a listing, or treats a negative or ambiguous source value as a public promise.
- Public-profile coverage is **live verified** at commit `1d82e16` on Cloudflare Worker `d297aef1-082f-4abd-bc18-ff25006bafa4`. The post-ASIC authenticated in-app-browser read of `/ops/System` showed **2,260** published profiles; **1,599** with a street address; **827** with at least one direct contact route; **233** with a description; and **231** with reported hours. The System card reads counts only from `published_vendors`; it does not retrieve private requests, create operator work, store a coverage snapshot, change a listing, or make a quality/currentness claim. This is the current authoritative measure of the profile-enrichment gap.
- Address-only profiles are now **live verified** at commit `8238d81` on Cloudflare Worker `35ac0dac-66e0-44e5-8877-51b1ca879d47`. A public coverage audit found 1,599 profiles with a recorded address, while many legitimately lack a phone, email or website. The profile action panel now offers **Directions** whenever its recorded address supports it, independently of direct-contact availability. In-app-browser acceptance of the real address-only `17sundays` profile confirmed the directions link and its accurate “direct contact details have not yet been added” notice. This uses only the existing recorded address; it does not infer contact data, alter a listing, collect tracking data, or change ownership, source, audit or request state.
- A fresh read-only production smoke passed on 1 September: the public projection returned **2,259** published listings, **110** eligible taxonomy routes, **176** categories and **10** suburbs. The generated sitemap contained exactly **2,376** canonical URLs, matching the complete public projection and eligible taxonomy set; a real profile, all public index routes, canonical `www` redirect and unauthenticated `/ops` redirects also passed. This was live verification only: no database, Worker, listing, owner, request, media or audit record was changed.
- Exact approved-source duplicate reconciliation is **live verified** at commit `14c0f49` on Cloudflare Worker `4c436694-afea-454e-922e-e70f699513da`. A production audit found **359** pairs of rows sharing the same immutable OpenStreetMap node: one approved-source-qualified canonical profile and one legacy twin. The audited migration made **358** still-public, unclaimed, untouched legacy rows private; it never deleted a row, merged a field, transferred ownership, or touched a claim, profile change, media proposal, business submission or operator draft. It retained **358** immutable `confirmed_exact_source_duplicate_unpublished` events. Recheck after the migration found **zero** duplicate OpenStreetMap source identities still public and **2,259** public directory rows. In-app browser search now shows one Pausa Panzo profile with the canonical address, direct contact and source-backed highlights. Future exact-source re-observations now bind directly to the prior qualified identity instead of being diverted by a retained legacy twin; they preserve later operator lifecycle decisions and never republish a listing.
- Public address presentation is **live verified** at commits `132bef3` and `42cb9de` on Cloudflare Worker `016372b4-06bc-44c1-b8b5-a5299f9f851f`. Cards and profile headings now render upper-case source address segments in readable title case while preserving state abbreviations and ordinary mixed-case text. The in-app browser confirmed `45 Johnson Street, VIC 3073`, `123 Raleigh St Thornbury, Victoria 3071`, and `1D Bower St Northcote Victoria 3070 Australia` on the live Accountant results. This is strictly a display helper: it does not write, normalise, infer, alter or re-use the stored source address for matching, directions, structured data, provenance or audit.
- The next approved-source contract remains prospective. Commit `9c991f7` adds an **unsent** permission brief for Darebin Council or a trader association, specifying compatible public-display, refresh, attribution, stable-identity and privacy-exclusion requirements. It neither contacts a provider nor authorises copying, scraping or activating any additional source.
- The historical `missing_reachable_contact` evidence code is now **live verified** as context rather than a current disqualifier. Commits `1241212` and `feb226b`, deployed on Cloudflare Worker `5b614728-21f1-4cb1-93da-3372ca4a5e9f`, retain the code and its private audit record but explain in all candidate and catalogue-review views that an absent direct-contact route alone no longer blocks an otherwise qualifying approved-source listing. A read-only in-app `/ops/candidates/[recordId]` check confirmed the corrected explanation and no raw legacy reason label. No candidate, publication, ownership, or decision state changed.
- Structured public facts now have a **live verified** profile presentation at commit `2b3dd77` on Cloudflare Worker `a6f03a42-4099-4272-ac57-46cb1d48fc7f`. Exact existing profile details—cuisine, takeaway, delivery, outdoor seating, dietary options and source-reported wheelchair access—render as an **At a glance** panel only when the stored public text contains the bounded source expression. It creates, infers and persists no fact. The 30 August legacy Pausa Panzo record showed its cuisine highlight with a four-field source summary and no public mail link; after the exact-source reconciliation above, the current qualified canonical Pausa Panzo profile correctly shows its separately retained source-backed email as well.
- The owner **find-first** journey is **live verified** at commit `fd602a6` on Cloudflare Worker `60ad8712-12ed-45f8-a4f8-8b228ea36775`. It now reuses the safe public typo-and-intent directory reader across Darebin before an owner selects a suburb, while a selected suburb still narrows the results. A live `/join?q=bekary` check showed five inspectable Bakery profiles with claim actions; a live no-match city-wide check required choosing a business suburb before exposing either missing-business path. Claimed matches present ownership help instead of a misleading new-claim button. This is a public read/UI change only: it does not create an account, listing, request, ownership decision, source record, or audit event.
- Approved-source enrichment is now collision-safe and **live verified** at commit `ddb8feb` on Cloudflare Worker `d0429344-66c7-43ec-af1c-c7098100d43f`. A real OpenStreetMap refresh for the legacy Pausa Panzo row applied its description, phone, website and source-reported hours, while an email already assigned to the separate qualified Pausa Panzo listing was retained only as private conflict evidence. The current canonical profile therefore shows only its own originally qualified source-backed email, rather than an automated transfer. The repair changes neither the conflicting vendor, publication, ownership, nor audit history. The recovery [refresh run 33441252639](https://github.com/carlsuburbmates/suburbmates/actions/runs/33441252639) then completed acquisition, all eight deliberately serialised handoff shards and its outcome callback successfully. It retained 140 completed private source receipts: 36 qualified and 104 exceptions; the public catalogue was rechecked at 2,259 listings. Worker `e1b6d8ee-e0dc-43b9-95c4-31c50dc22b6c` keeps `/ops/System` truthful during a paced refresh (a quiet in-progress notice, never a Work item), and both `candidate_handoff` and `openstreetmap_source` are healthy after the terminal outcome.
- The third approved automated contract, the **Tax Practitioners Board public register**, is **live verified**. [GitHub Actions run 33338604299](https://github.com/carlsuburbmates/suburbmates/actions/runs/33338604299) acquired and audited 268 organisation-only candidate rows, then completed all 268 private handoff calls. They resolved to 258 distinct source receipts: 244 qualified and 14 retained as private exceptions. The source workflow never included individual-agent fields, individual trading names, registration numbers or dates. A 1 September production recheck of `published_vendors` and the served homepage found **2,259** published listings, including **246** Tax Practitioners Board-backed listings; there are **7,201** active private field-evidence rows across OpenStreetMap, Victorian liquor licences and the Tax Practitioners Board. The earlier 2,618-listing and 984-evidence figures are not reproducible from the current production database and must be treated as superseded snapshot claims, not current state. The source health records are healthy. No manual publication, closed-directory copying, owner-state change, or private-data exposure occurred.
- Two interrupted pre-recovery Tax Practitioners Board receipts were closed through the deployed server-authorised stale-run finaliser as failed, audit-preserving records; neither changed a listing. The final source run and `tax_practitioners_board_source` health are healthy, with no active processing receipt. The current Worker is `e4c58849-4f44-413d-b38f-fa22fe08d6bf`, which includes the earlier normalised source whitespace, bounded handoff recovery and one-time retry for transient public directory reads, plus the owner-media submission usability update below. Persistent public-read failures still render their explicit error rather than silently empty results.
- The owner-media proposal flow at `6412e19` is **deployed—verification pending**: a claimed owner will see a private local preview before submission, can insert an editable permission statement with one click, and will see the private pending-review state without a manual refresh. The public owner invitation is live verified, but the claimed-owner controls require a genuine owner case or controlled non-production fixture for browser acceptance; no synthetic production upload was created. The existing private upload storage, claimed-owner authorisation, moderation, audit basis and public-only-after-approval rule did not change. Current production aggregate: **0** owner-media proposals and **0** approved owner-media items.
- A live intent-search audit found that the old PostgreSQL whitespace pattern treated every recognised alias as one word, so **“dog groomer”** incorrectly combined generic `Pet` and specific `Pet Grooming` results. Migration `20260901100000_fix_directory_intent_specificity.sql` replaces it with a literal phrase-word count while preserving the public-only `SECURITY INVOKER` reader, query non-retention, filters and non-commercial ordering. The direct production RPC and in-app browser now return exactly **6 Pet Grooming** listings and no generic Pet result for that query. Commit `3c156c4`; current Worker `805c2319-28e7-4682-80d1-1113a87f4ca0`.
- Phase 1 of the taxonomy presentation plan is **live verified**: the display labels are now **DIY**, **Hi-Fi** and **IT** while the existing `doityourself`, `hifi` and `it` category slugs, routes and listing assignments remain unchanged. The live picker and the `/categories/hifi` and `/categories/it` routes render their corrected labels. Commit `0d15855`; current Worker `def9f531-6357-4447-8bb7-1fdfca4c5e32`.
- Phase 2 of the taxonomy mapping plan is **live verified**: legacy `jewelry` is a durable compatibility alias for canonical `jeweller`. All **five** affected published vendor assignments were normalised without deleting a listing, source evidence, or audit record; a before-write trigger protects future intake. `/categories/jewelry`, `/preston/jewelry`, and `/businesses?category=jewelry` permanently resolve to the canonical public route, and public selectors show **Jeweller** only. Commit `d57b63d`; current Worker `1542ca5d-8331-4f39-89a1-489827d932d2`.
- The generic `darebin` source-catchment label is **live verified** as **Darebin area**. Its stable slug, filters and all **1,295** assigned published listings are unchanged; public profile text no longer appends it as an exact street locality, its fallback copy distinguishes a recorded street address from an area-wide listing, and LocalBusiness JSON-LD omits `addressLocality` for that catchment. Directions retain `Darebin, Victoria, Australia` only as map-search context. Commits `7c1aad7` and `811440a`; current Worker `d62f3020-ab40-460e-9df6-643006cedb4b`.
- Approved-source intake now treats an exact source-record URL as a strong duplicate signal in addition to website, phone, or exact name-and-address matching. A live review found two A&L Salera records for the same OpenStreetMap node: the unsupported legacy record was unpublished through the protected **Duplicate listing** action, retaining its history and immutable audit event; the source-qualified record remains public. The previously recorded 2,617-listing count is a historical snapshot; the current verified total is **2,260** (see the 1 September ASIC recheck above). Commit `d0f8379`; Worker `f728101c-499b-4321-8a45-73a19cc318ab` was current for that acceptance.
- the browse page now keeps keyword search primary, uses an optional service typeahead and popular-service shortcuts, and keeps suburb as a secondary filter; it does not expose the full category list by default. When a filter is applied, its count is explicitly labelled as matching listings rather than the total published directory;
- profile depth remains the material public-product constraint, but approved-source enrichment is visibly working. The pre-TPB 30 August snapshot measured 222 of 2,372 public listings with a source-backed description, 225 with bounded **source-reported hours**, and 836 with at least one direct-contact route. Those measures and their denominator are historical and must not be compared to the current verified 2,260-listing total without a fresh coverage report. The current owner-media aggregate is recorded above. These are observed data facts, not a publication or access-control failure;
- profiles with applied, display-permitted source evidence now show a compact **Information sources** card: source name, the public fields it supports and its last observation date. The reader is deliberately limited to currently published profiles and excludes raw evidence, source record keys, values, URLs, conflicts and private source contracts. At verification, 1,061 public profiles were eligible. The in-app browser confirmed the live `15 lbs Cafe` profile shows its source-backed cuisine detail, source-reported hours and safety reminder; the live `24/7 Xercise Gym` profile confirms the same card, direct contact and claim-improvement path after the expanded OSM run;
- profiles with same-category, same-suburb public alternatives now show up to three **Related local profiles** and a route to the equivalent filtered directory view. The alternatives are alphabetical public listing links only: there is no paid position, behavioural ranking, or tracking. The in-app browser confirmed this on `A Simple Sandwich` in Preston (three other Cafe profiles); a profile with no real local peers stays cleanly empty;
- unclaimed profiles now place the owner path beside direct contact: **“Own this business? Claim and improve this profile”** links to the preselected claim route. The in-app browser verified the call to action, direct contact and the removal of the former thin-profile placeholder on the live `15 lbs Cafe` profile;
- the owner claim and media-submission surfaces make the sequence explicit: locate the listing, support the review-only claim, then propose accurate details, opening hours and authorised media. The unauthenticated claim route now explains the two safe paths—an existing authorised account can sign in with its selected listing preserved, while an unprovisioned representative can request private claim help. That request does not create an account, change a listing or publish anything automatically. In-app authenticated acceptance on 30 August confirmed the owner dashboard renders the new **Opening hours** field and keeps it review-first; no owner change was submitted or published during that check;
- OSM discovery is scheduled weekly and the licensed Victorian liquor source monthly. Both use the authenticated, evidence-preserving candidate handoff. Victorian field evidence was refreshed on 29 August and is due for re-observation from 28 September. The deployed later-observation refresh handler awaits a genuine future source observation; do not manufacture one for acceptance.
- The OSM staging feed was rechecked on 30 August: 1,598 candidates passed the normal hygiene audit. A semicolon-separated dual-phone tag had previously invalidated the entire file; the acquisition now retains the first listed number and still rejects malformed values. Eligible hospitality listings can pass through bounded `Cuisine: …`, takeaway, delivery, outdoor-seating and explicit vegan/vegetarian facts from structured OSM tags. **32 published profiles** now show **“Source-reported wheelchair access.”** only where the exact OSM value is `wheelchair=yes`; `limited`, `no` and unknown values remain unpublished rather than being simplified into an access promise. The in-app browser confirmed the live detail, source card and safe hours reminder on `ALDI`. All such facts retain field-level evidence and never overwrite existing or owner-controlled descriptions.
- The approved OSM scope now includes only explicit `healthcare=pharmacy|dentist|optometrist`, `leisure=fitness_centre|dance`, and `tourism=hotel|motel|guest_house` records, mapped to the canonical Pharmacy, Dentist, Optician, Fitness, Dance Studios and Accommodation categories. Parks, hospitals, clinics, hostels, unknown care, and all other leisure/tourism values remain excluded. The 30 August [expanded source run 33308859484](https://github.com/carlsuburbmates/suburbmates/actions/runs/33308859484) completed acquisition, audit, eight protected handoff shards and outcome recording. It created 92 new private source receipts: 49 qualified and 43 retained exceptions; 39 qualified records became new public listings (30 Fitness, 7 Accommodation and 2 Optician), while the remaining qualified records re-observed existing records. Live `gym` search returned all 30 Fitness profiles; no synthetic data or manual publication was used.
- A 30 August source-media audit found no Darebin OSM records with a `wikimedia_commons` reference and only four arbitrary `image` tags, none with a recorded compatible licence or reliable business-media basis. They remain ineligible for automatic display. The existing owner-submitted, moderated media route is the only current lawful source of business imagery.

### Historical release snapshot — 6 August 2026

The following dated release evidence is retained for audit history. Its counts and integrations must not be treated as current without a new verification:

- 1,602 vendor rows total, all published;
- no unpublished vendor rows at this verification point;
- exactly 1 active operator: `admin@suburbmates.com.au`;
- 1 approved claim request and 1 approved business-submission request from a real owner journey; there are no profile-change requests, contact requests or media proposals at this verification point;
- 4 recorded transactional status deliveries, all successfully sent; this is evidence of permitted status delivery, not a general communications system;
- 1,545 distinct OpenStreetMap source records have private candidate-handoff evidence: 1,544 exceptions and one qualified unclaimed listing. The real operator queue walkthrough is still outstanding;
- three failed claim-test identities were removed; their three truthfully labelled audit events remain immutable;
- the owner explicitly authorised public release; the public directory is live and indexable;
- the one-way HubSpot Decision Inbox is live: it mirrors only genuine Ops decisions as low-detail HubSpot Tasks, and never exports directory-wide or private request data;
- `/`, `/businesses`, a representative published profile, and a populated category route return successfully; `/sitemap.xml` contains 1,685 public URLs;
- `www.suburbmates.com.au` permanently redirects to the apex domain and unauthenticated `/ops` remains protected behind sign-in;
- the latest private existing-catalogue evidence pass (`existing-catalogue-v2`, 26 July 2026) classified all 1,601 published listings: 619 qualified and 982 retained as background evidence exceptions. It made no listing-state change and does not create a manual operator backlog; see `docs/AUTOMATION/EXISTING_CATALOGUE_REQUALIFICATION_AUDIT.md`;
- the full repository safety suite, web lint and production build passed on the current baseline. The former public-image performance warnings were resolved in PR #72; PR #73 adds a high-priority preload for the public home hero. The remaining Next.js `middleware.ts` deprecation warning is a verified OpenNext compatibility limitation; see **Production website** below.

### Modern directory delivery — 28 August 2026

- D-018 supersedes the OSM-only catalogue direction: OpenStreetMap and the Victorian Government’s CC BY 4.0 liquor-licence data are the first approved automated contracts. The source registry, field-level provenance/freshness/conflict tables, RLS and release-safe candidate handoff are live. No closed-directory facts or third-party business imagery are permitted.
- The Victorian source’s first completed live handoff, [GitHub Actions run 33180747485](https://github.com/carlsuburbmates/suburbmates/actions/runs/33180747485), processed all 365 licensed Darebin rows in 7m34s: 349 qualified unclaimed listings were created, 15 strong duplicates remained private evidence, and one out-of-scope row remained private. The directory therefore contained 1,955 published listings when rechecked. It did not use closed-directory facts, scrape business websites, or acquire business images.
- Every Victorian field-evidence row was rechecked for a private 31-day freshness horizon on 29 August 2026. This changes neither public field content nor listing state.
- A later approved-source observation of an already qualified source record now refreshes its private field-level evidence and freshness. It may fill an empty contact field only on an unclaimed listing; a changed public fact is retained as private conflict evidence and never silently overwrites the listing.
- Public search now resolves recognised service intent locally before its literal/typo fallback. Its bounded resident-language map covers food, hospitality, personal care, pets, home/trade, vehicle, retail, technology and professional services; for example, `mechanic`, `takeaway`, `nails` and `grocery` resolve to their existing relevant categories. It preserves taxonomy distinctions where they remain unresolved (for example, chemist/pharmacy). Search input remains transient and is never retained.
- The public intent reader now prefers the most specific recognised phrase rather than combining it with every shorter match. For example, **“I need a dog groomer”** resolves to the six `pet-grooming` profiles, while the deliberately broad **“dog”** query continues to resolve to the eight `pet` profiles. It remains a `SECURITY INVOKER` reader of `published_vendors`, with the same public-only projection, typo fallback and non-commercial ordering; no query text, personal profile or third-party AI service is involved.
- The public home, browse cards and profiles now use category-led visual treatments and show only owner-provided or properly licensed business media. An approved logo is now the profile identity mark; approved listing images appear separately as a labelled gallery. No generic or copied business imagery was added.
- The homepage also uses one documented, public-domain historic Westgarth streetscape as a subtle decorative local anchor. Its visible caption links to the original source and says it is **not a business listing image**; the unchanged asset provenance and checksum are held in `web/public/images/ATTRIBUTION.md`. It does not alter the stricter owner-provided-or-licensed rule for profile imagery.
- The category-led visual language now covers the real public taxonomy across hospitality, health, beauty, pets, vehicle, trade, home, garden, fashion, art, entertainment, technology, professional services, sport and retail. It is first-party abstract iconography, not a claim about or substitute for a business image; owner-provided or licensed business media still takes precedence whenever it is approved.
- The first fully bounded OpenStreetMap handoff, [GitHub Actions run 33306787549](https://github.com/carlsuburbmates/suburbmates/actions/runs/33306787549), completed all eight shards and its protected outcome callback on 30 August 2026. Exact prior source inputs were reused idempotently; the four new source runs yielded one qualified listing and three private exceptions. Both `openstreetmap_source` and `candidate_handoff` are healthy, and authenticated in-app `/ops/System` displayed **All clear** after the run. The published catalogue count was 2,333 when rechecked.
- Current Worker deployment: Cloudflare version `4cb0eadd-db60-4c7c-8b59-78d2a4fb6560`, including the credited historic local homepage image. A clean live request confirmed the unauthenticated claim route presents **Already authorised?** and **Need claim access?** without exposing self-registration or mutating any claim/listing state. The in-app browser confirmed the live homepage’s rendered search controls, local-image provenance caption, published count and owner path; it also confirmed the served browse page's service-first search and live handling of the new `gym` intent, the authenticated owner dashboard's review-only opening-hours field, a live source-backed profile's safe Information sources card, related-local-profile navigation, and distinct rendered Car Repair and Accountant card treatments. No schedule, image or other owner change was submitted during acceptance. This is not evidence that every public template or mobile viewport has been accepted.

Never infer the reason for a legacy row’s state. Recheck hosted counts before and after any migration, import, or lifecycle action.

## Production website

Production is `https://suburbmates.com.au`; `www.suburbmates.com.au` permanently redirects to the apex domain. The app is a Next.js App Router deployment packaged by OpenNext and served by the Cloudflare Worker `suburbmates`.

The only runtime and deployment path is `web/`; the obsolete root Worker and its deployment commands have been removed. Do not add blanket Edge runtime declarations: the supported deployment uses the Next.js Node.js runtime through OpenNext.

Next.js 16 warns that `middleware.ts` is deprecated, but OpenNext Cloudflare 1.20 rejects the replacement Node-based `proxy.ts`. Keep the small supported Edge middleware until the adapter documents Proxy support; this incompatibility was build-tested on 16 July 2026.

Required delivery checks from `web/`:

```bash
npm run lint
npm run build
npm run cf:build
```

`cf:build` includes a credential scan and must fail if known server secrets appear in the Worker bundle. Server credentials belong in Cloudflare secret bindings, never `web/.env.local` or committed configuration. Only public browser configuration may be present at build time.

`npm run cf:deploy` always runs `cf:build` and the credential scan before upload. Do not call the underlying OpenNext deploy command directly, because it can upload a stale local bundle.

## Implemented architecture

### Public directory

- `/`, `/businesses`, `/categories`, `/locations`: discovery surfaces.
- `/[suburb]`, `/categories/[slug]`, and `/[suburb]/[service]`: taxonomy pages. They become indexable only through the evidence-based `taxonomy_page_eligibility` policy; other valid pages use `noindex, follow`.
- `/vendor/[slug]`: published business profile, canonical metadata, and evidence-limited LocalBusiness JSON-LD. Current human-readable slugs are canonical; legacy UUID routes permanently redirect, while unpublished listings have no public route.
- `/sitemap.xml`: force-dynamic, complete paginated published catalogue; never includes `/ops`.
- `/contact`: private support intake protected by hostname-restricted Cloudflare Turnstile.
- `/privacy`: current handling, access, complaint, security, provider and retention notice.
- `/how-it-works`: plain-language publication, claim, and owner-edit model.

Public catalogue reads that can exceed 1,000 rows must use `web/src/lib/public-catalogue.ts`. Never restore a single unpaginated Supabase vendor query for sitemap, category, or location coverage.

Public directory reads use `public.published_vendors`, a safe projection containing only displayed listing fields. Never re-grant anonymous or authenticated `SELECT` on `public.vendors`; owner dashboard data comes from `list_current_owner_vendors()`.

`suburbs.location_kind` distinguishes exact suburbs from the existing `darebin` source catchment, publicly labelled **Darebin area**. Catchment pages remain available for local browsing but are never indexable. The `taxonomy-v1` gate requires a published reviewed listing, exact-suburb context, source URL plus check date, at least one useful contact/address/description field, three qualifying listings for a pair page, and two qualified pair pages for a hub.

### Owners

- `/login`: existing authorised accounts sign in with email and password. Password reset and an eight-digit email-code fallback are delivered through Supabase Auth; there is no public account-registration flow.
- `/claim`: a matching authenticated email can submit a pending claim request only; unauthenticated visitors can either sign in to the selected claim or request private claim help, never create their own account.
- `/dashboard`: an approved owner can submit a proposed profile change.
- claim approval, rejection, information requests, and revocation are operator-only and audited;
- profile changes remain separate from the public vendor row until operator approval;
- authenticated owners have no direct table or legacy RPC path to update public vendor fields.

### Operations

`/ops` is deny-by-default and requires both a valid Supabase session and an active `operator_users` row. Service credentials are not an alternate operator identity.

The default Ops workspace is **Work**, which shows only genuine human decisions. **Businesses** is the operator register and **System** is quiet health/readiness context. The protected routes below remain deep links from those three surfaces; they are not a daily workflow checklist.

Implemented protected workflows:

- `/ops/listings`: draft, review, publish, reject, unpublish, restore, and legacy classification;
- `/ops/claims`: reviewed ownership requests and revocation;
- `/ops/profile-edits`: moderated owner proposals with stale-base detection;
- `/ops/contact`: private support requests and audited resolution state;
- `/ops/system`: integration health, automation jobs, and append-only audit history.

Ops is a non-technical working surface. Queue pages use protected pagination (100 records per page). The System page presents plain-English meaning, whether action is required, and a safe next step rather than raw provider errors, metadata, or internal identifiers; it shows up to 200 recent automated-work and decision records. See `docs/OPS/` for the solo-owner guide and coverage record.

The authenticated owner-status feed is `list_current_owner_request_statuses()`. It is read-only, server-authorised, owner-scoped, and returns only request status guidance. It does not return listing data, identifiers, raw operator notes, or write audit events. User Workflows owns its presentation.

Operator actions use authenticated `SECURITY DEFINER` RPCs that call `private.require_active_operator()`, lock mutable records, validate transitions, and append audit events atomically. Publication never changes as a side effect of ownership, ABN, payment, or tier.

The permanent operator is `admin@suburbmates.com.au`; the hosted database has exactly one active operator record for that identity. Do not enrol the temporary `carl@suburbmates.com.au` identity or the Stripe-only Yahoo identity by assumption. Any future operator change must be explicitly authorised, audited, and reverified.

## Data and acquisition workflow

The safe automated discovery path is:

1. acquire approved-source candidates;
2. normalise, audit and deduplicate them;
3. retain an evidence artefact and private handoff record;
4. deterministically qualify each candidate against source, scope, category, duplicate and safety rules; and
5. create an unclaimed published listing only for a qualifying approved-source candidate while the public-release gate is enabled. Exceptions remain private; raw or uncertain records are never published.

`scripts/seed.ts` is a controlled legacy import tool, not the approved-source discovery route. It preserves publication for existing rows and sets new seed rows to unpublished pending review. Empty import fields must not erase existing stored values, and same-name businesses at different addresses must remain distinct.

The weekly OpenStreetMap and ASIC Credit Licensee workflows, plus the monthly Victorian liquor-licence and Tax Practitioners Board workflows, acquire/audit approved-source evidence, upload their artifacts, and send versioned source-record candidates to the authenticated qualification handoff. The endpoint accepts a run only when its executable contract and the private `catalogue_sources` approval agree on version, exact hosts, automated/enabled state and `store_and_display` permission; otherwise it holds the run before reading candidates. Exact source/artifact retries are idempotent; a later observation of an existing qualified record re-observes provenance/freshness and enters a private conflict rather than overwriting a public fact. Only a candidate that passes the deterministic policy may become an unclaimed public listing. It never publishes raw, uncertain or user-submitted data. A missing public website, phone or email alone is not a rejection rule.

Current allowed sources and rules are documented in `docs/vendor-acquisition-strategy.md` and `docs/openstreetmap-acquisition.md`. Do not persist data from closed directories without a licence permitting storage and display.

## Safety and audit invariants

- `audit_events` is append-only for every application role, including service paths.
- `actor_user_id` is an immutable historical UUID, intentionally not a live-auth foreign key; deleting an account must not rewrite history.
- hosted mutation tests are prohibited by default because labelled audit evidence cannot be deleted.
- destructive legacy inactivity pruning, legacy AI publication, and automated media processing are disabled; owner-proposed media remains a separate moderated workflow. Both local Edge Function tombstones are CI-checked for absence of service-role capability, and the linked hosted project has zero deployed Edge Functions and zero storage buckets.
- resolved contact content is deleted after 12 months and spam content after 30 days by a private daily retention job; audit history retains no deleted message content.
- listing imports, claim decisions, profile edits, contact intake, and listing lifecycle actions preserve unrelated business state.
- generated or test build output is ignored and must not be committed.

## Integrations

| Service | Purpose | Current status |
| --- | --- | --- |
| GitHub | Source, CI, scheduled safe discovery | Connected; `Verify` runs on branch pushes and pull requests |
| Supabase | PostgreSQL, Auth, RLS, RPC workflows | Connected; D-018 source-evidence and intent-search migrations applied 28 August 2026 |
| Cloudflare | DNS, Worker delivery, Turnstile | Live; contact widget restricted to `suburbmates.com.au`; runtime secrets are managed bindings |
| Resend | Supabase Auth delivery only | Domain verified; password reset and the eight-digit email-code fallback are delivered from `auth@suburbmates.com.au`. No general sender, marketing mail or public inbox is enabled. |
| HubSpot | Optional daily decision inbox | Connected through a 15-minute GitHub reconciliation. It creates or closes low-detail Tasks for genuine protected Ops decisions only; it cannot change SuburbMates data or read/write HubSpot contacts, companies, deals, marketing or billing. |
| Stripe | Future optional paid upgrades | Test account only; webhook returns 501; keep disabled until benefits and pricing are approved |
| ABN Lookup | Optional operator-run supporting evidence | One-listing-at-a-time evidence path is implemented; never gate listing, claim, or publication on ABN alone |

No paid service is required for launch. Keep Stripe and bulk ABR work disabled until a real product need exists. Custom notification email is optional and must not gate database persistence.

## Verification commands

Repository-safe checks:

```bash
npm run check
npm run audit:test
npm run acquire:osm:test
npm run acquire:vic-liquor:test
npm run acquire:tpb:test
npm run acquire:asic-credit:test
npm run catalogue:source-evidence:test
npm run seed:test
npm run public-catalogue:test
```

Web checks:

```bash
cd web
npm run lint
npm run build
npm run cf:build
```

`npm run claim:test` is mutation-bearing and intentionally refuses a hosted project unless `ALLOW_APPEND_ONLY_TEST_AUDIT=true`. Use rollback-only SQL or a disposable Supabase environment for lifecycle/authorization acceptance. If a hosted test is explicitly authorised, it must leave no user, listing, claim, or request residue and must accept its labelled immutable audit event.

After deployment, verify the served production response—not only browser cache—for `/`, `/contact`, `/sitemap.xml`, `/categories`, one populated taxonomy page, one empty/noindex taxonomy page, one vendor page, and unauthenticated `/ops` denial.

`.github/workflows/production-smoke.yml` repeats the public and access-control checks daily at no service cost. `scripts/production-smoke.mjs` paginates the public catalogue, reconstructs the expected sitemap, requires exact bidirectional URL equality, checks every category link, and samples a real vendor page. A failure opens or updates one GitHub issue; the workflow never writes to Supabase.

## Operational boundaries and later real-world evidence

The released Work/Businesses/System Ops model has received real-data desktop and narrow-mobile acceptance. Repeat that acceptance after a material Ops change; it is a release check, not standing operator work.

Historical catalogue provenance is retained, not deleted. New approved sources must use the D-018 `catalogue_sources` contract and field-level evidence model; source disagreement becomes private conflict evidence and may not silently overwrite a public listing.

Weekly outbound-website reports are background batch-improvement context. The checker follows HTTPS redirects only after public-DNS validation and never changes a listing or creates an operator task from a raw external failure. ABN evidence and owner-media workflows are protected and covered by automated boundary tests; their next live use occurs when a genuine owner case arises, not through fabricated acceptance records.

## Cleanup boundary

Keep durable decisions in this handover or the focused document that owns the workflow. Do not add raw transcripts, screenshots, recordings, build output, credentials, or repeated speculative plans to the repository.
