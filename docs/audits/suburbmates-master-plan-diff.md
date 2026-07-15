# SuburbMates Master Plan implementation diff

- Audit date: 15 July 2026 (Australia/Melbourne)
- Inspected branch: `main`
- Inspected commit: `8f639e11a360721a3f6107154500932213c9503a`
- Repository root: `/Users/carlg/Documents/AI-Coding/suburbmates`
- Authoritative documents: `docs/REFERENCE/SuburbMates — Corrected Master Architecture and Execution Plan.md`; `docs/REFERENCE/SuburbMates — Unified Operations Specification.md`
- Audit constraint: no implementation changes were made. This report is documentation only.

## Status summary

| Status | Count |
|---|---:|
| IMPLEMENTED | 15 |
| PARTIALLY IMPLEMENTED | 16 |
| PRESENT BUT NOT WIRED | 2 |
| IMPLEMENTED DIFFERENTLY | 2 |
| MISSING | 15 |
| CONFLICTS WITH CURRENT PLAN | 4 |
| SUPERSEDED LEGACY IMPLEMENTATION | 1 |
| NOT APPLICABLE YET | 1 |
| CANNOT VERIFY | 1 |
| REQUIRES PRODUCT DECISION | 1 |
| **Total** | **58** |

`MP` means the Corrected Master Architecture and Execution Plan.

## Traceability matrix

