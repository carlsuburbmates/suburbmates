# SuburbMates preservation-first migration plan

- Audit date: 15 July 2026 (Australia/Melbourne)
- Inspected branch: `main`
- Inspected commit: `8f639e11a360721a3f6107154500932213c9503a`
- Repository root: `/Users/carlg/Documents/AI-Coding/suburbmates`
- Authoritative documents: `docs/REFERENCE/SuburbMates — Corrected Master Architecture and Execution Plan.md`; `docs/REFERENCE/SuburbMates — Unified Operations Specification.md`
- Audit constraint: no implementation changes were made. This report is documentation only.

## Migration principles

1. Preserve the 1,621 hosted listings and current public URLs throughout migration.
2. Add state before changing behavior; backfill before enforcing constraints.
3. Keep `is_published` as the final public gate while introducing richer lifecycle and SEO states.
4. Never infer ABN, payment, owner verification, rejection reasons, or review approval from unrelated fields.
5. Do not bulk unpublish the 1,600 public listings solely because the new model is richer; classify legacy state explicitly and apply new manual publication to new/reviewed work.
6. Do not remove claim, UUID-route, import, or legacy integration code until replacement behavior and data migration are verified.
7. Every privileged mutation should be server-authorised, transactional where practical, and audited.

## Phase 0 — Safety and repository verification

- Outcome: reproducible baseline and controlled delivery path.
- Included gaps: `GAP-17`; prerequisites for all others.
- Existing work retained: current working tree, two npm workspaces, Cloudflare/OpenNext deployment, hosted Supabase, tests, data files.
- Changes required: first reconcile why most implementation files are untracked at `HEAD`; establish tracked source ownership; inventory migrations applied remotely; add CI for typecheck, lint, catalogue tests, web build, and migration checks; document environment names without values.
- Dependencies: repository-owner confirmation before committing pre-existing work.
- Risks: sweeping staging could mix unrelated changes; commit metadata currently understates the system.
- Acceptance tests: clean clone reproduces root tests and `web` build; CI runs the same commands; deployed Worker config is derived from tracked files.
- Rollback: documentation/CI additions are removable; do not change production or database in this phase.

## Phase 1 — Data-model alignment

- Outcome: additive state model supporting manual moderation, auditability, jobs, and future Ops.
- Included gaps: `GAP-03`, `GAP-07`.
- Existing work retained: vendor IDs, public/contact fields, `owner_id`, `is_claimed`, `tier`, Stripe IDs, publication boolean, provenance, taxonomies, RLS.
- Changes required: add listing/source/ownership/ABN/commercial/payment/subscription states; approved/original fields; moderation timestamps/reasons/actors; slugs and redirect history; audit log; automation jobs; integration health; evidence/snapshot tables.
- Dependencies: locked enum vocabulary; decisions on geographic taxonomy, operator identity, rejected-data retention, and slug policy.
- Risks: inaccurate backfills could falsely claim review, payment, ABN, or ownership verification.
- Acceptance tests: all existing rows survive; 1,600 remain public and 21 remain unpublished; no row acquires unsupported verification/payment claims; RLS tests cover public, owner, operator, and service roles.
- Rollback: keep additions nullable or safely defaulted initially; retain old columns and public queries until dual-read verification passes.

## Phase 2 — Directory-model alignment

- Outcome: every acquisition path produces a reviewable listing without losing source evidence.
- Included gaps: `GAP-01`, business submission and source-state portions of `GAP-03`.
- Existing work retained: OSM acquisition, CSV staging, audit, address-aware merge, paginated preload, nonblank enrichment, source keys.
- Changes required: replace new-row auto-publication with draft/pending-review creation; add explicit listing source; create business submission intake with abuse controls; preserve existing publication on enrichment; emit duplicate and import-run reports.
- Dependencies: Phase 1 lifecycle/source fields; submission product fields and rate-limit/CAPTCHA choice.
- Risks: import changes could duplicate or accidentally unpublish existing rows.
- Acceptance tests: new import stays non-public; existing published record remains public after nonblank enrichment; same name/different address remains distinct; blanks never erase owner-approved values; every row has source evidence.
- Rollback: feature-flag new intake/import transition; retain dry-run and old parser; rollback behavior without dropping new state columns.

## Phase 3 — Publication and SEO safeguards

- Outcome: manual Phase 1 publication and separate index eligibility govern every public URL.
- Included gaps: `GAP-02`, `GAP-04`, `GAP-05`, `GAP-14`, `GAP-15`.
- Existing work retained: `is_published` RLS, public route filters, `notFound()`, minisites, taxonomy routes, direct links, sitemap generator, UUID IDs.
- Changes required: disable AI/import publication; add explicit publish transition; add SEO eligibility; implement canonical `.com.au`, robots/noindex, OG, accurate JSON-LD, taxonomy thresholds, qualified sitemap rules, safe URL checks; introduce slugs alongside UUID aliases and redirects.
- Dependencies: Phase 1 approved values/audit; taxonomy threshold and slug decisions.
- Risks: URL changes, sitemap churn, incorrect structured data, accidental deindexing.
- Acceptance tests: only operator-published rows become public; publication does not imply claim/ABN/payment; empty/weak combinations are noindex and absent from sitemap; old UUID URLs redirect or remain valid per decision; JSON-LD contains only stored evidence.
- Rollback: maintain UUID route and prior sitemap endpoint during staged comparison; feature-flag new slug/canonical behavior; do not delete redirect history.

## Phase 4 — Core Ops listing workflows

