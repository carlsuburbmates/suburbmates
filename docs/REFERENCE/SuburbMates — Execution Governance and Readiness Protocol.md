# SuburbMates — Execution Governance and Readiness Protocol

## Purpose

This is the lightweight control system for executing SuburbMates work. It prevents a local branch, an old document, a passing test or an AI suggestion from quietly changing product policy, production data or release posture.

It is designed for one owner. Linear is the work board; the repository is the durable authority; GitHub is the technical review record; live production is the factual release result.

## 1. Authority and facts are different

### Product authority order

1. Explicit owner decisions recorded in the Decision Log.
2. Target State and Operating Authority.
3. Complete User Journey Map.
4. Detailed Master Architecture and Operations Specification, only where consistent with the first three.
5. An approved Linear issue, which may implement authority but may not silently rewrite it.
6. Lane documents, handovers and reports, only as implementation guidance.

### Current-state evidence order

1. Live production and remote database state.
2. `origin/main` and its merged pull-request/CI record.
3. Remote migration list and hosted workflow evidence.
4. Isolated branch/worktree evidence.
5. Local assumptions or chat summaries.

An authority document defines what should happen. Current-state evidence defines what is happening. A difference is a **deviation** to record and resolve—not permission to change either one silently.

## 2. Roles and boundaries

| Actor | May do | Must not do |
| --- | --- | --- |
| Owner | Approve product decisions, scope, public release and final acceptance. | Be presumed to have approved an unstated product or commercial choice. |
| Linear | Hold project lane, issue scope, blockers, status and evidence links. | Become the sole source of permanent product authority. |
| Codex | Audit, implement an approved issue, test, document evidence and report deviations. | Make discretionary production decisions, broaden scope, merge, deploy or alter live data without authority. |
| GitHub | Hold branches, pull requests, CI and merged technical history. | Prove that production behaviour or acceptance criteria are correct by itself. |
| Ops | Make the constrained, server-authorised decisions defined by the product. | Bypass audit, authorisation or independent listing/ownership/trust/commercial states. |
| Automation | Gather, validate, normalise and report evidence. | Invent facts or make discretionary publication, ownership, claim or commercial decisions. |

## 3. Issue readiness gate

An issue may move from **Backlog** to **Todo** only when all of these are true:

- its governing authority source is linked;
- its outcome, scope and out-of-scope boundary are explicit;
- acceptance criteria are observable and testable;
- required data, security, automation, Ops, UI and communications effects are named;
- blockers and owning lane are correct;
- a release/holding-posture impact is stated; and
- any product decision still needed is explicitly marked as a blocker.

If any item is missing, improve the issue or return it to Backlog. Do not begin implementation merely because the title sounds useful.

## 4. Execution protocol

### Before a material phase

1. Refresh `origin/main` and inspect the shared worktree/branch state.
2. Read the issue, its dependencies, the governing authority and the current factual baseline.
3. Record a material contradiction or scope expansion in the Decision Log and Linear before editing code.
4. Work in an isolated `codex/` branch or worktree. Do not treat unmerged lane work as accepted truth.

### While implementing

- Change only what the issue authorises.
- Keep public holding, data and security boundaries active unless the issue explicitly and validly changes them.
- Use the smallest useful verification after each meaningful change.
- Keep data migrations, user-facing flows, background work and Ops evidence aligned; do not ship only one layer of a journey.
- Stop and escalate when evidence contradicts the issue, a migration/data effect is uncertain, a security boundary changes, or another lane has changed the same area.

### Before review

1. Refresh the remote baseline and inspect concurrent work again.
2. Run the issue's relevant tests, build and any required database/browser/hosted-workflow checks.
3. Push the isolated branch and capture CI evidence.
4. Update the Linear issue with files changed, commands/checks, results, data/deployment impact and remaining uncertainty.
5. Move it to **In Review** only when every acceptance criterion has evidence. Otherwise leave it In Progress.

### Review, merge and release

- Review checks scope, authority alignment, dependency state, test evidence and unintended changes.
- A merge requires a current-baseline comparison; a merge is not a deployment or final acceptance.
- A public release requires the relevant journey, data, Ops and automation evidence plus explicit owner release authority.
- **Done** requires the issue's evidence, not a commit, pull request or optimistic status update.

## 5. Required evidence by change type

| Change | Minimum evidence before In Review |
| --- | --- |
| UI or user journey | Relevant browser flow on mobile/desktop, error/recovery state and accessibility check. |
| Database or lifecycle | Migration/reconciliation result, authorised-transition tests, preserved audit evidence and rollback/recovery impact. |
| Automation | Unit/integration check, hosted run/artifact, failure/exception behaviour and proof of no prohibited state change. |
| Ops | Authorisation check, constrained action result, queue state and audit event evidence. |
| Communications | Approved catalogue entry, sender/recipient/content boundary, delivery/failure state, retained evidence and user fallback. |
| Public release/SEO | Production route, sitemap/canonical/redirect evidence, public-data eligibility and owner release decision. |

## 6. Deviation and stop rules

| Finding | Required action |
| --- | --- |
| Authority conflict | Stop implementation; log the conflict; route to `SUB-7` or a dedicated decision issue. |
| Security, privacy, audit or live-data risk | Stop the affected path; preserve evidence; do not experiment in production. |
| A new user journey, provider, sender or paid offer | Create/propose a scoped issue and obtain owner approval before implementation. |
| Stale documentation or incorrect status | Correct it through reviewed documentation work; do not use it as authority in the meantime. |
| External provider failure | Preserve the failure/attempt evidence, use the approved fallback if available and surface an exception. |
| Overlapping lane change | Refresh branches, compare the shared surface and agree the dependency/owner before merging. |

## 7. Cross-lane rule

Each issue belongs to the lane that owns its primary outcome. It may depend on work in other lanes but must not duplicate their implementation.

- Main Platform owns shared states, public routes, security foundations and release gates.
- User Workflows owns the resident, owner, submitter and reporter experience.
- Operations owns protected queues, decisions and audit visibility.
- Automation owns evidence acquisition, background runs, retries and exceptions.
- Communications owns approved account access and transactional delivery.
- Monetisation remains deferred until separately approved.

## 8. Current controlled entry point

`SUB-16` establishes this protocol. `SUB-7` is the first product decision gate: it reconciles claim policy, Communications scope, authority conflicts and journey acceptance before feature issues move to Todo.

`SUB-5` remains in review as a bounded automation hardening change. `SUB-6` remains parked. The holding posture, public containment and disabled billing posture remain unchanged.

## 9. Working cadence

- **Before each material phase:** remote refresh, worktree inspection and issue/authority read.
- **At each meaningful discovery:** Decision Log plus Linear update when it changes scope, policy, risk or dependency.
- **Before every review or merge:** refresh baseline again and attach evidence.
- **After every merge or release:** verify the factual result, record any deviation and update the relevant issue/project status.

This cadence is mandatory control, not bureaucracy: it replaces repeated re-audits and prevents the project from drifting.
