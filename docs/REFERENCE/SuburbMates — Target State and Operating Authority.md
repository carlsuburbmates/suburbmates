# SuburbMates — Target State and Operating Authority

## Status and purpose

This is the owner-approved, concise definition of the expected SuburbMates product and its operating authority. It gives Linear, Codex, GitHub and future contributors a shared control-room view without replacing the detailed architecture or Operations Specification.

Where this document makes an explicit owner decision that differs from an older planning document, this document governs the operating direction. The detailed documents and implementation must then be aligned through reviewed issues and migrations; no conflicting behaviour should be changed silently.

Owner decisions and material implementation deviations are recorded in [SuburbMates — Decision Log](./SuburbMates%20%E2%80%94%20Decision%20Log.md). Linear holds the linked work and verification record; this repository holds the durable product authority.

The complete non-technical experience is defined in [SuburbMates — Complete User Journey Map](./SuburbMates%20%E2%80%94%20Complete%20User%20Journey%20Map.md). Its technical automation companion is `docs/AUTOMATION/WORKFLOWS.md`.

All execution follows [SuburbMates — Execution Governance and Readiness Protocol](./SuburbMates%20%E2%80%94%20Execution%20Governance%20and%20Readiness%20Protocol.md).

## Product outcome

SuburbMates is a directory-first service for discovering local Darebin businesses and contacting them directly. It is not a lead-selling marketplace, quote funnel, merchant of record, or a platform that invents business facts.

The finished public directory helps residents find useful local businesses. Business owners can discover their existing listing, claim it, and propose accurate updates. Routine operations happen in the protected `/ops` console, not in provider dashboards.

## Current release posture

The public site remains intentionally contained behind a no-index holding page until the owner authorises public release. Unfinished public routes redirect home and the public sitemap remains empty during this posture.

This containment is temporary. It must not be treated as the final directory product or as a reason to postpone the operational model below.

## Directory publication policy

### Owner decision

Qualifying businesses discovered from approved sources are published by default as **unclaimed** listings. They do not need to register, claim their listing, provide an ABN, pay SuburbMates, or be owner-verified before appearing in the directory.

This is the primary acquisition model: a business should be able to find itself on SuburbMates and then choose to claim its listing.

### Minimum qualification

"Found" does not mean every raw record from the internet. Before publication, a candidate must:

1. come from an approved, storage-and-display-permitted source;
2. be within the directory's geographic and category scope;
3. have enough evidence to identify it as a real business, normally a name plus an address, phone, website, or public source record;
4. be deduplicated against existing listings; and
5. have no known evidence that its public page, destination, or identity is malicious, deceptive, closed, or materially unsupported.

An operator may withhold, unpublish, reject, or correct a listing when those safeguards are not met. Those decisions must be reasoned and audit-recorded. They do not require a separate owner approval for every ordinary qualifying discovery.

### Independent states

Publication, ownership, verification, commercial status, source provenance and SEO eligibility remain independent. A published listing may correctly be:

```text
Published
Unclaimed
ABN not provided
Free
Approved import
```

Publication must never be caused solely by payment, a claim, an ABN result, or AI output. AI may prepare evidence-limited drafts only; it may not invent public facts.

### Trust signals

Use precise labels only where supported by stored evidence: `Claimed`, `Owner verified`, `ABN checked`, and, if a future paid offer is approved, an accurate commercial label. Do not use a vague universal `Verified` badge and do not imply that an unclaimed or unverified listing is illegitimate.

## Operating authority

| Actor | Authority |
| --- | --- |
| Owner / authorised operator | Reviews exceptions, makes normal listing lifecycle decisions, resolves claims and profile changes, and authorises public release. Every privileged decision is server-authorised and audit-recorded. |
| Automation | Acquires, normalises, deduplicates and records evidence. It may publish only when the approved deterministic qualification policy is implemented and proven; it must surface exceptions rather than invent facts. |
| Codex | Audits, implements approved work, runs tests and reports evidence. It does not make discretionary production decisions or send uncontrolled communications. |
| Linear | Tracks approved work, ownership, dependencies, acceptance criteria, blockers and verification evidence. It is the coordination layer, not the product source of truth. |
| GitHub | Holds source, branches, pull requests, CI and the technical merge record. `main` is the release and audit baseline. |

## Capability status and guardrails

### Explicitly deferred: monetisation

Stripe checkout, subscriptions, entitlement enforcement and webhook processing are deferred until the owner defines a genuine paid benefit, price, entitlement lifecycle, cancellation/failure behaviour and reconciliation model. The current Stripe webhook remains non-operational. Payment must never determine publication, ownership, legitimacy or ranking.

### Required for the completed product

The following are build commitments, not indefinite deferrals:

- approved-source discovery, evidence capture, deduplication and the deterministic qualification policy for default unclaimed publication;
- optional ABN and website evidence checks, presented as precise supporting signals rather than entry requirements;
- a public missing-business submission path, protected by validation and abuse controls, that creates a candidate record rather than publishing raw input;
- claim, ownership, request-status and moderated profile-update journeys;
- the public contact path, private Ops handling and only the transactional communications genuinely needed by approved user workflows;
- a safe, evidence-backed media/logo capability when it improves a public listing; and
- observable operational jobs, exception queues, audit history, mobile accessibility, SEO and public-route acceptance.

These capabilities must be implemented with their relevant safety controls and verified before public release. They must not remain merely documented.

### Permanent guardrails

The following are prohibited product behaviours, not postponed features:

- AI-generated public facts or AI deciding publication;
- an ABN, payment, claim, tier or email match independently publishing a listing;
- automatic publication from raw, unqualified or unlicensed discovery data;
- destructive legacy pruning or silent deletion of business and audit history;
- marketing email, uncontrolled retries, or an exposed public support inbox; and
- broad service-role or privileged Edge-function paths that bypass the server-authorised workflow and audit boundaries.

Default publication applies only after the qualification policy above is implemented, tested and operationally observable. Public contact intake becomes available with the public release rather than during the holding posture.

## Release gates

Before public directory release, prove that:

1. the public directory shows only qualifying published listings with accurate trust signals;
2. `/ops` lets the authorised operator understand and complete routine exception, claim, correction and lifecycle work without provider dashboards;
3. source, duplicate, safety and publication safeguards are tested and auditable;
4. owner claim and proposed-edit workflows are authenticated and moderated;
5. public pages, metadata, sitemap and no-index rules match the active release posture; and
6. production, database and relevant integrations are verified after deployment.

## Operating workflow

```text
Expected-state authority and locked specifications
        ↓
Linear issue with owner, dependency, acceptance criteria and verification
        ↓
Codex implementation and evidence
        ↓
GitHub review, CI and merge to main
        ↓
Production and database verification
        ↓
Linear records the verified outcome
```

## Alignment required

The older manual-publication wording in the Master Architecture, Unified Operations Specification and Handover must be revised to match this owner decision before the default-publication implementation is enabled. Until that alignment and its tests are complete, existing safe-off behaviour remains in force.
