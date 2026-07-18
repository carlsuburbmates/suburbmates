# SuburbMates automation

This folder is the canonical operational map for SuburbMates automation. It explains what the implemented automations do, what triggers them, which services they use, and their current operating status.

It does not override the locked product and Ops authorities in `docs/REFERENCE/` or the current-state record in `docs/HANDOVER.md`. It records implementation evidence as at 18 July 2026.

## Read first

- [Workflow map and inventory](WORKFLOWS.md) — every implemented, configured, event-driven, and intentionally disabled automation.
- `docs/HANDOVER.md` — current hosted state and release gates.
- `docs/REFERENCE/SuburbMates — Corrected Master Architecture and Execution Plan.md` — product and safety authority.
- `docs/REFERENCE/SuburbMates — Unified Operations Specification.md` — required Ops outcomes.

## Automation boundary

Automation may collect evidence, produce artefacts, and report exceptions. It must never publish a listing, approve or revoke ownership, decide a claim, change a listing's commercial state, or invent public business facts.

Database health updates and contact retention are narrow, audited **Ops** processes, not Automation-lane workflows. They may not affect listings, ownership, claims, payments, or publication. The health monitor must not be treated as proof that GitHub evidence workflows are fresh.

## Current operating status

- The internal Supabase health monitor and contact-retention job are active as Ops processes outside this lane.
- GitHub has four active workflows on `main`: Verify, Catalogue candidate discovery, Website safety evidence, and Production smoke.
- One controlled run of each scheduled workflow was completed on 17 July. Catalogue discovery and Production smoke exposed safe implementation defects; their isolated fix is commit `92eef2f` on `codex/preflight-recovery`, awaiting Main review and promotion. Website safety completed evidence collection and raised one operator review issue.
- Stripe billing, bulk ABR/ABN checks, AI publication, media/logo processing, and the legacy inactivity pruner are disabled.
- Candidate-artifact import into an `/ops` queue is deliberately deferred. The current discovery workflow is complete as evidence-only GitHub artefacts and does not require a database handoff.
- The database health monitor does not ingest GitHub workflow runs or artefacts. Its green automation-queue status means only that the local job table has no failed or overdue rows; it is not evidence that GitHub checks ran.

## Verified current gaps

1. **Promote and rerun the two isolated workflow fixes.** Commit `92eef2f` makes CI's local env file optional for catalogue discovery and makes Production smoke validate the approved holding page before directory-only checks. It has not reached `main`, so neither repaired workflow has a successful controlled run yet.
2. **Review website-safety evidence.** The controlled run checked 588 websites and flagged 86. The report is retained for 30 days in GitHub Actions and [issue #3](https://github.com/carlsuburbmates/suburbmates/issues/3) is the single review entry. No listing was changed.
3. **Keep GitHub evidence distinct from the database health badge.** GitHub workflow-result ingestion is not implemented. Candidate-to-Ops import is deliberately deferred while discovery remains an evidence-only workflow. Neither omission is a reason to treat a database health row as proof of GitHub freshness.
4. **Cloudflare preview-build guard is enabled.** On 18 July, Cloudflare Workers Builds was verified with production branch `main` and non-production branch builds disabled. This prevents PR branches from producing automatic preview deployments.

## Documentation rule

Add or update Automation-lane documentation in this folder. Link to source-specific documents and locked authorities rather than copying them, so the product authority remains singular.
