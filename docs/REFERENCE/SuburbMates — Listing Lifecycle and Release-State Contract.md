# SuburbMates — Listing Lifecycle and Release-State Contract

## Purpose

This contract turns the owner-approved directory policy into a buildable model. It deliberately keeps publication, site release, ownership, trust evidence, commercial presentation, provenance and SEO eligibility separate.

## State model

| Dimension | Meaning | Must not be changed by |
| --- | --- | --- |
| Listing lifecycle | `draft`, `pending_review`, `published`, `rejected`, `unpublished`. A listing's own directory eligibility. | Claim, ABN result, payment, tier or AI output alone. |
| Public release | The site-wide holding/release gate that controls whether otherwise published records are publicly browseable and indexable. | A database record being published. |
| Ownership | `unclaimed`, `claim_pending`, `claimed`, `owner_verified` where implemented. | Publication, ranking or SEO eligibility. |
| Trust evidence | Evidence records such as source, website and optional ABN checks. | A universal "verified" badge or publication automatically. |
| Commercial state | Free now; future paid entitlement only after a separate approved offer. | Publication, ownership, legitimacy, claim outcome or ranking. |
| Provenance | Source, source key/URL, checked time, qualification evidence and duplicate relationship. | Public display without the lifecycle decision. |
| SEO eligibility | Whether a public route/taxonomy page can be indexed. | Ownership, payment or mere database existence. |

## Current implementation inventory

- `vendors.listing_status` and `vendors.is_published` already implement the listing lifecycle and consistency check.
- `vendors.ownership_status`, `owner_id` and `is_claimed` are separate from publication.
- `listing_evidence`, source fields and audit events hold supporting provenance and decision history.
- `published_vendors` is a narrow public projection; it does not expose source, owner, moderation or internal lifecycle data.
- `taxonomy_page_eligibility` computes indexable taxonomy routes from published, evidence-backed listings. It is an SEO rule, not a new listing state.
- Protected Ops lifecycle functions require an operator, reason and audit event.

## Required corrections and boundaries

1. **Commercial neutrality:** public directory ranking must not order by `tier` or another commercial field. Commercial presentation belongs to its own future approved model.
2. **Qualified default publication:** the approved target is deterministic publication of qualifying approved-source candidates as unclaimed listings. The current importer keeps new records in `pending_review`; changing that path belongs to `SUB-6` after its auditable candidate handoff is designed and proven.
3. **Holding remains separate:** a `published` listing stays non-public while the global holding gate is active. Releasing public routes is governed by `SUB-14`, not an import or claim.
4. **Claims remain independent:** the approved normal exact-email path and its future exception/revocation flow never publish a listing or change commercial/SEO state.
5. **Evidence remains precise:** an ABN or website result is stored as supporting evidence. It is not a universal entry requirement.

## Allowed lifecycle transitions

```mermaid
stateDiagram-v2
  [*] --> draft
  draft --> pending_review: candidate or operator prepares record
  pending_review --> published: approved current control / future qualified policy
  pending_review --> rejected: insufficient, duplicate, unsafe or out of scope
  published --> unpublished: reasoned safety, accuracy, privacy or closure decision
  unpublished --> pending_review: restore for review
  rejected --> pending_review: new evidence or correction
```

Every transition requires the permitted actor, reason, timestamp and audit evidence. The current operator-only transition path is retained until `SUB-6` delivers an approved deterministic qualification handoff.

## `SUB-8` delivery boundary

`SUB-8` verifies and corrects the shared model: state separation, operator transition protection, public projection and non-commercial ranking. It does not enable automatic candidate publication, lift holding mode, implement claim exceptions, or activate billing.

## Evidence required before review

- source-level tests for valid and prohibited transitions;
- a public-directory result proving neutral, non-commercial ordering;
- confirmation that public projection and holding gate remain unchanged;
- review of migration/RLS/audit impact; and
- no remote data mutation during verification unless a separately approved migration is ready.
