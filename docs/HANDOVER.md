# SuburbMates Handover

**Purpose:** canonical current-state and operating context for future SuburbMates work.

**Repository:** `/Users/carlg/Documents/AI-Coding/suburbmates`

**Product authority:** the locked documents in `docs/REFERENCE/`. This handover records the implementation that currently exists; it must not override those specifications.

## Product objective

SuburbMates is a public local-business directory for the City of Darebin. Residents browse published listings and contact businesses directly. It is not a quote marketplace, lead seller, or payment gate.

The launch model is directory-first with deterministic safeguards:

- an approved-source discovery that passes scope, contact, duplicate and safety rules may become an unclaimed listing; raw submissions and uncertain candidates remain private for Ops;
- ownership, publication, payment, ABN evidence, tier, and SEO eligibility are independent states;
- an email match supports a claim but never grants ownership automatically;
- owner changes are proposals and never alter the public listing before review;
- automated checks and external integrations provide evidence; only the narrow deterministic approved-source policy may create an unclaimed listing;
- no workflow may invent business facts, silently delete records, or weaken audit history.

## Current hosted state

### Latest verified live state — 30 August 2026 (Australia/Melbourne)

- at the latest 31 August 2026 verification, the anonymous public projection returned **2,372 published listings**. This is an observed point-in-time count after the completed eight-shard OpenStreetMap handoff; the earlier 1,602 figure below remains a historical snapshot only;
- the current Cloudflare Worker deployment is version `99a42244-a335-40dc-9b8a-84a51d714ef9`, including the bounded expanded OSM venue visual language. It retains the fail-closed source-registry guard and source-specific `/ops/System` explanation, and the unauthenticated candidate endpoint still returns `401` without reading or changing any candidate data;
- the browse page now keeps keyword search primary, uses an optional service typeahead and popular-service shortcuts, and keeps suburb as a secondary filter; it does not expose the full category list by default. When a filter is applied, its count is explicitly labelled as matching listings rather than the total published directory;
- profile depth remains the material public-product constraint, but approved-source enrichment is now visibly working: 222 of 2,372 public listings have a source-backed description, 225 display bounded **source-reported hours**, and 836 have at least one direct-contact route. There are no owner-media proposals yet. These are observed data facts, not a publication or access-control failure;
- profiles with applied, display-permitted source evidence now show a compact **Information sources** card: source name, the public fields it supports and its last observation date. The reader is deliberately limited to currently published profiles and excludes raw evidence, source record keys, values, URLs, conflicts and private source contracts. At verification, 1,061 public profiles were eligible. The in-app browser confirmed the live `15 lbs Cafe` profile shows its source-backed cuisine detail, source-reported hours and safety reminder; the live `24/7 Xercise Gym` profile confirms the same card, direct contact and claim-improvement path after the expanded OSM run;
- profiles with same-category, same-suburb public alternatives now show up to three **Related local profiles** and a route to the equivalent filtered directory view. The alternatives are alphabetical public listing links only: there is no paid position, behavioural ranking, or tracking. The in-app browser confirmed this on `A Simple Sandwich` in Preston (three other Cafe profiles); a profile with no real local peers stays cleanly empty;
- unclaimed profiles now place the owner path beside direct contact: **“Own this business? Claim and improve this profile”** links to the preselected claim route. The in-app browser verified the call to action, direct contact and the removal of the former thin-profile placeholder on the live `15 lbs Cafe` profile;
- the owner claim and media-submission surfaces make the sequence explicit: locate the listing, support the review-only claim, then propose accurate details, opening hours and authorised media. In-app authenticated acceptance on 30 August confirmed the owner dashboard renders the new **Opening hours** field and keeps it review-first; no owner change was submitted or published during that check;
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
- The category-led visual language now covers the real public taxonomy across hospitality, health, beauty, pets, vehicle, trade, home, garden, fashion, art, entertainment, technology, professional services, sport and retail. It is first-party abstract iconography, not a claim about or substitute for a business image; owner-provided or licensed business media still takes precedence whenever it is approved.
- The first fully bounded OpenStreetMap handoff, [GitHub Actions run 33306787549](https://github.com/carlsuburbmates/suburbmates/actions/runs/33306787549), completed all eight shards and its protected outcome callback on 30 August 2026. Exact prior source inputs were reused idempotently; the four new source runs yielded one qualified listing and three private exceptions. Both `openstreetmap_source` and `candidate_handoff` are healthy, and authenticated in-app `/ops/System` displayed **All clear** after the run. The published catalogue count was 2,333 when rechecked.
- Current Worker deployment: Cloudflare version `99a42244-a335-40dc-9b8a-84a51d714ef9`, including the bounded expanded OSM venue visual language. The in-app browser confirmed the served browse page's service-first search and live handling of the new `gym` intent (correctly zero results before any legitimate matching source record exists), the authenticated owner dashboard's review-only opening-hours field, a live source-backed profile's safe Information sources card, related-local-profile navigation, and distinct rendered Car Repair and Accountant card treatments on 30 August 2026. No schedule, image or other owner change was submitted during acceptance. This is not evidence that every public template or mobile viewport has been accepted.

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

`suburbs.location_kind` distinguishes exact suburbs from the existing `darebin` municipality fallback. Municipality-fallback pages remain available for local browsing but are never indexable. The `taxonomy-v1` gate requires a published reviewed listing, exact-suburb context, source URL plus check date, at least one useful contact/address/description field, three qualifying listings for a pair page, and two qualified pair pages for a hub.

### Owners

- `/login`: existing authorised accounts sign in with email and password. Password reset and an eight-digit email-code fallback are delivered through Supabase Auth; there is no public account-registration flow.
- `/claim`: a matching authenticated email can submit a pending claim request only.
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

The weekly OpenStreetMap and monthly Victorian liquor-licence GitHub workflows acquire/audit approved-source evidence, upload their artifacts, and send versioned source-record candidates to the authenticated qualification handoff. The endpoint accepts a run only when its executable contract and the private `catalogue_sources` approval agree on version, exact hosts, automated/enabled state and `store_and_display` permission; otherwise it holds the run before reading candidates. Exact source/artifact retries are idempotent; a later observation of an existing qualified record re-observes provenance/freshness and enters a private conflict rather than overwriting a public fact. Only a candidate that passes the deterministic policy may become an unclaimed public listing. It never publishes raw, uncertain or user-submitted data. A missing public website, phone or email alone is not a rejection rule.

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
npm run catalogue:source-evidence:test
npm run catalogue:merge:test
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