- Outcome: protected `/ops` supports review and publication without native Supabase use.
- Included gaps: `GAP-06`, `GAP-08`, `GAP-09`.
- Existing work retained: Supabase Auth/SSR clients, middleware session refresh, owner RPC authorisation pattern, public profile links.
- Changes required: operator role/allowlist; server-side guards; operator RLS; noindex; Ops shell/IA; overview; listing queues/detail; Save Draft, Approve & Publish, Reject, Unpublish, Restore, Retry actions; reason and before/after audit entries.
- Dependencies: Phases 1–3; operator identity decision.
- Risks: middleware-only checks, overly broad service-role use, inconsistent concurrent actions.
- Acceptance tests: unauthenticated/non-operator requests fail on every read/mutation; direct API calls cannot bypass UI; transitions preserve source/original values; publication atomically updates status, audit, revalidation, and SEO eligibility.
- Rollback: gate `/ops` behind an allowlist/feature flag; keep catalogue scripts read-only during cutover; reversible state transitions replace deletion.

## Phase 5 — Claims and commercial-state integration

- Outcome: claim and payment state become reviewable, independent, and reconcilable.
- Included gaps: `GAP-10`, `GAP-11`, `GAP-12` ABN/AI listing-detail panels.
- Existing work retained: existing claimed owners, OTP login, matching-email logic as evidence, owner update RPC, Stripe identifiers/tier fields.
- Changes required: additive claim records/queue; request-info/approve/reject/revoke; claim audit; verified/idempotent Stripe webhook; billing state/reconciliation; ABN event checks; AI draft/evidence records; Ops panels/actions.
- Dependencies: operator actions/audit/jobs; claim, ABN fuzzy-match, premium-benefit decisions; confirmed provider credentials.
- Risks: displacing legitimate current owners, duplicate Stripe events, payment-driven publication, AI overwriting approved copy.
- Acceptance tests: claim decisions never alter publication; payment never publishes; cancelled/failed premium loses only benefits; webhook duplicates are harmless; no ABN is neutral; AI output remains draft until operator approval.
- Rollback: shadow-write new claim/billing records first; preserve `owner_id`, tier, and Stripe IDs; disable integrations independently without losing local history.

## Phase 6 — SEO, Cloudflare, and system-health integrations

- Outcome: `/ops` presents scheduled, freshness-labelled provider snapshots and exception queues.
- Included gaps: `GAP-13`.
- Existing work retained: Cloudflare deployment, public sitemap, revalidation route, automation-job foundation.
- Changes required: Search Console analytics/sitemap/inspection jobs; Cloudflare sampled traffic/security summaries; integration-health/freshness states; failed-job queue; safe retries/idempotency/correlation IDs; operational alerts.
- Dependencies: provider authorisation; Phase 1 snapshot/jobs; Ops security.
- Risks: quota exhaustion, sampled data presented as exact, browser-triggered provider calls, stale data shown as current.
- Acceptance tests: page loads read local snapshots; provider syncs are queued/scheduled; freshness and errors are visible; retries are idempotent; Search Console data is not described as live index truth.
- Rollback: pause individual sync jobs and retain last successful snapshot with explicit stale status.

## Phase 7 — Cleanup of proven legacy code

- Outcome: only verified replacements remain, with repository structure reflecting the actual system.
- Included gaps: legacy portions of `GAP-02`, `GAP-16`, root worker/Vercel residue.
- Existing work retained: any reusable media-processing or prompt/evidence logic proven safe by tests.
- Changes required: deprecate/remove legacy `generate-bio` after draft pipeline migration; decide and complete media flow; remove holding worker and Vercel residue only after active deployment ownership is proven; update handover/docs.
- Dependencies: replacement acceptance and repository tracking normalisation.
- Risks: deleting a still-referenced function/config or losing provenance.
- Acceptance tests: repository-wide references are absent; deployed routes and jobs work without legacy files; generated descriptions and publication history remain preserved/auditable.
- Rollback: deprecate and disable before deletion; retain tags/commit history and reversible deployment versions.

## Phase 8 — Acceptance and regression verification

- Outcome: locked Master and Ops acceptance criteria pass with evidence.
- Included gaps: `GAP-17`, validation of `GAP-01`–`GAP-16`; `GAP-18` remains deferred.
- Existing work retained: root tests, claim test patterns, build/lint, live route verification, catalogue verifier.
- Changes required: authority-traceable acceptance suite; migration count checks; RLS/authorisation tests; lifecycle transition tests; claim/payment independence; SEO snapshots; Cloudflare preview and live smoke tests; rollback rehearsal.
- Dependencies: Phases 1–7 complete.
- Risks: treating UI presence as backend proof or passing tests against mocks only.
- Acceptance tests: each `MP-*` and `OPS-*` row is reclassified from current evidence; zero unresolved launch/Ops blockers; live and hosted state match; no secrets appear in output.
- Rollback: retain previous Worker version and additive database compatibility until post-release observation is complete.

## Deferred Phase 3+ autonomy

`GAP-18` must remain deferred. Any future automatic-publication policy requires a new product decision, measurable evidence quality, audited confidence/exception rules, a kill switch, and a proven rollback path. The Phase 1 migration must not quietly create this capability.

## Evidence limitations

- This sequence was derived from repository and read-only hosted evidence; provider-specific implementation details require current account/API verification.
- It does not estimate hours.
- It does not classify the 21 unpublished vendors because no authoritative reason/history exists.
- Rollback descriptions are architectural requirements, not proof that backups or provider rollback settings currently exist.
- No implementation or production changes were made.

## No-data-loss ledger

Phases 0–3 cover Master requirements `MP-01`–`MP-58`; Phases 4–6 cover Ops requirements `OPS-01`–`OPS-36`; Phase 7 removes only replacements proven by those matrices; Phase 8 re-verifies every matrix row. The gap mapping is explicit in each phase and in `suburbmates-gap-register.md`.