| ID | Source | Section | Requirement | Status | Repository evidence | Actual observed behavior | Difference | Risk/consequence | Disposition | Phase | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MP-01 | MP | 1–3 | Directory-first platform | IMPLEMENTED | `web/src/app/(directory)/`; `web/src/app/vendor/[slug]/page.tsx` | Residents browse and contact businesses without accounts | None material for the public baseline | Low | retain | 2 | high |
| MP-02 | MP | 2.1, 6.1 | Seeded listings | PARTIALLY IMPLEMENTED | `data/*.csv`; `scripts/seed.ts:177-309` | Real CSV records are imported | Import lacks review lifecycle and publishes new rows | Unreviewed pages can become public | adapt | 1 | high |
| MP-03 | MP | 2.1 | Operator-added listings | PRESENT BUT NOT WIRED | `scripts/seed.ts`; no operator UI/API | An operator can prepare a CSV manually | No distinct source/status or operator workflow | Provenance and accountability are lost | adapt | 4 | high |
| MP-04 | MP | 2.1, 6.2 | Business-submitted listings | MISSING | `/join` is informational; no mutation route/table | Businesses cannot submit a new listing | Required lifecycle absent | Product intake unavailable | migrate | 2 | high |
| MP-05 | MP | 2.1, 6.1 | Approved imports | CONFLICTS WITH CURRENT PLAN | `scripts/seed.ts:264-293` | Audited files auto-publish new rows | File audit is treated as publication approval | Violates manual Phase 1 gate | adapt | 1 | high |
| MP-06 | MP | 2.1 | Unclaimed public listings | IMPLEMENTED | `is_claimed`; published catalogue; minisite claim link | Published records can remain unclaimed | Matches directory principle | Low | retain | 2 | high |
| MP-07 | MP | 2.1, 6.3 | Claimable existing listings | IMPLEMENTED DIFFERENTLY | `20260715000000_self_service_claims.sql:13-90` | Matching-email users claim immediately | Plan expects claim state/evidence policy and unresolved decision | Ownership disputes cannot be queued | migrate | 5 | high |
| MP-08 | MP | 2.3 | Publication separate from ownership | PARTIALLY IMPLEMENTED | Claim RPC only updates `owner_id`/`is_claimed`; owner RPC preserves publication | Claiming does not hide or publish | No formal independent status enums | State cannot express pending/verified ownership | adapt | 1 | high |
| MP-09 | MP | 2.3, 5.3 | Listing-source provenance | PARTIALLY IMPLEMENTED | `source_key`, `source_url`, `source_checked_on`, `source_notes` | Imports retain source facts | No controlled `listing_source`, source name, actor, captured timestamp | Weak operational traceability | adapt | 1 | high |
| MP-10 | MP | 2.2 | ABN optional for inclusion | IMPLEMENTED | No ABN validation in seed/audit/public query | Listings publish without ABN | Correct principle, but not explicit state | Low | retain | 1 | high |
| MP-11 | MP | 2.3 | Independent listing/ownership/ABN/commercial/payment states | MISSING | Vendor has booleans/tier and two Stripe IDs only | State dimensions are conflated or absent | Required controlled lifecycle is unavailable | High migration and decision ambiguity | migrate | 1 | high |
| MP-12 | MP | 2.4 | Precise evidence badges | PARTIALLY IMPLEMENTED | UI shows `Published`, `Premium`, and claim state | No generic Verified badge in live UI | No Owner Verified or ABN Checked states | Future UI could overstate evidence | adapt | 2 | medium |
| MP-13 | MP | 3.1 | Privacy-first public data | PARTIALLY IMPLEMENTED | Public RLS limits rows; public select includes contact email | Only published rows are public | No explicit public/private field model | Operational/private fields may leak as schema grows | adapt | 1 | medium |
| MP-14 | MP | 3.2, 10 | Direct contact/no middleman | IMPLEMENTED | vendor cards and contact components | Phone, email, website, and internal profile links are direct | Matches plan | Low | retain | 2 | high |
| MP-15 | MP | 3.3–3.4, 11.4 | Evidence-supported generated copy | CONFLICTS WITH CURRENT PLAN | `generate-bio/index.ts:35-81` | Legacy function invents trust/professional framing from name/category/suburb | No evidence bundle or approval | Scaled unsupported content and publication risk | replace | 3 | high |
| MP-16 | MP | 4.1 | Next.js App Router/TypeScript/Tailwind/Supabase | IMPLEMENTED | `web/package.json:14-34`; `web/src/app/` | Required stack is active | None | Low | retain | 0 | high |
| MP-17 | MP | 4.2 | Cloudflare Workers/OpenNext deployment | IMPLEMENTED | `web/wrangler.jsonc`; OpenNext scripts | Full app is packaged and deployed through OpenNext | Compatibility date is old but build works | Future runtime drift | retain | 0 | high |
| MP-18 | MP | 4.3 | Runtime chosen by compatibility, no blanket Edge | IMPLEMENTED | No Edge route declarations; Node compatibility flag | Dynamic routes use OpenNext Node runtime | Matches corrected rule | Low | retain | 0 | high |
| MP-19 | MP | 4.5 | Middleware not sole sensitive control | PARTIALLY IMPLEMENTED | middleware refreshes auth; RPCs re-authorise owner | Owner writes have database checks | Dashboard reads use session and RLS, but no Ops layer exists | Future privileged actions could rely on routing only | adapt | 4 | high |
| MP-20 | MP | 5.1–5.2 | Suburb/category taxonomy tables | IMPLEMENTED | core schema lines 5-21; public index routes | Taxonomies drive routes and filtering | None for core fields | Low | retain | 2 | high |
| MP-21 | MP | 5.1, 24.1 | Decide suburb versus council taxonomy | REQUIRES PRODUCT DECISION | `darebin` coexists with actual suburb slugs | Municipality and suburb values share one table | Authority explicitly leaves decision open | Duplicate/unclear URLs and reporting | product decision required | 1 | high |
| MP-22 | MP | 5.3 | Expanded vendor information model | PARTIALLY IMPLEMENTED | Hosted/repo vendor columns listed in baseline | Core contact, publication, provenance, tier exist | Slug, approved values, lifecycle, ABN/payment detail, timestamps missing | Blocks moderation/Ops/SEO model | migrate | 1 | high |
| MP-23 | MP | 5.4 | Moderation and audit fields | MISSING | no moderation columns/table | Only `is_published` expresses visibility | Draft/review/reject/unpublish history absent | Cannot safely operate manual gate | migrate | 1 | high |
| MP-24 | MP | 5.5 | Automation records | MISSING | only email queue and cron; no job table | Jobs have no attempts/results/correlation | Cannot retry or audit automation | Operational failures become opaque | migrate | 1 | high |
| MP-25 | MP | 6.1 | Seeded listing enters pending review | CONFLICTS WITH CURRENT PLAN | `scripts/seed.ts:266,292` | New records are labelled auto-publish and set public | Opposite of locked Phase 1 flow | Direct launch-policy violation | adapt | 1 | high |
| MP-26 | MP | 6.2 | Business submission enters pending review | MISSING | no submission backend | No lifecycle exists | Required intake absent | Cannot support business-submitted dimension | migrate | 2 | high |
| MP-27 | MP | 6.3 | Claim flow retains independent publication | IMPLEMENTED DIFFERENTLY | claim RPC lines 42-84 | Immediate email-match claim preserves visibility | No pending/evidence/review/revoke path | Weak dispute handling | migrate | 5 | high |
| MP-28 | MP | 6.4, 7, 13.1 | Manual final publication in Phase 1 | CONFLICTS WITH CURRENT PLAN | seed auto-publish; AI function publishes | Two non-operator code paths can set public | Manual authority absent | Primary launch blocker | replace | 1 | high |
| MP-29 | MP | 7.1 | Public queries filter published | IMPLEMENTED | RLS plus route `.eq('is_published', true)` | Public directory and vendor pages filter visibility | Taxonomy table reads remain public as intended | Low | retain | 3 | high |
| MP-30 | MP | 7.2 | Invalid/unpublished vendor route unavailable | IMPLEMENTED | vendor query plus `notFound()` lines 41-57 | Unpublished/unknown UUID returns 404 | UUID route is mislabeled slug | Low visibility risk; URL quality remains | retain | 3 | high |
| MP-31 | MP | 7.3 | Indexability separate from publication | MISSING | no SEO eligibility field/gate | Publication alone controls sitemap/profile eligibility | Plan requires a separate SEO decision | Thin pages enter sitemap/indexing | migrate | 3 | high |
| MP-32 | MP | 8.1, 9.1 | Homepage discovery | IMPLEMENTED | home route, hero search, browse links | Homepage supports category/suburb discovery | Footer coverage is limited | Low | retain | 2 | high |
| MP-33 | MP | 8.2 | Location/category indexes | IMPLEMENTED | `/locations`, `/categories` | Both index taxonomies | No quality/count indicators | Low | retain | 2 | high |
| MP-34 | MP | 8.3–8.4 | Suburb and suburb-category routes | IMPLEMENTED | dynamic directory routes | Valid taxonomy combinations render | Empty combinations are still pages | SEO risk handled separately | retain | 2 | high |
| MP-35 | MP | 8.5, 9.3 | Useful vendor profiles | IMPLEMENTED | vendor minisite, contact/actions/profile description | Published records receive useful directory pages | Sparse profiles still use generic layout | Medium content-quality variance | retain | 2 | high |
| MP-36 | MP | 10 | Dual outbound/internal links | IMPLEMENTED | results cards lines 161-203 | Website and internal profile actions coexist | None | Low | retain | 2 | high |
| MP-37 | MP | 8.7 | Shallow navigation | PARTIALLY IMPLEMENTED | directory layout and taxonomy links | Core routes are reachable in few steps | No breadcrumb hierarchy or qualified-page counts | Discoverability and context weaker | adapt | 2 | medium |
| MP-38 | MP | 11.1–11.3 | Taxonomy-page usefulness/indexing gate | MISSING | all valid combinations render; sitemap emits combinations | Empty page shows “No Businesses Listed Yet” | No threshold, noindex, or eligibility state | Thin/doorway-page exposure | migrate | 3 | high |
| MP-39 | MP | 11.3 | Empty valid routes noindex or excluded | MISSING | no robots metadata; empty-state route remains 200 | Empty combinations are indexable by default | Plan requires state-specific handling | Crawl waste and low-value indexing | adapt | 3 | high |
| MP-40 | MP | 12.1 | Canonical URLs | PARTIALLY IMPLEMENTED | apex redirect in middleware | `www` redirects to `.com.au` | No explicit canonical metadata; sitemap fallback wrong | Canonical mismatch risk | adapt | 3 | high |
| MP-41 | MP | 12.3 | Unique factual metadata | PARTIALLY IMPLEMENTED | global, browse, vendor and combination metadata | Core dynamic titles/descriptions exist | No approved-name/quality gate and some fallback slugs | Weak/duplicate snippets | adapt | 3 | high |
| MP-42 | MP | 12.3 | Open Graph metadata | MISSING | metadata search found none | No OG images/title/description policy | Poor sharing previews | migrate | 3 | high |
| MP-43 | MP | 12.2 | Accurate JSON-LD/LocalBusiness | MISSING | no JSON-LD or LocalBusiness code | No structured data is emitted | Missed SEO feature; later accuracy work needed | migrate | 3 | high |
| MP-44 | MP | 8.6, 12.4 | Sitemap contains only useful approved canonicals | PARTIALLY IMPLEMENTED | `web/src/app/sitemap.ts` | Filters vendors by publication | Includes all taxonomy combinations, no SEO eligibility, `.com` fallback | Thin/wrong-domain URLs possible | adapt | 3 | high |
| MP-45 | MP | 11–12 | Robots/noindex controls | MISSING | no `robots.ts`, robots file, or robots metadata | Default indexability applies | Cannot protect weak/private states | Launch SEO risk | migrate | 3 | high |
| MP-46 | MP | 13.2 | Submission spam safeguards | NOT APPLICABLE YET | no submission endpoint | There is no attackable submission flow | Must be implemented with intake | Future abuse risk | investigate | 2 | high |
| MP-47 | MP | 13.3 | Dynamic-route abuse/quality limits | MISSING | no route-level quality/rate controls | Any valid taxonomy pair renders | Database taxonomy explosion could create URLs | SEO and resource abuse | migrate | 3 | medium |
| MP-48 | MP | 13.4 | Outbound URL safety | PARTIALLY IMPLEMENTED | audit enforces HTTPS; links use `noopener noreferrer` | Imported URLs are syntax-checked and opened directly | No DNS/private-IP/redirect/freshness checks | SSRF future risk; unsafe links may persist | adapt | 3 | high |
| MP-49 | MP | 14 | ABN Lookup supporting signal | CANNOT VERIFY | no code; no ABN key name in inspected env inventory | No ABN state or workflow observed | Plan says supplied GUID exists somewhere | Credential and integration state uncertain | investigate | 5 | high |
| MP-50 | MP | 15, 25 | Gemini evidence/draft integration | SUPERSEDED LEGACY IMPLEMENTATION | OpenRouter/Gemma `generate-bio` function | Writes raw fixed-length copy and publishes | Opposite of draft/evidence/manual approval model | High content/publication risk | deprecate | 3 | high |
| MP-51 | MP | 16 | Stripe checkout/webhook/subscription state | PRESENT BUT NOT WIRED | Stripe IDs/secrets; webhook HTTP 501 | No event verification or billing transition occurs | Commercial model is a stub | Premium state can drift/manual tier can mislead | adapt | 5 | high |
| MP-52 | MP | 17 | Logo optimisation/accessibility | PARTIALLY IMPLEMENTED | `compress-logo` Edge Function; no logo flow | Function attempts WebP conversion | Trigger, storage contract, auth, logo column, alt policy unverified | Media failures and inaccessible imagery | investigate | 7 | medium |
| MP-53 | MP | 18.1, 18.3 | RLS least privilege | PARTIALLY IMPLEMENTED | RLS enabled; published-only SELECT; owner update policy/RPC | Public and owner paths have useful controls | No operator policies or field-specific private model | Ops cannot be safely layered yet | adapt | 1 | high |
| MP-54 | MP | 18.2 | Server-side secret handling | PARTIALLY IMPLEMENTED | public keys in client; secret/service keys in scripts/functions | No values committed in inspected source | Local `.env.local` is untracked; missing runtime-secret verification | Deployment/integration uncertainty | retain | 0 | medium |
| MP-55 | MP | 18.4–18.5 | Audit history and retained rejection | MISSING | no audit table; claim request table dropped | Edits/claims have no durable before/after ledger | Cannot prove actor/reason/history | Compliance and rollback gap | migrate | 1 | high |
| MP-56 | MP | 19 | Monitoring and integration readiness | MISSING | no health/snapshot models | Routine state requires native dashboards/manual commands | Conflicts with operational goal | Failures may remain invisible | migrate | 6 | high |
| MP-57 | MP | 22–23 | Acceptance/regression tests | PARTIALLY IMPLEMENTED | root tests, claim test, build/lint scripts | Catalogue/claim basics have tests | No SEO, moderation, integration, Ops, route acceptance coverage | Regressions can ship silently | adapt | 8 | high |
| MP-58 | MP | 22, 23 | Automated CI gate | MISSING | no workflow files | Checks are manual | No reproducible merge/deploy gate | Dirty working tree and untested changes risk | migrate | 0 | high |

