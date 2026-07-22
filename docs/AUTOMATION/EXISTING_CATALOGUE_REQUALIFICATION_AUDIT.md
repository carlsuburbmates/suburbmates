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

## Result

The existing 1,600 listings are **not yet requalified** under the approved policy. In particular, 810 do not presently meet the stored-data version of the required reachable-contact rule. Provenance and scope are strong for most of the cohort, but this audit cannot prove a current website is safe, a business is still active, or that every duplicate signal is a duplicate without retained or fresh evidence.

The public release remains an explicit owner-authorised release. This report does not retrospectively treat the existing cohort as qualified and does not authorise bulk unpublication.

## Safe next implementation

1. Create a private, idempotent requalification run and one evidence record per existing listing.
2. Classify each row as `qualified` or `exception` using the same deterministic policy as new candidates, while preserving the listing's current publication state.
3. Send missing-contact, duplicate, provenance and safety exceptions to a protected Ops queue with a plain-language reason.
4. Require a separately authorised lifecycle decision before any exception is unpublished, corrected or otherwise changes public visibility.
5. Verify the resulting evidence, queue counts, audit trail and public sitemap before describing the cohort as fully requalified.

## Evidence used

- Live `vendors` administrative inspection, paginated through all published rows.
- Live candidate-handoff run and record counts.
- `web/src/lib/automation/candidate-qualification.ts` and its boundary tests.
- The approved lifecycle, target-state and Decision Log authorities.
