# SuburbMates Handover

**Purpose:** canonical current-state and operating context for future SuburbMates work.

**Repository:** `/Users/carlg/Documents/AI-Coding/suburbmates`

**Product authority:** the locked documents in `docs/REFERENCE/`. This handover records the implementation that currently exists; it must not override those specifications.

## Product objective

SuburbMates is a public local-business directory for the City of Darebin. Residents browse published listings and contact businesses directly. It is not a quote marketplace, lead seller, or payment gate.

The launch model is deliberately review-first:

- new discoveries and submissions remain unpublished until an operator approves them;
- ownership, publication, payment, ABN evidence, tier, and SEO eligibility are independent states;
- an email match supports a claim but never grants ownership automatically;
- owner changes are proposals and never alter the public listing before review;
- automated checks and external integrations provide evidence, not publication authority;
- no workflow may invent business facts, silently delete records, or weaken audit history.

## Current hosted state

Reverified on 23 July 2026 (Australia/Melbourne):

- 1,621 vendor rows total;
- 1,600 published rows;
- 20 exact unpublished legacy duplicates rejected with audited links to their published peers;
- 1 original seeded listing is an explicit unpublished draft awaiting evidence review;
- exactly 1 active operator: `admin@suburbmates.com.au`;
- 0 claim requests, profile-change requests, missing-business submissions, contact requests, media proposals and queued communications at the verification checkpoint;
- 1 private candidate-handoff run and 1 private candidate-handoff record; the real operator walkthrough is still outstanding;
- three failed claim-test identities were removed; their three truthfully labelled audit events remain immutable;
- the owner explicitly authorised public release; the public directory is live and indexable;
- `/`, `/businesses`, a representative published profile, and a populated category route return successfully; `/sitemap.xml` contains 1,684 public URLs;
- `www.suburbmates.com.au` permanently redirects to the apex domain and unauthenticated `/ops` remains protected behind sign-in;
- the full repository safety suite, web lint and production build passed on the release baseline. Lint has three existing non-blocking `img` performance warnings.

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

- `/login`: Supabase passwordless email authentication.
- `/claim`: a matching authenticated email can submit a pending claim request only.
- `/dashboard`: an approved owner can submit a proposed profile change.
- claim approval, rejection, information requests, and revocation are operator-only and audited;
- profile changes remain separate from the public vendor row until operator approval;
- authenticated owners have no direct table or legacy RPC path to update public vendor fields.

### Operations

`/ops` is deny-by-default and requires both a valid Supabase session and an active `operator_users` row. Service credentials are not an alternate operator identity.

Implemented queues:

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

1. acquire public-source candidates;
2. normalize, audit, and deduplicate them;
3. generate a review artifact;
4. import new rows as `pending_review` and unpublished;
5. let an operator review evidence and approve publication.

`scripts/seed.ts` preserves publication for existing rows and explicitly sets new rows to unpublished pending review. It must never auto-publish. Empty import fields must not erase existing stored values, and same-name businesses at different addresses must remain distinct.

The weekly GitHub `Catalogue Discovery` workflow runs acquisition/audit/merge checks without secrets, uploads the candidate artifact, and never writes to the hosted database. Moving approved candidates automatically into the private review queue is still pending; automatic public publication remains prohibited.

Current allowed sources and rules are documented in `docs/vendor-acquisition-strategy.md` and `docs/openstreetmap-acquisition.md`. Do not persist data from closed directories without a licence permitting storage and display.

## Safety and audit invariants

- `audit_events` is append-only for every application role, including service paths.
- `actor_user_id` is an immutable historical UUID, intentionally not a live-auth foreign key; deleting an account must not rewrite history.
- hosted mutation tests are prohibited by default because labelled audit evidence cannot be deleted.
- destructive legacy inactivity pruning, legacy AI publication, and legacy media processing are disabled; both local Edge Function tombstones are CI-checked for absence of service-role capability, and the linked hosted project has zero deployed Edge Functions and zero storage buckets.
- resolved contact content is deleted after 12 months and spam content after 30 days by a private daily retention job; audit history retains no deleted message content.
- listing imports, claim decisions, profile edits, contact intake, and listing lifecycle actions preserve unrelated business state.
- generated or test build output is ignored and must not be committed.

## Integrations

| Service | Purpose | Current status |
| --- | --- | --- |
| GitHub | Source, CI, scheduled safe discovery | Connected; `Verify` runs on branch pushes and pull requests |
| Supabase | PostgreSQL, Auth, RLS, RPC workflows | Connected; migrations aligned through `20260722031500` |
| Cloudflare | DNS, Worker delivery, Turnstile | Live; contact widget restricted to `suburbmates.com.au`; runtime secrets are managed bindings |
| Resend | Supabase Auth SMTP only at launch | Domain verified; passwordless email-code sign-in into `/ops` is the approved path |
| Stripe | Future optional paid upgrades | Test account only; webhook returns 501; keep disabled until benefits and pricing are approved |
| ABN Lookup | Optional supporting evidence | Credential works; no workflow enabled; never gate listing, claim, or publication on ABN alone |

No paid service is required for launch. Keep Stripe and bulk ABR work disabled until a real product need exists. Custom notification email is optional and must not gate database persistence.

## Verification commands

Repository-safe checks:

```bash
npm run check
npm run audit:test
npm run acquire:osm:test
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

## Remaining work

1. Exercise every authenticated `/ops` queue in the browser, confirming each routine decision is clear to the non-technical operator and leaves the required audit evidence.
2. Review the one remaining unpublished original seed using real evidence; do not publish it by migration.
3. Decide whether historical catalogue source fields need a separate immutable evidence migration beyond their canonical `approved_import` provenance.
4. Review weekly outbound-website evidence reports. The automated checker follows HTTPS redirects only after public-DNS validation, records evidence, and opens one review issue when needed; it never changes a listing automatically. A constrained media/logo pipeline remains deferred until the core launch gates pass.

## Cleanup boundary

Keep durable decisions in this handover or the focused document that owns the workflow. Do not add raw transcripts, screenshots, recordings, build output, credentials, or repeated speculative plans to the repository.
