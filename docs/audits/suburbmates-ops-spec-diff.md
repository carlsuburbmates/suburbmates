# SuburbMates Unified Operations Specification diff

- Audit date: 15 July 2026 (Australia/Melbourne)
- Inspected branch: `main`
- Inspected commit: `8f639e11a360721a3f6107154500932213c9503a`
- Repository root: `/Users/carlg/Documents/AI-Coding/suburbmates`
- Authoritative documents: `docs/REFERENCE/SuburbMates — Corrected Master Architecture and Execution Plan.md`; `docs/REFERENCE/SuburbMates — Unified Operations Specification.md`
- Audit constraint: no implementation changes were made. This report is documentation only.

## `/ops` determination

No `/ops` route, equivalent operator application, operator role, operator allowlist, or protected operational API exists. The authenticated `/dashboard` is a business-owner profile editor, not an operator console: it reads vendors owned by the signed-in user and lets that owner edit public fields (`web/src/app/(directory)/dashboard/page.tsx:7-85`; `ProfileEditor.tsx:31-55`). It must not be reclassified as Ops.

## Status summary

| Status | Count |
|---|---:|
| IMPLEMENTED | 0 |
| PARTIALLY IMPLEMENTED | 1 |
| PRESENT BUT NOT WIRED | 1 |
| IMPLEMENTED DIFFERENTLY | 0 |
| MISSING | 31 |
| CONFLICTS WITH CURRENT PLAN | 2 |
| SUPERSEDED LEGACY IMPLEMENTATION | 0 |
| NOT APPLICABLE YET | 1 |
| CANNOT VERIFY | 0 |
| REQUIRES PRODUCT DECISION | 0 |
| **Total** | **36** |

`OPS` means the Unified Operations Specification.

## Traceability matrix

