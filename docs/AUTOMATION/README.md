# SuburbMates automation

This folder is the canonical operational map for SuburbMates automation. It explains what the implemented automations do, what triggers them, which services they use, and their current operating status.

It does not override the locked product and Ops authorities in `docs/REFERENCE/` or the current-state record in `docs/HANDOVER.md`. It records implementation evidence as at 17 July 2026.

## Read first

- [Workflow map and inventory](WORKFLOWS.md) — every implemented, configured, event-driven, and intentionally disabled automation.
- `docs/HANDOVER.md` — current hosted state and release gates.
- `docs/REFERENCE/SuburbMates — Corrected Master Architecture and Execution Plan.md` — product and safety authority.
- `docs/REFERENCE/SuburbMates — Unified Operations Specification.md` — required Ops outcomes.

## Automation boundary

Automation may collect evidence, produce artefacts, monitor health, and report exceptions. It must never publish a listing, approve or revoke ownership, decide a claim, change a listing's commercial state, or invent public business facts.

The only implemented automatic deletion is the separately governed contact-retention job. It removes resolved/spam private contact requests under the documented retention policy and leaves an audit record. This is a locked-policy exception that must remain explicit; it is not a publication, ownership, or candidate workflow.

The hourly database health monitor also writes `integration_health` records automatically. It is a legacy Ops-system feature, not a GitHub evidence workflow. It does not meet the stricter Automation-lane rule that scheduled checks must not write to Supabase automatically, so it must not be expanded or treated as proof of external workflow freshness without Main's explicit decision.

## Current operating status

- The internal Supabase health monitor and contact-retention job are active.
- GitHub has four active workflows on `main`: Verify, Catalogue candidate discovery, Website safety evidence, and Production smoke.
- One controlled run of each scheduled workflow was completed on 17 July. Catalogue discovery and Production smoke exposed safe implementation defects; their isolated fix is commit `92eef2f` on `codex/preflight-recovery`, awaiting Main review and promotion. Website safety completed evidence collection and raised one operator review issue.
- Stripe billing, bulk ABR/ABN checks, AI publication, media/logo processing, and the legacy inactivity pruner are disabled.
- There is no implemented handoff from a GitHub discovery artefact to an `/ops` candidate queue yet.
- The database health monitor does not ingest GitHub workflow runs or artefacts. Its green automation-queue status means only that the local job table has no failed or overdue rows; it is not evidence that GitHub checks ran.

## Verified current gaps

1. **Promote and rerun the two isolated workflow fixes.** Commit `92eef2f` makes CI's local env file optional for catalogue discovery and makes Production smoke validate the approved holding page before directory-only checks. It has not reached `main`, so neither repaired workflow has a successful controlled run yet.
2. **Review website-safety evidence.** The controlled run checked 588 websites and flagged 86. The report is retained for 30 days in GitHub Actions and [issue #3](https://github.com/carlsuburbmates/suburbmates/issues/3) is the single review entry. No listing was changed.
3. **Keep GitHub evidence distinct from the database health badge.** A candidate-to-Ops handoff and workflow-result ingestion are not implemented. They are future design work, not a reason to treat the current database health row as proof of GitHub freshness.
4. **Resolve two locked-authority exceptions to the strict Automation boundary.** Contact retention automatically deletes eligible private contact content, and the hourly health monitor automatically writes health rows. Both are implemented and currently safe within their narrower locked scopes, but neither fits an absolute “no automatic delete or Supabase write” Automation rule. Main must explicitly classify them as governed Ops retention/health processes or approve a replacement design before this lane can claim that strict rule is fully met.

## Documentation rule

Add or update Automation-lane documentation in this folder. Link to source-specific documents and locked authorities rather than copying them, so the product authority remains singular.
