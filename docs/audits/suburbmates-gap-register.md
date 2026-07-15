# SuburbMates implementation gap register

- Audit date: 15 July 2026 (Australia/Melbourne)
- Inspected branch: `main`
- Inspected commit: `8f639e11a360721a3f6107154500932213c9503a`
- Repository root: `/Users/carlg/Documents/AI-Coding/suburbmates`
- Authoritative documents: `docs/REFERENCE/SuburbMates — Corrected Master Architecture and Execution Plan.md`; `docs/REFERENCE/SuburbMates — Unified Operations Specification.md`
- Audit constraint: no implementation changes were made. This report is documentation only.

## Counts

- Launch blockers: **5**
- Ops blockers: **8**
- Important non-blockers: **4**
- Future enhancements: **1**
- Total prioritised gaps: **18**

## Prioritised register

| ID | Gap | Plan source | Current state | User-facing impact | SEO impact | Security impact | Data-migration impact | Dependency | Phase | Complexity | Blocking status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| GAP-01 | New imports auto-publish | MP 6–7; OPS 3.3/21 | `scripts/seed.ts` sets `is_published=true` | Unreviewed/inaccurate businesses can appear | Unreviewed pages become indexable/sitemap eligible | Privileged script bypasses human gate | Backfill listing state/source for existing rows | lifecycle schema | 1 | medium | launch blocker |
| GAP-02 | Legacy AI function generates unsupported fixed copy and publishes | MP 3.4/15; OPS 6.6/20.3 | OpenRouter function writes description and publication | Residents may see invented claims | Scaled/low-evidence content risk | Service-role function has material write authority | Identify generated descriptions before controlled deprecation | audit log, AI draft model | 3 | medium | launch blocker |
| GAP-03 | No independent listing/moderation/publication state | MP 2.3/5/6; OPS 5/12 | Boolean visibility plus claim/tier only | Operators cannot express draft/rejected/unpublished reasons | Indexability follows a coarse boolean | No audited approval authority | Add fields and backfill 1,621 rows without guessing 21 unpublished states | product state definitions | 1 | large | launch blocker |
| GAP-04 | Publication is not separate from SEO eligibility | MP 7.3/11–12 | Sitemap uses publication only; empty taxonomy pages render 200 | Residents reach empty pages | Thin pages and wrong-domain fallback can enter sitemap | Low | Add SEO eligibility/index state; backfill conservatively | taxonomy threshold decision | 3 | large | launch blocker |
| GAP-05 | Canonical/robots/JSON-LD/OG safeguards incomplete | MP 11–12 | Metadata partial; no explicit canonical, robots, OG, JSON-LD | Weak sharing and discovery presentation | Canonical ambiguity, no noindex control, no structured data | Incorrect schema could misrepresent businesses if rushed | Slug/canonical rollout needs redirect history | slug decision, approved fields | 3 | medium | launch blocker |
| GAP-06 | No protected `/ops` shell or operator identity | OPS 4/8/19 | No route/role/allowlist | Routine operations remain fragmented | No direct public effect until Ops exists | Core privileged-access blocker | Add operator role/policy without changing owners | operator identity decision | 4 | large | Ops blocker |
| GAP-07 | No operational tables for audit/jobs/health/snapshots | OPS 6/17/18/20 | Planned hosted tables absent | Failures and changes are not explainable | SEO freshness/status cannot be tracked | No actor/correlation trail | Additive migrations and initial snapshot/backfill | lifecycle schema | 1 | large | Ops blocker |
| GAP-08 | No listings queues/detail workspace | OPS 9–11 | Provenance exists only in row fields/scripts | Operators cannot review evidence efficiently | Quality gate cannot be operated | Unsafe links/duplicates harder to catch | Approved/original field split required | GAP-03, GAP-06, GAP-07 | 4 | large | Ops blocker |
| GAP-09 | Required listing actions absent | OPS 12 | No Save/Approve/Reject/Unpublish/Restore RPCs | No controlled correction workflow | Publish/unpublish cannot coordinate sitemap/revalidation | Ad hoc service-role changes likely | Transitions need reason/history backfill | GAP-03, GAP-07, GAP-08 | 4 | large | Ops blocker |
| GAP-10 | Claim queue and dispute/revocation workflow absent | MP 6.3/24.4; OPS 13 | Immediate email-match claim; request table dropped | Legitimate disputes cannot be reviewed | Low | Ownership fraud/revocation gap | Preserve claimed owners; introduce claim records additively | claim policy decision, operator auth | 5 | large | Ops blocker |
| GAP-11 | Stripe webhook, state, reconciliation and Ops views absent | MP 16; OPS 7.1/14 | Webhook is 501; only IDs/tier exist | Premium benefits/status may be wrong | Featured ordering may mislead | Signature/idempotency absent | Backfill free/premium without inferring payment | premium model decision, audit/jobs | 5 | large | Ops blocker |
| GAP-12 | ABN and AI evidence workflows absent/legacy | MP 14–15; OPS 6.3/6.6/11 | ABN absent; legacy AI writes public copy | Operators lack supporting evidence | Unsupported copy can harm page quality | External calls/retries need controls | Add evidence records; do not gate existing listings | credential verification, jobs | 5 | large | Ops blocker |
| GAP-13 | SEO, Cloudflare, integration-health synchronisation absent | MP 19; OPS 7/15–17/22 | No snapshots or sync jobs | Operators must use native dashboards | Index/security faults remain invisible | Stale/sampled data could be overstated | Add snapshot tables; no vendor rewrite required | GAP-07, provider access | 6 | large | Ops blocker |
| GAP-14 | Vendor URLs use UUIDs, with no slug/redirect lifecycle | MP 5.3/8.5/24.3; OPS 11.9 | `[slug]` parameter is queried as `id` | URLs are opaque | Weaker canonicals and future URL break risk | Collision/redirect validation needed | Backfill unique slugs; retain UUID routes during transition | slug product decision | 3 | medium | important non-blocker |
| GAP-15 | Outbound website validation is syntax-only | MP 13.4; OPS 11.4 | HTTPS audit and `noopener`; no DNS/redirect/freshness check | Residents may reach unsafe/stale sites | Destination quality affects page value | SSRF/private-network risk for future fetcher | Store check results without overwriting URLs | website-check job | 3 | medium | important non-blocker |
| GAP-16 | Media pipeline is incomplete | MP 17/24.8 | Compression function lacks verified trigger/contract | Logos unavailable/inconsistent | Missing image metadata | Upload validation/access controls unclear | Add logo fields/storage references | image implementation decision | 7 | medium | important non-blocker |
| GAP-17 | No CI or authority-level acceptance suite | MP 22–23; OPS 23/26 | Tests are local and partial | Regressions may reach users | SEO regressions may ship | Security policies/actions untested | None directly | stable schemas/actions | 8 | medium | important non-blocker |
| GAP-18 | No future conditional automation policy implementation | MP 21/24.10; OPS 24 | Phase 1 controls not present yet | None required for Phase 1 | Premature automation would be risky | Automated publication must remain disabled | Future fields may reuse job/decision evidence | Phase 1 acceptance, product decision | 8 | large | future enhancement |