| ID | Source | Section | Requirement | Status | Repository evidence | Actual observed behavior | Difference | Risk/consequence | Disposition | Phase | Confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OPS-01 | OPS | 8 | `/ops` route | MISSING | no matching route/file | Operator console does not exist | Entire route architecture absent | Routine operations cannot use one system | migrate | 4 | high |
| OPS-02 | OPS | 19.1 | Supabase-authenticated Ops access | MISSING | owner login exists; no Ops login/route | Auth serves owners only | No operator access boundary | Privileged surface cannot be launched | migrate | 4 | high |
| OPS-03 | OPS | 4, 19.2 | Authorised operator identity and server authorisation on every read/mutation | MISSING | no operator role/allowlist/policies | No privileged reads or mutations exist | Required role and enforcement absent | Critical privilege-escalation risk if UI is added first | migrate | 4 | high |
| OPS-04 | OPS | 19.3 | RLS defence in depth | PARTIALLY IMPLEMENTED | existing vendor RLS and owner RPC checks | Public/owner access is constrained | No operator RLS, helper function, or privileged view policy | Ops could bypass intended separation | adapt | 1 | high |
| OPS-05 | OPS | 8.2, 19.5 | Ops noindex | MISSING | no Ops route or robots metadata | No protection exists | Must accompany route creation | Private URLs could be indexed | migrate | 4 | high |
| OPS-06 | OPS | 8.2 | Ops sitemap exclusion | NOT APPLICABLE YET | sitemap has no `/ops`; route absent | Current sitemap cannot include absent route | Must remain excluded when built | Future accidental exposure | retain | 4 | high |
| OPS-07 | OPS | 8 | Directory-first Ops navigation | MISSING | no Ops UI | No Overview/Listings/Claims/Payments/SEO/System | IA absent | Operators remain dependent on tools/scripts | migrate | 4 | high |
| OPS-08 | OPS | 9 | Attention-led Overview | MISSING | no Ops UI/aggregates | No priority cards or operational metrics | Required home view absent | Exceptions are invisible | migrate | 4 | high |
| OPS-09 | OPS | 10 | Listing queues and lifecycle views | MISSING | no lifecycle columns or Ops route | Only public browse/owner dashboard exist | No review/published/rejected/unpublished/stale queues | Manual publication cannot operate | migrate | 4 | high |
| OPS-10 | OPS | 10.3–10.5 | Ops filters, sorting, and search | MISSING | public browse filters only name/suburb/category | No operator search dimensions | ABN/payment/source/risk/state search absent | Slow and incomplete triage | migrate | 4 | high |
| OPS-11 | OPS | 11.1–11.6 | Listing decision workspace with evidence panels | MISSING | provenance columns exist; no workspace | Source facts are stored but not reviewed centrally | Website/ABN/Stripe evidence panels absent | Decisions cannot be evidence-led | migrate | 4 | high |
| OPS-12 | OPS | 6.1, 11.3, 11.8 | Original versus approved values | MISSING | one set of mutable vendor fields | Owner edits overwrite current values | No immutable source/submitted snapshot | Evidence and rollback are lost | migrate | 1 | high |
| OPS-13 | OPS | 11.4 | Website checks and safe preview | MISSING | URL syntax audit only | No resolved-domain/access/name/location record | Required evidence absent | Unsafe or irrelevant destinations persist | migrate | 6 | high |
| OPS-14 | OPS | 6.3, 11.5 | ABN result storage and panel | MISSING | no ABN code/table/fields | No check or neutral “not provided” state | Integration absent | Operator may rely on external dashboard/manual memory | migrate | 5 | high |
| OPS-15 | OPS | 6.5, 11.6 | Stripe status panel | MISSING | two Stripe IDs/tier only | No payment/subscription/freshness state | Cannot distinguish paid, failed, cancelled | Premium presentation can drift | migrate | 5 | high |
| OPS-16 | OPS | 6.6, 11.7 | AI draft/warning/evidence panel | MISSING | legacy function writes directly to description | No drafts, warnings, model/prompt history | Required operator approval absent | Unsupported copy can become public | replace | 5 | high |
| OPS-17 | OPS | 11.9 | Slug preview, collision and redirects | MISSING | vendor URL uses UUID | No current/proposed slug or redirect history | Entire lifecycle absent | URL migration can break links | migrate | 3 | high |
| OPS-18 | OPS | 11.10, 18 | Listing history | MISSING | no audit/history table | Claims and edits mutate current row only | No timeline or prior values | Decisions cannot be reconstructed | migrate | 1 | high |
| OPS-19 | OPS | 12.1 | Save Draft action | MISSING | no listing lifecycle/ops mutation | No operator draft save exists | Required action absent | Review work cannot be staged | migrate | 4 | high |
| OPS-20 | OPS | 12.2 | Approve & Publish action | MISSING | no operator RPC; scripts publish | No re-authorised audited manual action | Publication authority is outside Ops | Primary Ops blocker | replace | 4 | high |
| OPS-21 | OPS | 12.3 | Reject with retained reason | MISSING | no rejected state/reason | No rejection operation exists | Required retention absent | Operators may resort to deletion/manual edits | migrate | 4 | high |
| OPS-22 | OPS | 12.4 | Unpublish with reason and history | MISSING | boolean exists; no action/history | Can only be changed through privileged ad hoc tooling | No audited workflow | Public corrections are unsafe | migrate | 4 | high |
| OPS-23 | OPS | 12.5 | Restore for Review | MISSING | no listing state machine | No restoration transition | Rejected/unpublished rows cannot re-enter review cleanly | Operational dead end | migrate | 4 | high |
| OPS-24 | OPS | 12.6, 17 | Retry supported checks | MISSING | no job model | No idempotent retry action | Failures require manual external intervention | Repeated errors and duplicate effects | migrate | 6 | high |
| OPS-25 | OPS | 13.1–13.2 | Claim queue and evidence detail | MISSING | claim request table explicitly dropped | Only matching-email candidates are shown to claimant | No operator claim view | Ownership conflicts cannot be managed | migrate | 5 | high |
| OPS-26 | OPS | 13.3–13.5 | Request info/approve/reject/revoke claim | CONFLICTS WITH CURRENT PLAN | claim RPC immediately sets owner | Email match is final authority | Authoritative workflow requires queued decisions | Fraud/dispute/revocation gap | migrate | 5 | high |
| OPS-27 | OPS | 14 | Payment views and reconciliation | MISSING | no billing state/jobs/views | No premium/payment issue/cancelled/reconciliation queues | Entire commercial operation absent | Paid benefits cannot be trustworthy | migrate | 5 | high |
| OPS-28 | OPS | 7.1, 14 | Verified Stripe webhook state | PRESENT BUT NOT WIRED | webhook returns 501 | No signature check/event processing | Endpoint exists only as stub | False sense of readiness | replace | 5 | high |
| OPS-29 | OPS | 15 | SEO Ops views/actions | MISSING | public sitemap only | No inspection/search/sitemap snapshot or action | Search Console remains external/manual | Indexing faults are invisible | migrate | 6 | high |
| OPS-30 | OPS | 16 | Cloudflare traffic/security summaries | MISSING | deployment config only | No sampled analytics/security ingestion | No operational security view | Abuse and Worker failures lack context | migrate | 6 | high |
| OPS-31 | OPS | 6.7, 17.1–17.2 | Automation job records and failed-job queue | MISSING | email queue/cron only | No generic job status, attempts or correlation | No health/retry model | Silent failures | migrate | 2 | high |
| OPS-32 | OPS | 6.12, 18 | Global audit log | MISSING | hosted `audit_logs` absent | No actor/action/reason/before-after ledger | Required auditability absent | High operational and data-loss risk | migrate | 1 | high |
| OPS-33 | OPS | 6.11, 17.3 | Integration-health records | MISSING | hosted `integration_health` absent | No last success/next expected/failure state | Routine status requires native dashboards | Stale data appears current | migrate | 6 | high |
| OPS-34 | OPS | 1–3, 22 | Routine operation without native dashboards | MISSING | scripts plus external accounts | Catalogue tasks require local commands; integrations require providers | Unified operating outcome absent | High operator burden and fragmented truth | migrate | 6 | high |
| OPS-35 | OPS | 20 | Freshness and failure presentation | MISSING | no snapshot/freshness fields | UI cannot label delayed/stale/sync failed | Failures can look like empty data | Incorrect decisions | migrate | 6 | high |
| OPS-36 | OPS | 3.3, 7, 20.3, 21 | Fail-safe workflows never auto-publish | CONFLICTS WITH CURRENT PLAN | seed and AI function set `is_published = true` | Import/AI success can make rows public | Manual publication is bypassed | Primary launch and Ops blocker | replace | 1 | high |