## Legacy conflicts

| Conflict | Evidence type | Affected data/routes | Migration risk | Reuse path |
|---|---|---|---|---|
| Imports automatically publish | Live script and matching tests | New `vendors`, all public routes, sitemap | Existing published imports need provenance/review backfill without mass unpublishing | Retain parser/audit/dedupe/upsert; replace insert state transition |
| AI biography publishes and fabricates fixed SEO copy | Deployable Edge Function; invocation helper | `vendors.description`, `is_published`, vendor pages | Unknown rows may contain generated content; avoid destructive bulk clearing | Retain function boundary only if rebuilt as draft/evidence job |
| Self-service claim deletes queue architecture | Applied migration and live RPC | Ownership state and `/claim` | Additive claim records must coexist with already claimed owners | Retain email-match as evidence signal, not sole final authority |
| Publication represented only by boolean | Live schema | Every vendor | Backfill listing status from boolean while preserving visibility | Retain `is_published` as final public gate |
| UUID presented as slug | Live route | All vendor URLs and sitemap | New slug rollout requires redirects and collision handling | Retain UUID as immutable internal ID |
| Root holding worker and Vercel residue | Unused/deployment artifact | Deployment comprehension | Deleting before tracked-state cleanup could lose provenance | Deprecate after repository ownership is normalised |

