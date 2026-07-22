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

### D-007 — SUB-7 owner decisions: directory, claims, communications and release

- **Date:** 19 July 2026
- **Claim policy:** An exact match to the listing's recorded contact email is the normal claim path. Conflicts, sensitive changes, challenges, recovery, revocation and non-matching evidence enter a protected, auditable exception path. Claims change ownership only.
- **Missing-business policy:** A submission is private first. Deterministically qualified, approved-source, in-scope, identifiable and deduplicated candidates may become unclaimed listings; uncertain or risky candidates enter Ops exception review. Direct self-service public profile creation is not allowed.
- **Communications policy:** Keep the current sign-in email. After public release, introduce only explicitly approved transactional status messages in stages, with an in-product status/recovery path and no marketing, general support inbox, bulk notifications or uncontrolled retries. `SUB-15` defines the exact catalogue before `SUB-13` implements any message.
- **Release policy:** Lift holding only after thin end-to-end acceptance proves the resident, owner, submission/report, Ops, automation and public-route journeys. Records existing in the database are not sufficient.
- **Correction/privacy policy:** Use a private tracked request with operator decision reason and audit history. Never silently delete a listing or audit history, and never automatically remove public information solely from an unreviewed request.
- **First launch:** The initial public launch is complete when the minimum end-to-end journeys above are proven. Stripe, broad email, bulk ABN checks, AI publication and optional polish are not launch prerequisites.
- **Evidence to close:** Update authority/issue descriptions; build the ready foundation work; then verify each public journey and release gate.

### D-008 — Cross-device passwordless access

- **Date:** 22 July 2026
- **Decision:** The approved `auth@suburbmates.com.au` passwordless email uses an eight-digit, one-time code entered in the browser where the person wants to sign in. It replaces the browser-bound magic-link interaction.
- **Guardrail:** This changes neither the approved sender nor any other communications capability. Codes expire through Supabase Auth, are single-use, and do not decide a claim, publication, ownership or any other product state.
- **Evidence to close:** A live owner-device test of code delivery, expiry, supersession and successful session handoff, followed by removal of the temporary review callback.

### D-009 — Private missing-business status

- **Date:** 22 July 2026
- **Decision:** A missing-business submission records a separate submitter email for private, signed-in status access. The business contact details remain governed by the at-least-one-contact rule.
- **Guardrail:** Status is plain language only and separate from the operator listing queue. It cannot publish a listing, assign ownership, or send a general notification.
- **Identity rule:** The same email may be used by a submitter and later by a business owner. Authentication never makes it an owner; only an approved claim creates the ownership link.
- **Owner-submitted candidate rule:** A person who owns, manages, or represents a missing business signs in first, submits the private candidate and a relationship explanation, and receives a pending claim request. That combined intake never publishes the candidate or grants ownership automatically.

### D-010 — Automation, communications and launch implementation choices

- **Date:** 22 July 2026
- **Approved discovery sources:** Begin with OpenStreetMap, operator-entered records and community submissions. Add any government or other source only after storage/display licence review. Do not scrape Google or closed directories.
- **Deterministic qualification:** A default-unclaimed candidate must have a permitted source, Darebin/category scope, a business name, at least one reachable customer contact method, no strong duplicate and no known material safety or legitimacy concern. A strong duplicate is a matching website, phone, or normalised business name plus street address; uncertain matches enter Ops.
- **Exception and release rule:** Unsafe, deceptive or materially broken website evidence holds the candidate for Ops. After controlled proof, qualifying candidates publish as unclaimed listings; exceptions never do. Existing database records must be requalified before public release rather than exposed merely because they are already marked published.
- **Communications:** `auth@suburbmates.com.au` may send the approved staged status messages only: claim and profile-change decisions, then submission/report/privacy outcomes where a valid contact basis exists. No automatic receipt, new sender, marketing, general inbox or retry loop is approved.
- **Trust and media:** An operator may run an ABR check for one supplied ABN at a time and display only a supported `ABN checked` signal. Owners or authorised representatives may propose a logo or other media for private Ops moderation; no third-party logo harvesting is approved.
- **Account access:** Activate the merged eight-digit code template and prove its user journey with the owner. An iPhone code-entry check is acceptable now; a two-device check remains required before the cross-device acceptance criterion is closed.
- **Guardrail:** None of these decisions lifts the holding posture, authorises automatic publication from raw data, or changes claim/ownership review requirements.

## Open deviations to track

| Deviation | Current truth | Required resolution |
| --- | --- | --- |
| Publication policy | Manual publication in implementation; default qualified unclaimed publication is the target direction. | Implement the approved qualification, duplicate, exception and controlled-release rules. |
| Public product | Holding page, redirects and empty sitemap remain live. | Complete public-product workflows and deliberate public-route acceptance. |
| Owner and public input | Claim, status, profile correction and missing-business submission journeys are incomplete or not accepted as a finished set. | Build, harden and verify both user and Ops paths. |
| Monetisation | Stripe is disabled. | Leave disabled until separately approved commercial scope exists. |
| Automation record | Automation safety controls exist but documentation and issue records need current-state reconciliation. | Maintain evidence, exception handling and current documentation as workflows are hardened. |
