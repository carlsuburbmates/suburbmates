# Existing catalogue requalification audit

**Date:** 26 July 2026 (Australia/Melbourne)
**Scope:** private, idempotent evidence classification of the live published catalogue. It retained requalification evidence and one audit record; no listing, publication, ownership, commercial or lifecycle state changed.

## Why this audit exists

The approved qualification policy applies to every directory listing: permitted provenance, valid Darebin/category scope, identifiable business, at least one customer contact method, no strong duplicate and no known safety or legitimacy concern. The pre-existing catalogue was published before the current candidate handoff was built, so it must not be assumed to have passed that same policy.

## Live baseline

| Check | Result |
| --- | ---: |
| Published listings inspected | 1,601 |
| Completed evidence policy | `existing-catalogue-v2` |
| Shared-address rule | Address alone is not duplicate evidence |

The current policy uses only strong identifier matches (same normalised website, phone, or both name and address) for duplicate blocking. A shared street address is not duplicate evidence.

## Completed private evidence pass

The idempotent `existing-catalogue-v2` run completed on 26 July 2026:

| Result | Count |
| --- | ---: |
| Listings classified | 1,601 |
| Qualified from stored evidence | 619 |
| Private background exceptions | 982 |
| Missing reachable contact | 810 |
| Unsupported category | 354 |
| Strong duplicate | 16 |
| Unproven existing provenance | 2 |

Reason counts overlap because one listing can need more than one follow-up. Re-running the same evidence pass returned the completed run rather than creating another run, record set or audit event.

The classification did not change a listing's lifecycle, ownership, commercial state or public visibility. These records are retained for audit and batch-improvement work; they are not individual operator tasks. Only a genuine unresolved duplicate may appear in Ops Work.

## Next operational work

1. Preserve the evidence result until a separately authorised lifecycle decision is made for any individual exception.
2. Re-run only when source or listing data materially changes; the policy fingerprint makes an unchanged rerun idempotent.
3. Use the public route and sitemap smoke checks after any future listing decision.

## Evidence used

- Live `vendors` administrative inspection, paginated through all published rows.
- Live candidate-handoff run and record counts.
- `web/src/lib/automation/candidate-qualification.ts` and its boundary tests.
- The approved lifecycle, target-state and Decision Log authorities.