## Migration impact

Retain `vendors.id`, contact fields, taxonomies, `owner_id`, `is_claimed`, `tier`, Stripe IDs, `is_published`, provenance, timestamps, and catalogue identity. Add lifecycle, source enum, ownership enum, approved public fields, moderation timestamps/actors/reasons, ABN evidence, billing status, durable slug and redirects, SEO eligibility, audit history, automation jobs, and integration snapshots.

Recommended backfills:

1. Derive `listing_status = published` where `is_published = true`, otherwise classify the 21 unpublished rows through review rather than guessing draft/rejected state.
2. Map `owner_id`/`is_claimed` to claimed/unclaimed; do not infer `owner_verified`.
3. Map `tier` to free/premium only; do not infer payment success.
4. Classify source from `source_key`, `source_url`, and data-file provenance with an explicit “legacy unknown” fallback.
5. Copy current public values into approved-value fields while retaining originals and marking the migration actor.
6. Generate collision-checked slugs without replacing UUID routes until redirects are tested.
7. Add audit and operational tables additively. No destructive migration is required for the target model.

## Evidence limitations

- No production logs, Search Console, Cloudflare analytics/WAF, Stripe events, ABN service, Gemini service, or deployed Edge Function inventory was available.
- No environment values were exposed; the ABN GUID statement could not be confirmed.
- Hosted state was inspected read-only through Supabase/PostgREST, not direct schema metadata.
- “PRESENT BUT NOT WIRED” does not establish that an external account is correctly configured.
- Working-tree evidence is not fully represented by the inspected commit.

## No-data-loss ledger

All major Master Plan areas are represented: product/directory (`MP-01`–`MP-15`), technical/data architecture (`MP-16`–`MP-24`), lifecycle/publication (`MP-25`–`MP-31`), public experience (`MP-32`–`MP-37`), SEO/indexing (`MP-38`–`MP-45`), integrations/security/operations (`MP-46`–`MP-58`). The separate Ops requirements are traced in `suburbmates-ops-spec-diff.md` as `OPS-01`–`OPS-36`.

