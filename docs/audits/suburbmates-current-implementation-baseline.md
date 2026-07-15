# SuburbMates current implementation baseline

- Audit date: 15 July 2026 (Australia/Melbourne)
- Inspected branch: `main`
- Inspected commit: `8f639e11a360721a3f6107154500932213c9503a`
- Repository root: `/Users/carlg/Documents/AI-Coding/suburbmates`
- Authoritative documents:
  - `docs/REFERENCE/SuburbMates — Corrected Master Architecture and Execution Plan.md`
  - `docs/REFERENCE/SuburbMates — Unified Operations Specification.md`
- Audit constraint: no implementation, configuration, migration, dependency, environment, test, deployment, or authoritative-plan changes were made. This file is audit documentation only.

## Authority confirmation

Both authoritative documents were found as Markdown files at the exact paths above. One copy of each matching title exists. `docs/REFERENCE/Suburbmates- How the separate Ops document should be built.md` is supporting background and was not substituted for either authority. There is no authority ambiguity.

## Inspection boundary

The audit inspected the working tree, not only committed `HEAD`. The tree was already materially dirty before this audit: most current application directories were untracked relative to the recorded commit, while `README.md`, `package.json`, and lockfile changes and a deleted root `wrangler.jsonc` were already present. Findings therefore describe the files actually present on disk. The five audit reports are the only files created by this audit.

## Repository and stack

| Area | Observed baseline | Evidence |
|---|---|---|
| Workspace | Single repository with root catalogue/worker tooling and nested `web/` application | `package.json`; `web/package.json`; repository tree |
| Package managers | npm at root and in `web/`, with separate lockfiles | `package-lock.json`; `web/package-lock.json` |
| Web framework | Next.js 16.2.10 App Router, React 19.2.4, TypeScript, Tailwind CSS 4 | `web/package.json:14-34`; `web/src/app/` |
| Deployment | Cloudflare Worker through OpenNext, Node compatibility enabled | `web/wrangler.jsonc:3-10`; `web/open-next.config.ts:1-3`; `web/package.json:8-10` |
| Runtime declarations | No page or route is currently forced to `runtime = 'edge'`; middleware remains for auth refresh and apex redirect | `web/src/middleware.ts:1-26`; repository-wide runtime search |
| Supabase | Hosted Supabase Postgres/Auth accessed through browser and server clients; no local database is part of the declared workflow | `web/src/utils/supabase/client.ts`; `web/src/utils/supabase/server.ts`; eight SQL migrations |
| Legacy worker | Root `src/index.ts` is the superseded Cloudflare holding-page worker and is not the configured `web/` entrypoint | `src/index.ts:1-95`; `web/wrangler.jsonc:3-5` |
| Vercel residue | A local `.vercel/project.json` exists, but active docs and deployment scripts use Cloudflare/OpenNext | `web/.vercel/project.json`; `web/README.md:13`; `web/package.json:8-10` |
| CI | No repository CI workflow was found | no `.github/workflows` files |

## Environment and secret references

Only variable names were inspected. Values were not printed or copied.

- Root environment names include Supabase, database, Stripe, Resend, and JWKS variables.
- Web environment names include public Supabase values plus Supabase, database, Stripe, Resend, and JWKS server values.
- No ABN Lookup or Gemini variable name was visible in the inspected `.env.local` key inventory. The Master Plan says an ABN GUID was supplied; its current storage could not be verified without searching outside the authorised environment files.
- Code additionally references `OPENROUTER_API_KEY` and `REVALIDATION_TOKEN`; those names were not present in the inspected local key inventory.

## Database baseline

### Repository schema

The migration chain creates `suburbs`, `categories`, `vendors`, and `emails_queue`, then adds publication, catalogue identity, address, self-service claims, provenance, and owner-profile updates.

Current `vendors` information represented by migrations:

