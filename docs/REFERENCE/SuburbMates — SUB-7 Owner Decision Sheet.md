# SuburbMates — SUB-7 Owner Decision Sheet

## How to use this sheet

These are the few decisions that affect many future issues. Choose the recommended position, select another option, or write a short variation. No choice in this document changes the live site by itself.

Current fact remains: the site is in holding mode; the directory is not publicly browsable; the only approved outbound email is the operator magic-link sign-in path; Stripe is disabled.

## 1. How an existing business owner claims a listing

### Current implementation

An owner can sign in with the email already recorded on an unclaimed listing and claim it automatically. Older Ops material instead describes evidence review by an operator.

### Options

| Option | What happens | Trade-off |
| --- | --- | --- |
| A. Automatic email-match | A matching contact email gives ownership immediately. | Fastest, but a stale/shared email may give the wrong person control. |
| B. Review every claim | Every claimant supplies evidence and waits for an operator decision. | Strongest control, but adds friction and workload. |
| C. **Recommended: email-match with an exception path** | A matching email gives the normal claim result; conflicts, later challenge, sensitive changes or non-matching evidence enter the protected Ops review path. | Keeps claiming easy while retaining a practical correction/revocation route. |

**Decision:** A / B / C / variation: ______

## 2. What happens when a person submits a missing business

### Proposed target

A submission is always private first. It must not create a self-service public profile or overwrite an existing business.

### Options

| Option | What happens | Trade-off |
| --- | --- | --- |
| A. Operator-review only | Every candidate waits for manual review. | Maximum control; slowest catalogue growth. |
| B. **Recommended: deterministic qualification with exception review** | Approved-source, in-scope, identifiable, deduplicated candidates that pass the policy become unclaimed listings; uncertain or risky candidates enter Ops review. | Scales the directory while preserving evidence and exceptions. |
| C. Direct self-service profile | The submitter creates a live business profile. | Not recommended: easy to abuse and conflicts with the directory-first model. |

**Decision:** A / B / C / variation: ______

## 3. Communications after public release

### Current fact

While holding, only passwordless sign-in from `auth@suburbmates.com.au` is enabled. There is no public support inbox, contact dispatcher, marketing mail or general notification system.

### Options

| Option | What happens | Trade-off |
| --- | --- | --- |
| A. Keep email to sign-in only | Users see statuses only inside the product; contact is handled in Ops. | Simplest, but people may miss outcomes. |
| B. **Recommended: staged transactional messages** | Keep sign-in email; add only approved final-status messages one at a time for claims, submissions or reports, with an in-product fallback. | Useful without creating a general messaging platform. |
| C. Broad notification system | Add automatic receipts, reminders, support inboxes and marketing. | Not recommended now: high maintenance and unnecessary scope. |

**Decision:** A / B / C / variation: ______

If B: approve only the message types that are genuinely needed:

- claim accepted / declined / more information needed;
- profile change accepted / declined;
- submission or report outcome;
- privacy-request outcome.

## 4. Public directory release standard

### Current fact

Holding mode stays active: no-index page, empty sitemap and no public directory routes.

### Options

| Option | What happens | Trade-off |
| --- | --- | --- |
| A. Release as soon as records are available | Lift holding when listings exist. | Fast, but risks exposing incomplete journeys. |
| B. **Recommended: release after thin end-to-end acceptance** | Release only after resident discovery, owner claim, submission/report, Ops decisions, lifecycle controls and public SEO routes have each been proven once. | A focused, practical launch gate. |
| C. Wait for every future feature | Hold until every optional refinement is complete. | Safest but delays useful launch unnecessarily. |

**Decision:** A / B / C / variation: ______

## 5. Correction, removal, privacy and challenge requests

### Proposed target

People can report wrong/unsafe information or submit a privacy/removal request. It becomes a private, audit-recorded Ops item; it never silently deletes a listing or audit history.

### Options

| Option | What happens | Trade-off |
| --- | --- | --- |
| A. Manual email-only handling | Requests are handled outside the product. | Low build cost; weak tracking and inconsistent outcomes. |
| B. **Recommended: private tracked request flow** | A simple form creates a protected Ops request with status, decision reason and safe outcome. | Clear accountability without building a support CRM. |
| C. Automatic removal | A request immediately hides/deletes public information. | Not recommended: vulnerable to abuse and destroys review evidence. |

**Decision:** A / B / C / variation: ______

## 6. What counts as a complete first public launch

### Recommended definition

The first launch is complete when a resident can find and use a listing; an owner can claim or obtain a clear claim outcome; a person can submit a missing business or report a concern; Ops can make and audit the necessary decisions; automation surfaces evidence and failures; and the public routes/sitemap reflect only eligible records.

It does **not** require Stripe, a broad email platform, bulk ABN checks, AI publication, or every visual refinement.

**Decision:** approve / change: ______

## Decision record

When the owner approves these choices, record each final answer in the Decision Log, update `SUB-7`, then move only the newly ready dependent issues to Todo. The current holding posture remains until the separate public-release acceptance issue is complete.
