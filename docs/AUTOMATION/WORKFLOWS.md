# Automation workflow map

## Reading this map

This is an evidence-based map of what is implemented. “Configured” means code or a workflow file exists. “Active” means the audit verified a running hosted scheduler or GitHub workflow. “Disabled” means the implementation is intentionally non-operational. “No handoff” means the reviewed output is not yet persisted into an Ops queue.

The map does not imply that a configured workflow has run successfully, or that it is authorised to change listing state.

## End-to-end map

```text
GitHub catalogue discovery and qualification handoff (active on main)
  -> OpenStreetMap / Overpass public data (weekly)
  -> Victorian liquor licences, Tax Practitioners Board and ASIC Credit Licensee approved data (scheduled by their source contracts)
  -> candidate CSV
  -> data-hygiene audit
  -> coverage report in job log
  -> 30-day CSV artefact
  -> token-protected SuburbMates handoff endpoint
  -> deterministic qualification with persistent run, evidence and audit record
  -> qualifying records become unclaimed listings; exceptions enter protected Ops

GitHub website-safety evidence (active on main)
  -> Supabase published_vendors safe projection
  -> public DNS validation + HTTPS HEAD checks
  -> JSON report artefact
  -> GitHub issue only when review is needed
  -> no database write; no listing change

GitHub production smoke (active on main; public-release route run succeeded)
  -> public site + Supabase safe projections
  -> route, sitemap, access-control, and catalogue consistency checks
  -> GitHub issue only on failure
  -> no database write

GitHub HubSpot Decision Inbox reconciliation (active on main)
  -> authenticated production endpoint
  -> one low-detail HubSpot Task per genuine protected Ops decision
  -> close mapped Tasks after terminal Ops outcomes
  -> no directory import, contact sync, publication, or database decision

Supabase internal health monitor (active Ops process; outside Automation lane)
  -> automation_jobs, listing/claim/profile-change queues
  -> integration_health records
  -> /ops/system display
  -> no listing, ownership, claim, payment, or tier change
```

## Workflow inventory