`id`, `owner_id`, `business_name`, `category_slug`, `suburb_slug`, `contact_email`, `phone`, `website`, `description`, `tier`, `stripe_customer_id`, `stripe_subscription_id`, `is_claimed`, `last_active_at`, `created_at`, `is_published`, `source_key`, `street_address`, `source_url`, `source_checked_on`, `verification_status`, `source_notes`.

Evidence: `supabase/migrations/20260712000000_core_schema.sql:23-40`; later migrations in `supabase/migrations/`.

### Hosted read-only verification

The hosted project was queried without mutation:

- 1,621 vendors total.
- 1,600 vendors published.
- 21 vendors unpublished.
- 175 categories.
- 10 suburbs.
- Hosted vendor columns match the repository migration model listed above.
- Planned operational tables were not found in the hosted PostgREST schema cache: `claim_requests`, `automation_jobs`, `integration_health`, `audit_logs`, `seo_snapshots`, `sitemap_snapshots`, `traffic_security_snapshots`, `abn_checks`, `billing_state`, and `ai_reviews` each returned `PGRST205` on a real row query.

The earlier `head: true` existence probe was discarded because it returned false positives; the final evidence used normal `select('*').limit(1)` requests.

## Actual workflows

### Catalogue acquisition and import

1. OpenStreetMap acquisition and curated CSV files provide candidates.
2. Audit checks validate suburb allowlist, URL syntax, placeholder email, phone shape, HTML entities, generic names, and source notes.
3. Merge logic deterministically combines manual and OSM records and reports duplicates.
4. Seed logic preloads hosted vendors, matches by email/source key, preserves empty existing values, and upserts.
5. **Conflict:** a new vendor is assigned `is_published = true` during insert (`scripts/seed.ts:264-293`). This bypasses the Phase 1 manual publication rule.

### Public directory

- Homepage reads published featured listings and taxonomies.
- `/businesses` searches and paginates published listings.
- `/[suburb]`, `/categories/[slug]`, and `/[suburb]/[service]` implement taxonomy routes.
- `/vendor/[slug]` actually resolves the route value against vendor `id`, filters `is_published = true`, and calls `notFound()` otherwise (`web/src/app/vendor/[slug]/page.tsx:41-57`). There is no durable vendor slug column or redirect history.
- Cards provide direct phone/email/website actions plus internal profile links.
- Public RLS also restricts vendor reads to `is_published = true` (`supabase/migrations/20260712000002_add_is_published.sql:5-14`).

### Authentication, claims, and ownership

- Supabase OTP login and callback routes exist.
- Claiming is immediate when the authenticated JWT email equals the vendor contact email.
- The claim RPC sets `owner_id` and `is_claimed` but leaves publication unchanged.
- The previous claim request table and approval functions are explicitly dropped (`supabase/migrations/20260715000000_self_service_claims.sql:1-11`).
- Owner edits use a security-definer RPC that rechecks `auth.uid()` against `owner_id` and does not change ownership or publication.
- This is substantial reusable owner functionality, but it differs from the authoritative claim queue, evidence, approval, rejection, and revocation workflow.

### Integrations and automation

| Integration | Actual state |
|---|---|
| Stripe | Vendor columns and local secret names exist, but the webhook returns HTTP 501 and no checkout/subscription state machine exists (`web/src/app/api/webhook/stripe/route.ts:1-7`). |
| ABN Lookup | No implementation or verifiable local key name found. |
| Gemini | No Gemini integration found. A legacy OpenRouter/Gemma Edge Function generates fixed 300-word copy and publishes the listing (`supabase/functions/generate-bio/index.ts:35-81`). |
| Media | `compress-logo` downloads and attempts WebP output, but comments describe placeholder/uncertain encoding and no end-to-end trigger or public logo field flow was verified. |
| Background jobs | One pg_cron email-queue schedule exists; no general job, retry, idempotency, or correlation model exists. |
| Search Console | No API client, snapshot table, job, or Ops view found. |
| Cloudflare analytics/security | Deployment is configured; analytics, WAF/security-event ingestion, snapshots, and Ops presentation are absent. |

