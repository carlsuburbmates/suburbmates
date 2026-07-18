# SuburbMates — Decision Log

## Purpose

This log records owner-approved product decisions and material departures from the current implementation or older documents. It prevents a branch, a lane report, or an outdated specification from silently becoming product policy.

It is a durable repository record. Linear mirrors the active decision and implementation work; GitHub records reviewed technical changes; live production remains the factual release baseline.

## Decision protocol

For every material decision or deviation:

1. record the owner decision, source and date here;
2. link the Linear issue(s) that will align implementation, tests and documentation;
3. identify whether the current production behaviour differs;
4. preserve the discrepancy until it is deliberately resolved through review; and
5. close the record only with repository, database and live-verification evidence where applicable.

No branch, pull request, automation run or lane handover changes product policy by itself.

## Active decisions

### D-001 — Target-state authority and change control

- **Date:** 19 July 2026
- **Decision:** The Target State and Operating Authority is the concise owner-approved operating direction. Where it conflicts with older planning language, the intended direction is authoritative, but implementation must be aligned through explicit work rather than silently changed.
- **Current state:** Older documents and the live application still contain manual-publication and holding-posture assumptions.
- **Required alignment:** Reconcile the Master Architecture, Operations Specification, handover and lane documents; then implement and verify the target state through reviewed issues.
- **Evidence to close:** Updated authority documents, linked issue evidence and a release decision.

### D-002 — Directory-first default unclaimed publication

- **Date:** 19 July 2026
- **Decision:** A business that deterministically qualifies from an approved source is intended to appear in the directory by default as an unclaimed listing. A business does not need to register, claim, provide an ABN or pay before it appears.
- **Guardrail:** "Found" means an approved, in-scope, identifiable, deduplicated candidate without known material safety or legitimacy concerns. Provenance and the qualifying evidence must be retained. Exceptions remain visible to an operator and audit-recorded.
- **Current state:** The application requires an explicit operator publication decision and public release remains contained behind the holding posture.
- **Required alignment:** Build and prove the qualification, evidence, duplicate, exception and lifecycle controls. Do not enable automated production publication or lift the holding posture until that work and public-route acceptance are complete.
- **Evidence to close:** Policy implementation, tests, controlled data-path verification, operator exception evidence and authorised public release verification.

### D-003 — Owner participation and public input

- **Date:** 19 July 2026
- **Decision:** Claiming establishes ownership; it does not decide whether an otherwise legitimate listing is published. Owners may propose profile corrections and supporting information through moderated workflows. A public missing-business submission creates a private candidate and cannot publish raw input directly.
- **Current state:** The finished owner and public-input workflows are build commitments, not accepted completion.
- **Required alignment:** Implement claim, request-status, profile-change, submission, validation, abuse-control, moderation and necessary transactional communication flows.
- **Evidence to close:** End-to-end user and operator acceptance evidence, including failed and abuse-resistant paths.

### D-004 — Capability scope

- **Date:** 19 July 2026
- **Decision:** Monetisation is the only explicitly deferred product capability. It remains disabled until a real paid offer and its price, benefits, entitlement lifecycle, cancellation/failure behaviour and reconciliation model are approved.
- **Decision:** Core directory, acquisition, trust, owner, moderation, communications, media, accessibility, SEO and operational capabilities are build commitments, subject to their safety controls.
- **Guardrail:** Payment never determines publication, ownership, legitimacy or ranking.
- **Evidence to close:** A separate owner-approved commercial model and fully verified billing implementation, if and when monetisation is activated.

### D-005 — Automation and release evidence

- **Date:** 19 July 2026
- **Decision:** Automation may acquire, normalise, deduplicate and record evidence. It must be idempotent, observable and safe to retry; it must surface exceptions rather than invent facts. AI may not invent public facts or make discretionary publication, claim or ownership decisions.
- **Decision:** Before every material audit, implementation or release phase, refresh `origin/main`, inspect the shared worktree/branch state and use the remote main branch as the audit and release baseline. Refresh again before reporting a phase complete.
- **Guardrail:** No automatic merge, reset, deployment, production data change or policy change follows from that refresh. Unmerged lane work is candidate work, not accepted truth.
- **Evidence to close:** Relevant CI evidence, persisted run and exception evidence, tests, review and live verification where a public or production behaviour changes.

### D-006 — Communications and account access

- **Date:** 19 July 2026
- **Decision:** Communications is a first-class user journey. During the holding posture, passwordless sign-in from `auth@suburbmates.com.au` is the only approved outbound email. A public contact dispatcher, support inbox, marketing mail, bulk notification system and uncontrolled retries remain disabled.
- **Decision required before expansion:** `SUB-15` must approve the exact post-release message catalogue: trigger, recipient, sender, content boundary, contact/consent basis, retained evidence, failure state, retention and Ops action.
- **Guardrail:** A user must retain an in-product status/recovery path if a message cannot be delivered. A message never changes publication, ownership, trust, commercial or claim state.
- **Evidence to close:** Approved journey/map, message catalogue, authorised implementation and end-to-end delivery/failure evidence for each enabled message.

## Open deviations to track

| Deviation | Current truth | Required resolution |
| --- | --- | --- |
| Publication policy | Manual publication in implementation; default qualified unclaimed publication is the target direction. | Authority reconciliation, deterministic qualification controls and controlled release work. |
| Public product | Holding page, redirects and empty sitemap remain live. | Complete public-product workflows and deliberate public-route acceptance. |
| Owner and public input | Claim, status, profile correction and missing-business submission journeys are incomplete or not accepted as a finished set. | Build, harden and verify both user and Ops paths. |
| Monetisation | Stripe is disabled. | Leave disabled until separately approved commercial scope exists. |
| Automation record | Automation safety controls exist but documentation and issue records need current-state reconciliation. | Maintain evidence, exception handling and current documentation as workflows are hardened. |