## Highest-risk conflicts

1. `scripts/seed.ts:292` publishes every new imported vendor, directly contradicting manual Phase 1 publication.
2. `supabase/functions/generate-bio/index.ts:36-81` combines fixed 300-word generation, unsupported trust framing, direct description overwrite, and publication.
3. `20260715000000_self_service_claims.sql:1-11` deliberately removes the claim review queue now required by the Ops authority.
4. `web/src/app/sitemap.ts` treats publication as sufficient for indexing and uses a non-canonical `.com` fallback.
5. The absence of audit history means current owner edits, claims, publication changes, and future operator actions cannot be reconstructed.

## Decisions requiring product input

- Whether geographic taxonomy is suburb-only, council-aware, or dual-level; specifically how the existing `darebin` value should behave.
- Minimum taxonomy-page usefulness/indexing threshold.
- Vendor slug format, change policy, and redirect retention.
- Claim evidence/approval policy, including treatment of existing email-matched claims.
- Whether/how public source attribution appears.
- ABN fuzzy-match policy and confidence presentation.
- Premium benefits and featured-ranking rules.
- Logo processing/storage implementation.
- Rejected-data retention period.
- Any future automatic-publication policy after Phase 1.
- Initial operator identity model and allowlist/role mechanism.

## Evidence limitations

- Blocking classifications apply to the authoritative target, not a claim that the current public directory is unreachable.
- External provider configuration and production logs were unavailable.
- Complexity is categorical, not an hours estimate.
- Hosted data was read-only; the 21 unpublished rows were not reclassified.
- The worktree was already dirty and is not reproducible from inspected `HEAD` alone.

## No-data-loss ledger

Every gap maps to traceability IDs: `GAP-01`–`GAP-05` cover Master publication/SEO (`MP-02`, `MP-05`, `MP-15`, `MP-22`–`MP-31`, `MP-38`–`MP-45`, `MP-50`); `GAP-06`–`GAP-13` cover Ops access/actions/integrations (`OPS-01`–`OPS-36`); `GAP-14`–`GAP-18` cover unresolved URL, safety, media, verification, and future-automation requirements (`MP-46`–`MP-58`, OPS acceptance/deferred sections).

