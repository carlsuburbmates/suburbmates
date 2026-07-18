# Automation workflow map

## Reading this map

This is an evidence-based map of what is implemented. “Configured” means code or a workflow file exists. “Active” means the audit verified a running hosted scheduler or GitHub workflow. “Disabled” means the implementation is intentionally non-operational. “No handoff” means the reviewed output is not yet persisted into an Ops queue.

The map does not imply that a configured workflow has run successfully, or that it is authorised to change listing state.

## End-to-end map

```text
GitHub catalogue discovery (active on main; repaired run pending)
  -> OpenStreetMap / Overpass public data
  -> candidate CSV
  -> data-hygiene audit
  -> merge with curated CSV
  -> coverage report in job log
  -> 30-day CSV artefact
  -> no database write; no Ops candidate handoff

GitHub website-safety evidence (active on main)
  -> Supabase published_vendors safe projection
  -> public DNS validation + HTTPS HEAD checks
  -> JSON report artefact
  -> GitHub issue only when review is needed
  -> no database write; no listing change

GitHub production smoke (active on main; repaired run pending)
  -> public site + Supabase safe projections
  -> route, sitemap, access-control, and catalogue consistency checks
  -> GitHub issue only on failure
  -> no database write

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
| Catalogue candidate discovery | Monday schedule at `18:17` UTC; manual dispatch | Acquire City of Darebin commercial candidates from Overpass; audit; merge with curated candidates; audit again; print coverage report; upload OSM and merged CSVs | GitHub Actions, Node.js, npm, OpenStreetMap/Overpass, repository CSV files, GitHub artifacts | Two CSV artifacts retained 30 days | **Active on `main`; repair pending promotion** — controlled run failed only because CI had no `.env.local` | No seed command, Supabase write, or publication command |
| Website-safety evidence | Monday schedule at `08:41` UTC; manual dispatch | Read `published_vendors`; validate public DNS; make DNS-pinned HTTPS `HEAD` requests; follow at most three HTTPS redirects; write JSON report; fail when review is required; open/update one GitHub issue on failure | GitHub Actions, Supabase public projection, DNS, HTTPS, GitHub artifacts/issues | JSON report retained 30 days; one review issue if flagged | **Active on `main`; evidence run completed** — 588 checked, 86 flagged for review | No listing write; no automatic contact or publication decision |
| Production smoke | Daily schedule at `19:23` Australia/Melbourne; manual dispatch | Check public routes; require unauthenticated Ops redirects; verify canonical redirects and invalid vendor 404; paginate safe Supabase projections; reconstruct and compare sitemap; sample a public vendor page; open/update one GitHub issue on failure | GitHub Actions, production Cloudflare site, Supabase public projections, GitHub issues | Pass/fail run; one failure issue if needed | **Active on `main`; repair pending promotion** — controlled run used directory checks against the intentional holding page | No Supabase write; no deployment; no listing change |
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

Sources: `.github/workflows/catalogue-discovery.yml`, `scripts/acquire-openstreetmap.ts`, `scripts/audit-vendor-candidates.ts`, `scripts/merge-vendor-catalogues.ts`, and `scripts/report-catalogue-coverage.ts`.

Verified sequence:

1. Query Overpass endpoints for commercial OpenStreetMap objects in the City of Darebin.
2. Exclude non-commercial tags and normalize the accepted candidate fields.
3. Write `data/vendor-candidates-osm.csv` with OpenStreetMap source URL, check date, `pending_review` status, and source note.
4. Run the candidate data-hygiene audit.
5. Merge OSM candidates with `data/vendor-candidates.csv`, retaining manual data and source notes where records deduplicate.
6. Audit `data/vendor-candidates-merged.csv`.
7. Print coverage information in the workflow log.
8. Upload the OSM and merged CSVs as 30-day GitHub artifacts.

The workflow deliberately does not run `seed`, does not call Supabase, and does not publish a listing. Its first controlled run failed before acquisition because CI had no `.env.local`. Commit `92eef2f` makes that file optional and awaits Main promotion. Import of these artifacts into an authenticated `/ops` candidate review queue is deliberately deferred: it is not a requirement of the current evidence-only workflow.

### 3. Website-safety evidence

Sources: `.github/workflows/website-safety.yml` and `scripts/website-safety.mjs`.

For every published listing with a website, it retrieves only the safe `published_vendors` projection, validates that each DNS result is public, and performs a DNS-pinned HTTPS `HEAD` request. It allows at most three HTTPS redirects. It writes `artifacts/website-safety-report.json` and opens or updates one GitHub issue if a result needs review. It does not write to Supabase or modify a listing. The controlled run checked 588 websites, retained its report for 30 days, and flagged 86 for review in [issue #3](https://github.com/carlsuburbmates/suburbmates/issues/3).

### 4. Production smoke

Sources: `.github/workflows/production-smoke.yml` and `scripts/production-smoke.mjs`.

It checks the public site and public database projections together: public routes, unauthenticated Ops redirects, canonical redirects, an invalid vendor route, public catalogue pagination, taxonomy eligibility, exact sitemap membership, category links, and one vendor page. A failure creates or updates one GitHub issue. It never writes to Supabase. The first controlled run failed because it expected the unfinished public contact route while the approved holding page was live. Commit `92eef2f` adds a holding-page check and awaits Main promotion.

### 5. Internal health and Ops display

Source: `supabase/migrations/20260715173000_internal_health_monitoring.sql`.

The scheduler calls `refresh_internal_operations_health()` hourly. It reports the state held in database tables; it does not observe GitHub Action runs or GitHub artifacts. Therefore an empty `automation_jobs` table can report healthy even when the GitHub-based automations have not run. `/ops/system` presents the health rows, jobs, and audit events to an authenticated active operator. Main classifies this as a narrow, audited Ops process outside the Automation lane; it must never affect listings, ownership, claims, payments, or publication.

### 6. Contact retention

Source: `supabase/migrations/20260716122000_automate_contact_retention.sql`.

This is intentionally narrower than general data pruning. It deletes only private contact-request content after the stated spam/resolution retention periods and retains an audit record without the deleted message content. Main classifies it as a narrow, audited Ops retention process outside the Automation lane; it must never affect listings, ownership, claims, payments, or publication.

## Explicitly absent or disabled automation

| Area | Actual implementation state | Consequence |
| --- | --- | --- |
| Candidate artifact to Ops review queue | Deliberately deferred | Candidate CSVs remain GitHub artifacts by design. No operator queue entry, persisted provenance, job, or audit event is created by the current evidence-only workflow |
| Job execution and retry | No job producer or retry action implemented | `automation_jobs` can be displayed but does not currently receive GitHub workflow results or support a retry |
| Stripe billing | Webhook returns `501` | No payment or subscription automation exists |
| Bulk ABR/ABN lookup | Disabled | No ABN automation exists |
| AI publication | Disabled | AI cannot create public facts or publish listings |
| Media/logo processing | Deferred/disabled | No automated media processing exists |
| Legacy inactivity pruning | Unscheduled | No automatic vendor tier/archive change exists |

## Service and authority boundaries

| Service | Automation role | Prohibited role |
| --- | --- | --- |
| GitHub Actions | Run checks, collect safe evidence, retain artifacts, and open one exception issue | Write to Supabase or publish a listing |
| Supabase | Hold operational health, audit, and approved workflow data; run narrow internal schedules | Let automation bypass operator authorisation |
| Cloudflare / Next.js | Serve protected event routes and the production site | Store server secrets in source or grant client authority |
| OpenStreetMap / Overpass | Provide candidate-source data | Establish publication or ownership legitimacy on its own |
| GitHub Issues | Surface one actionable exception | Replace the authenticated Ops queue or decide a listing |
| Stripe, ABR, AI, media services | None while disabled | Change public listing state |

## Future optional Ops handoff

Candidate discovery is complete for the current evidence-only scope without an Ops import. If Main later chooses to introduce one, it needs an approved design for a safe, auditable transfer from the GitHub artifact into `/ops`. It must retain source provenance and exceptions, create no public listing, require the active operator for any final decision, and leave immutable audit evidence.
