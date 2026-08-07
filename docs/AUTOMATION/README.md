# SuburbMates automation

This folder is the canonical operational map for SuburbMates automation. It explains what the implemented automations do, what triggers them, which services they use, and their current operating status.

It does not override the locked product and Ops authorities in `docs/REFERENCE/` or the current-state record in `docs/HANDOVER.md`. It records current implementation evidence. A pending target-state decision must be reconciled with the locked authorities before it changes production behaviour.

## Read first

- [Workflow map and inventory](WORKFLOWS.md) — every implemented, configured, event-driven, and intentionally disabled automation.
- `docs/HANDOVER.md` — current hosted state and release gates.
- `docs/REFERENCE/SuburbMates — Corrected Master Architecture and Execution Plan.md` — product and safety authority.
- `docs/REFERENCE/SuburbMates — Unified Operations Specification.md` — required Ops outcomes.

## Automation boundary

Automation may collect evidence, produce artefacts, and report exceptions. The sole narrow publication path is the token-protected OpenStreetMap candidate handoff: a new candidate may become an unclaimed listing only after it passes the deterministic source, scope, contact, duplicate and safety policy and its evidence is persisted. Automation must never approve or revoke ownership, decide a claim, change a listing's commercial state, or invent public business facts.

Database health updates and contact retention are narrow, audited **Ops** processes, not Automation-lane workflows. They may not affect listings, ownership, claims, payments, or publication. The health monitor must not be treated as proof that GitHub evidence workflows are fresh.

## Current operating status

- The internal Supabase health monitor and contact-retention job are active as Ops processes outside this lane.
- GitHub has five active workflows on `main`: Verify, Catalogue candidate discovery, Website safety evidence, Production smoke, and the HubSpot Decision Inbox reconciliation. The HubSpot workflow is a one-way Ops companion: it creates or closes low-detail Tasks only and does not change SuburbMates data.
- Catalogue discovery and Production smoke fixes were merged in pull requests #4 and #5. Controlled manual runs then succeeded on `main`. Website safety retains evidence artefacts without turning raw external failures into operator work.
- Stripe billing, bulk ABR/ABN checks, AI publication, media/logo processing, and the legacy inactivity pruner are disabled.
- Candidate-to-Ops handoff is implemented for approved OpenStreetMap batches. A full manual run on 22 July 2026 covered 1,545 source rows: 1,544 private exceptions and one deterministically qualified, unclaimed listing with retained provenance, contact and audit evidence. The protected exception queue remains normal ongoing Ops work.
- The existing catalogue completed the private `existing-catalogue-v2` evidence pass on 26 July 2026: 619 qualified and 982 exceptions across 1,601 listings. It did not change listing visibility. These are background evidence records, not a queue for the operator to process one by one; only a genuine unresolved duplicate would be surfaced in Work.
- The database health monitor does not ingest GitHub workflow runs or artefacts. Its green automation-queue status means only that the local job table has no failed or overdue rows; it is not evidence that GitHub checks ran.

## Verified current gaps

1. **Keep website-safety evidence as background context.** The checker retains a 30-day report of DNS, certificate, redirect and timeout outcomes. It does not change a listing or create an operator queue; a genuine application workflow failure still fails its GitHub run.
2. **Keep GitHub evidence distinct from the database health badge.** GitHub workflow-result ingestion is not implemented. The candidate handoff records its own database run and job state, but a health row is still not proof that every GitHub workflow ran.
3. **Maintain external-acquisition safeguards.** Bounded provider requests, response validation, fallback evidence and date-boundary tests are implemented. Any future change must preserve the same qualification and evidence boundary.
4. **Cloudflare preview-build guard is enabled.** On 18 July, Cloudflare Workers Builds was verified with production branch `main` and non-production branch builds disabled. This prevents PR branches from producing automatic preview deployments.

## Documentation rule

Add or update Automation-lane documentation in this folder. Link to source-specific documents and locked authorities rather than copying them, so the product authority remains singular.