## SEO and indexing baseline

- Published filtering exists in public vendor queries and sitemap vendor selection.
- Global and route metadata provide titles/descriptions, but there is no explicit metadata base, per-page canonical, Open Graph, robots route/file, JSON-LD, or LocalBusiness schema.
- `sitemap.ts` includes all published vendors and all suburb/category combinations without a separate indexability or usefulness gate.
- The sitemap fallback uses `https://suburbmates.com`, not the canonical `.com.au` domain (`web/src/app/sitemap.ts:15`).
- Empty valid suburb/category pages render an indexable empty state instead of `noindex`.
- Vendor URLs use UUIDs, not stable human-readable slugs.

## Security baseline

- Vendor, category, suburb, and email-queue RLS is enabled.
- Public vendor SELECT is published-only.
- Owner mutations are protected in RPCs and by ownership checks.
- No Ops route or operator role exists.
- No submission endpoint exists, so submission-specific spam protection is not applicable yet.
- Revalidation uses a bearer token check, but accepts an arbitrary path string for `revalidatePath`.
- Website import validation accepts HTTPS URLs but does not implement DNS/IP safety, redirect-chain validation, or runtime outbound-link rechecking.
- No rate-limit, CAPTCHA, WAF rule configuration, abuse event storage, or dynamic-route quality guard was found in the repository.

## Tests and verification baseline

Present:

- Root TypeScript check.
- Candidate audit tests.
- Catalogue merge tests.
- OSM acquisition tests.
- Seed policy tests.
- Live Supabase claim/profile test.
- Next.js build and ESLint scripts.

Absent:

- CI workflows.
- Route-level automated tests.
- SEO/canonical/robots/JSON-LD tests.
- Stripe, ABN, AI, Ops authorisation, moderation, audit-log, and job-retry tests.
- Acceptance test harness for the two authoritative documents.

## Preservation assessment

Retain the hosted catalogue, taxonomies, provenance fields, published-only RLS, public directory routes, direct-contact UI, Cloudflare/OpenNext setup, acquisition/audit/merge logic, Supabase authentication, and owner-profile RPC pattern. Adapt import publication, claims, vendor lifecycle fields, slugs, SEO eligibility, and public metadata. Deprecate the legacy holding worker and unsafe biography function only after replacements and data safeguards are verified.

## Evidence limitations

- No production logs, Cloudflare analytics, WAF configuration, Search Console account, Stripe event history, ABN Lookup response, Gemini project, or Resend event history was inspected.
- Environment values were intentionally unavailable to the report; only names were examined.
- Hosted table existence was tested through PostgREST, not direct `information_schema` access.
- Deployed public route behavior had been verified immediately before this audit, but this audit did not perform browser automation or authenticated owner-flow mutation.
- The worktree is materially different from commit `8f639e1`; commit metadata alone does not reproduce the inspected implementation.

## No-data-loss ledger

| Major requirement group | Traceability location |
|---|---|
| Directory model, acquisition, ownership, provenance | Master matrix `MP-01`–`MP-12` |
| Privacy, direct contact, evidence-led content | Master matrix `MP-13`–`MP-15` |
| Framework, Cloudflare, runtime, schema | Master matrix `MP-16`–`MP-24` |
| Listing lifecycle and publication | Master matrix `MP-25`–`MP-31` |
| Public routes and navigation | Master matrix `MP-32`–`MP-37` |
| Indexing and technical SEO | Master matrix `MP-38`–`MP-45` |
| Abuse, ABN, AI, Stripe, media, security, monitoring | Master matrix `MP-46`–`MP-58` |
| Ops access, information architecture, actions, integrations, auditability | Ops matrix `OPS-01`–`OPS-36` |