## Access and security conclusion

The owner dashboard demonstrates reusable Supabase SSR/session and database-RPC patterns, but it is not a safe starting point for simply adding operator buttons. Ops requires an explicit operator identity model, server-side authorisation on every query and mutation, RLS defence, auditable security-definer functions or server actions, noindex, and sitemap exclusion. Middleware may refresh sessions and redirect canonical hosts; it must not be the authority for privileged access.

## Preservation assessment

Retain Supabase Auth, SSR clients, session refresh, owner-scoped RLS/RPC examples, provenance fields, `is_published` as the final public gate, Cloudflare/OpenNext deployment, and the public profile links Ops can later reference. Build Ops as a protected area over additive operational tables and explicit transitions. Do not repurpose the owner dashboard or delete current claims until claim migration and already-claimed ownership backfills are verified.

## Evidence limitations

- No production operator system exists to test.
- No external Stripe, Search Console, Cloudflare analytics/WAF, ABN, Gemini, or production-log data was available.
- Hosted planned-table absence was confirmed through PostgREST row queries, not direct `information_schema` access.
- The initial operator identity/allowlist mechanism is an unresolved implementation decision in the authority.
- No secret values were inspected.

## No-data-loss ledger

All Ops areas are traced: access/security (`OPS-01`–`OPS-06`), information architecture/overview (`OPS-07`–`OPS-08`), listing queues/workspace/actions (`OPS-09`–`OPS-24`), claims (`OPS-25`–`OPS-26`), payments (`OPS-27`–`OPS-28`), SEO/security/system health (`OPS-29`–`OPS-35`), and fail-safe operating workflows (`OPS-36`). Master Plan dependencies appear in `suburbmates-master-plan-diff.md`.