| Workflow | Trigger | Verified steps | Services / infrastructure | Output | Current status | State-changing boundary |
| --- | --- | --- | --- | --- | --- | --- |
| Repository verification | GitHub pull request; push to `main` or `codex/**` | Check out code; install Node 22 dependencies; run root checks; lint, build, and Cloudflare build for `web/` | GitHub Actions, Node.js, npm, Next.js, OpenNext/Cloudflare build tooling | Pass/fail GitHub check | **Active** | No hosted data write or deployment command |
| OpenStreetMap catalogue discovery | Monday schedule at `18:17` UTC; manual dispatch | Acquire City of Darebin commercial candidates from Overpass; when an OSM coordinate lacks a supported locality, resolve it through the official Victorian CC BY 4.0 locality boundaries; audit; report and retain the source artifact; send source-record handoffs | GitHub Actions, Node.js, npm, OpenStreetMap/Overpass, Data.gov.au Victorian locality boundaries, Cloudflare, Supabase, GitHub artifacts | One CSV artifact retained 30 days; private run and exception records in Ops | **Active on `main`; historic manual verification succeeded on 22 July 2026.** | Only an approved-source candidate that passes deterministic source, scope, category, duplicate and safety checks may create an unclaimed listing. Boundary data can supply only a precise existing locality from an OSM coordinate; it cannot create a business fact or candidate. Missing public contact details are evidence gaps, not an automatic rejection. Exceptions stay private in Ops. |
| Victorian liquor-licence discovery | Monthly on day 2 at `19:23` UTC; manual dispatch | Resolve the first-party Victorian Government XLSX, verify size and ZIP structure, parse the published header, select Darebin rows with explicit category mappings, audit and hand off source-record facts | GitHub Actions, Node.js, npm, Victorian Government open-data resource, Cloudflare, Supabase, GitHub artifacts | One candidate CSV retained 30 days; private source/evidence records in Ops | **Active on `main`; [run 33180747485](https://github.com/carlsuburbmates/suburbmates/actions/runs/33180747485) completed all 365 rows in 7m34s on 28 August 2026.** | Uses only the licensed source and its stable licence number. It never fetches business websites or images, never stores contact-form text, and cannot make ownership decisions. |
| Tax Practitioners Board catalogue discovery | Monthly on day 3 at `20:17` UTC; manual dispatch | Resolve the first-party public-register resource; retain only active Victorian organisation trading names with a non-postal Darebin business address; audit and hand off source-record facts | GitHub Actions, Node.js, npm, data.gov.au, Cloudflare, Supabase, GitHub artifacts | One candidate CSV retained 30 days; private source/evidence records in Ops | **Active on `main`; [run 33338604299](https://github.com/carlsuburbmates/suburbmates/actions/runs/33338604299) completed 268 organisation-only candidate rows on 31 August 2026.** | Individual-agent fields, individual trading names, registration numbers and dates never enter the CSV, artifact or public directory. It cannot make ownership decisions. |
| ASIC Credit Licensee catalogue discovery | Monday schedule at `19:17` UTC; manual dispatch | Resolve the approved Data.gov resource; retain only active Victorian corporate or institutional licensee names with a supported Darebin locality; audit and hand off source-record facts | GitHub Actions, Node.js, npm, Data.gov.au, Cloudflare, Supabase, GitHub artifacts | One candidate CSV retained 30 days; private source/evidence records in Ops | **Active on `main`; [run 33454493700](https://github.com/carlsuburbmates/suburbmates/actions/runs/33454493700) completed 33 organisation-only candidate rows on 1 September 2026.** | Individual licensee names, licence numbers, ABNs/ACNs, authorisations, coordinates, postcodes and postal addresses are excluded before the artifact and handoff. It cannot make ownership decisions. |
| Website-safety evidence | Monday schedule at `08:41` UTC; manual dispatch | Read `published_vendors`; validate public DNS; make DNS-pinned HTTPS `HEAD` requests; follow at most three HTTPS redirects; write a JSON report and summary | GitHub Actions, Supabase public projection, DNS, HTTPS, GitHub artifacts | JSON report retained 30 days | **Active on `main`; evidence run completed** | No listing write, automatic contact/publication decision, GitHub issue or operator task. A genuine workflow failure still fails the run. |
| Production smoke | Daily schedule at `19:23` Australia/Melbourne; manual dispatch | Check public routes; require unauthenticated Ops redirects; verify canonical redirects and invalid vendor 404; paginate safe Supabase projections; reconstruct and compare sitemap; sample a public vendor page; open/update one GitHub issue on failure | GitHub Actions, production Cloudflare site, Supabase public projections, GitHub issues | Pass/fail run; one failure issue if needed | **Active on `main`; public-release route verification is recorded** | No Supabase write; no deployment; no listing change |
| HubSpot Decision Inbox | Every 15 minutes; manual dispatch | Call the protected reconciliation endpoint; create/update one low-detail Task for genuine Ops work and close tasks whose linked work is no longer actionable | GitHub Actions, Cloudflare, HubSpot Task API | Short decision inbox only | **Active on `main`; scheduled runs passed on 7 August 2026** | Task-only one-way mirror. No HubSpot contact, company, deal, marketing, billing, directory or private-evidence sync; it cannot change SuburbMates data. |
| Internal operations health | Supabase `pg_cron`, hourly at minute 5 | Count failed and overdue automation jobs; count listings needing review, pending claims, and pending profile changes; update integration-health rows; expose them through authenticated Ops RPCs | Supabase PostgreSQL, `pg_cron`, `automation_jobs`, operator workflow tables, `/ops/system` | `integration_health` status and queue counts | **Active Ops process; outside Automation lane** | Writes health records only; never changes listings, ownership, claims, payments, publication, billing, or tier |
| Contact retention | Supabase `pg_cron`, daily at `03:17` UTC | Delete spam requests unchanged for 30 days and resolved requests unchanged for 12 months; append a retention audit event if content was deleted; update retention health | Supabase PostgreSQL, `pg_cron`, `contact_requests`, `audit_events`, `integration_health` | Retention health, deletion count, immutable audit evidence | **Active Ops process; outside Automation lane** | Deletes only eligible private contact-request content; never touches listings, ownership, claims, payments, or publication |
| On-demand path revalidation | Authenticated `POST /api/webhook/revalidate` | Require bearer token; require a path/tag; call `revalidatePath`; return response | Next.js, Cloudflare runtime secret `REVALIDATION_TOKEN` | Cache revalidation response | **Available on demand** — no scheduled caller is evidenced | Does not write listing data; changes only rendered-path cache state |
| Stripe webhook | `POST /api/webhook/stripe` | Return `501 Billing integration not configured` | Next.js / Cloudflare route | Explicit disabled response | **Disabled** | No Stripe event processing, payment write, or publication change |
| Legacy inactivity pruner | None; unscheduled by migration | Unschedule the legacy cron; record that it is disabled in integration health and audit history | Supabase PostgreSQL, `pg_cron`, `integration_health`, `audit_events` | Disabled status and audit event | **Disabled** | It cannot archive vendors or alter commercial tier |

## Workflow details and evidence

### 1. Repository verification

Source: `.github/workflows/verify.yml`.

This is build and regression automation, not business-workflow automation. Its root job runs `npm run check`. Its web job runs lint, a Next.js build with placeholder public Supabase values, and the Cloudflare build/secret scan. It has no deployment step.

### 2. Catalogue candidate discovery

Sources: `.github/workflows/catalogue-discovery.yml`, `.github/workflows/catalogue-victorian-liquor-licences.yml`, `.github/workflows/catalogue-tax-practitioners-board.yml`, `.github/workflows/catalogue-asic-credit-licensees.yml`, `scripts/acquire-openstreetmap.ts`, `scripts/acquire-victorian-liquor-licences.ts`, `scripts/acquire-tax-practitioners-board.ts`, `scripts/acquire-asic-credit-licensees.ts`, `scripts/audit-vendor-candidates.ts`, and `scripts/report-catalogue-coverage.ts`.

Verified sequence:

1. Query Overpass endpoints for commercial OpenStreetMap objects in the City of Darebin.
2. Exclude non-commercial tags and normalize the accepted candidate fields. When OSM lacks a supported `addr:suburb`, query the official Victorian CC BY 4.0 locality boundary WFS and use a containing boundary only to populate an existing locality filter; a failed boundary read keeps the broad `darebin` fallback.
3. Write `data/vendor-candidates-osm.csv` with OpenStreetMap source URL, check date, `pending_review` status, source note, and the separate locality-evidence key/URL where a boundary supplied that field.
4. Run the candidate data-hygiene audit.
5. Print coverage information in the workflow log.
6. Upload the OSM source artifact for 30 days.
7. Send the OSM candidate rows to `POST /api/automation/candidates`, authenticated by a secret held only in GitHub Actions and Cloudflare. The handoff includes the versioned `openstreetmap-candidate-v2` contract; a missing or changed version safely holds the source before any candidate or listing record is created. Exact source/artifact retries are idempotent; a later observation re-observes retained field evidence and applies only permitted empty unclaimed fields or records a private conflict.
8. Persist an idempotent handoff run, the candidate facts, normalised facts, qualification outcome, reasons, correlation and immutable audit evidence. Qualifying candidates may become unclaimed listings; exceptions remain private in `/ops/candidates`.

The Victorian liquor-licence and Tax Practitioners Board workflows follow the same authenticated source-contract handoff without reusing the OSM staging/merge sequence. Their source-specific acquisition code produces the bounded artifact described in the inventory; the Tax Practitioners Board workflow filters individual-agent data before its artifact is written.

The endpoint accepts only versioned source contracts in the private `catalogue_sources` registry, bounded payloads and a valid private token. Current automated business contracts are OpenStreetMap, the licensed Victorian liquor-licence source, the Tax Practitioners Board organisation-only register and the ASIC Credit Licensee register; the Victorian locality boundary entry is supporting evidence for OSM location resolution only. It does not accept Google or closed-directory data, does not make ownership or claim decisions, and cannot change the global public-release setting. Every applied public field receives a private source-record, observed-date and freshness evidence row. Exact source/artifact retries reuse their existing run; a later source observation requalifies against the known listing, re-observes the evidence and freshness, fills only an allowed empty unclaimed field under its deterministic source policy, and routes any disagreement into the conflict lifecycle rather than overwriting the listing.

### 3. Website-safety evidence

Sources: `.github/workflows/website-safety.yml` and `scripts/website-safety.mjs`.

For every published listing with a website, it retrieves only the safe `published_vendors` projection, validates that each DNS result is public, and performs a DNS-pinned HTTPS `HEAD` request. It allows at most three HTTPS redirects and writes `artifacts/website-safety-report.json`. DNS, certificate, redirect and timeout outcomes are retained as background evidence only: they do not write to Supabase, modify a listing, open a GitHub issue or create operator work. A genuine workflow failure still fails the run.

### 4. Production smoke

Sources: `.github/workflows/production-smoke.yml` and `scripts/production-smoke.mjs`.

It checks the public site and public database projections together: public routes, unauthenticated Ops redirects, canonical redirects, an invalid vendor route, public catalogue pagination, taxonomy eligibility, exact sitemap membership, category links, and one vendor page. A failure creates or updates one GitHub issue. It never writes to Supabase. It supports both holding and released route expectations; live public-route verification is recorded in `SUB-14`.

### 5. HubSpot Decision Inbox

Sources: `.github/workflows/hubspot-decision-inbox.yml`, `web/src/app/api/automation/hubspot-decision-inbox/route.ts`, and `docs/OPS/HUBSPOT_DECISION_INBOX.md`.

Every 15 minutes the workflow asks the protected production endpoint to reconcile only genuine pending Ops decisions. HubSpot receives a plain task title, priority and protected SuburbMates link; it never receives contact text, requester or claimant details, ABNs, evidence, media paths, audit notes, provider errors or directory-wide records. The workflow uses HubSpot Tasks only. A HubSpot failure does not block the Ops action; the next reconciliation closes a task missed during an outage.

### 6. Internal health and Ops display

Source: `supabase/migrations/20260715173000_internal_health_monitoring.sql`.

The scheduler calls `refresh_internal_operations_health()` hourly. It reports the state held in database tables; it does not observe GitHub Action runs or GitHub artifacts. Therefore an empty `automation_jobs` table can report healthy even when the GitHub-based automations have not run. `/ops/system` presents the health rows, jobs, and audit events to an authenticated active operator. Main classifies this as a narrow, audited Ops process outside the Automation lane; it must never affect listings, ownership, claims, payments, or publication.

### 7. Contact retention

Source: `supabase/migrations/20260716122000_automate_contact_retention.sql`.

This is intentionally narrower than general data pruning. It deletes only private contact-request content after the stated spam/resolution retention periods and retains an audit record without the deleted message content. Main classifies it as a narrow, audited Ops retention process outside the Automation lane; it must never affect listings, ownership, claims, payments, or publication.

## Explicitly absent or disabled automation

| Area | Actual implementation state | Consequence |
| --- | --- | --- |
| Candidate artifact to Ops review queue | Implemented; full manual verification accepted | Every approved-source row has private receipt/qualification evidence. Exceptions remain available for normal protected Ops review. |
| Job execution and retry | Candidate handoff produces a persisted source/artifact run and job record; exact retries reuse that run, while a later source observation safely refreshes prior qualified evidence | An interrupted request cannot falsely report success or duplicate evidence; an actual later source observation cannot leave the catalogue falsely fresh or silently overwrite it. |
| Stripe billing | Webhook returns `501` | No payment or subscription automation exists |
| Bulk ABR/ABN lookup | Disabled | No ABN automation exists |
| AI publication | Disabled | AI cannot create public facts or publish listings |
| Media/logo processing | Deferred/disabled | No automated media processing exists |
| Legacy inactivity pruning | Unscheduled | No automatic vendor tier/archive change exists |

## Service and authority boundaries

| Service | Automation role | Prohibited role |
| --- | --- | --- |
| GitHub Actions | Run checks, collect safe evidence, retain artifacts, and call the token-protected approved-source candidate handoff | Bypass deterministic qualification, decide ownership or claims, or publish raw/exception candidates |
| Supabase | Hold operational health, audit, and approved workflow data; run narrow internal schedules | Let automation bypass operator authorisation |
| Cloudflare / Next.js | Serve protected event routes and the production site | Store server secrets in source or grant client authority |
| Approved source providers (OpenStreetMap / Overpass, Victorian liquor licences, Tax Practitioners Board) | Provide only their bounded, versioned candidate-source facts | Establish publication or ownership legitimacy on their own, contribute prohibited personal or closed-directory data, or override owner-confirmed facts |
| GitHub Issues | Surface one actionable exception | Replace the authenticated Ops queue or decide a listing |
| HubSpot | Mirror a short, low-detail decision inbox | Read or write contacts, companies, deals, marketing, billing, directory records, private evidence, or SuburbMates state |
| Stripe, ABR, AI, media services | None while disabled | Change public listing state |

## Candidate handoff acceptance boundary

The handoff is intentionally narrower than general automation. It retains source provenance and exceptions, never ingests an unapproved source, and never makes ownership or claim decisions. Public release remains independent: a qualified record can be public only while the global launch gate is enabled. Initial OSM technical handoff acceptance was verified by the successful 22 July full run; later source contracts have their own controlled and live run evidence. Routine private exclusions remain quiet background evidence. A genuine ambiguity may require a constrained directory decision, but that review is not an automation authority to publish raw or uncertain candidates.
