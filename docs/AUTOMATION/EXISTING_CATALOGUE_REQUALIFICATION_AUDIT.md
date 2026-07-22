# Existing catalogue requalification audit

**Date:** 23 July 2026 (Australia/Melbourne)  
**Scope:** read-only inspection of the live published catalogue. No listing, publication, ownership, evidence or audit record was changed.

## Why this audit exists

The approved qualification policy applies to every directory listing: permitted provenance, valid Darebin/category scope, identifiable business, at least one customer contact method, no strong duplicate and no known safety or legitimacy concern. The pre-existing catalogue was published before the current candidate handoff was built, so it must not be assumed to have passed that same policy.

## Live baseline

| Check | Result |
| --- | ---: |
| Published listings inspected | 1,600 |
| `approved_import` provenance | 1,598 |
| `seeded_by_suburbmates` provenance | 2 |
| Source URL present | 1,598 |
| Source check date present | 1,598 |
| Category and suburb present | 1,600 |
| Street address present | 973 |
| At least one usable email, phone or HTTPS website | 790 |
| Non-HTTPS or malformed stored website | 0 |
| Strong duplicate signal by website | 6 groups / 12 listings |
| Strong duplicate signal by phone | 2 groups / 4 listings |
| Strong duplicate signal by exact normalised name and address | 0 groups |

The duplicate signal counts can overlap. They are review signals, not evidence that every paired listing is an erroneous duplicate.

## Completed private evidence pass

The idempotent `existing-catalogue-v1` run completed on 23 July 2026:

| Result | Count |
| --- | ---: |
| Listings classified | 1,600 |
| Qualified from stored evidence | 584 |
| Exceptions retained for Ops | 1,016 |
| Missing reachable contact | 810 |
| Unsupported category | 354 |
| Possible duplicate | 107 |
| Strong duplicate | 16 |
| Incomplete provenance | 2 |

Reason counts overlap because one listing can need more than one follow-up. Re-running the same evidence pass returned the completed run rather than creating another run, record set or audit event.

The classification did not change a listing's lifecycle, ownership, commercial state or public visibility: the live published count remained 1,600 and the sitemap remained 1,684 URLs. The protected `/ops/catalogue-review` page exposes the exceptions in plain language to the authorised operator.

## Next operational work

1. Review the exception queue, starting with missing contact details, strong duplicates and incomplete provenance.
2. Preserve the evidence result until a separately authorised lifecycle decision is made for any individual exception.
3. Re-run only when source or listing data materially changes; the policy fingerprint makes an unchanged rerun idempotent.
4. Use the public route and sitemap smoke checks after any future listing decision.

## Evidence used

- Live `vendors` administrative inspection, paginated through all published rows.
- Live candidate-handoff run and record counts.
- `web/src/lib/automation/candidate-qualification.ts` and its boundary tests.
- The approved lifecycle, target-state and Decision Log authorities.
