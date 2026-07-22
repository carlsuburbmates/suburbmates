# SuburbMates — Communications and Account-Access Specification

## Purpose

This is the approved design contract for account access and staged transactional communication. It prevents a broad email system from appearing by accident while still giving people clear outcomes.

## Operating rule

The product status screen is the source of a person's request outcome. A message is an approved supplement, never the only evidence of a claim, submission, report or privacy decision.

## Current release posture

| Capability | Status |
| --- | --- |
| Email-and-password sign-in | Active for existing authorised accounts; no public account-registration screen is provided. |
| Password reset from `auth@suburbmates.com.au` | Active. It returns only to the real SuburbMates callback, where the person sets a new password. |
| Email-code sign-in | Available as a fallback through an eight-digit code entered in the browser being used. |
| Public contact/help/privacy form | Publicly reachable; it creates a private, moderated request and does not promise an email. |
| Approved status messages | Enabled only for the approved claim, profile-change, submission and request-outcome paths. The first real successful delivery and deliberate failure evidence are still required. |
| Contact dispatcher / general notification sender | Dormant; not enabled. |
| Marketing, newsletters, public support inbox, bulk messages, automatic retries | Prohibited. |

## Staged message catalogue

No row below becomes enabled until its associated user journey and Ops workflow are accepted. `auth@suburbmates.com.au` remains the only active sender. A separate sender for a future catalogue row must be explicitly approved in that implementation issue; none is approved by this contract. Each enabled message contains no private evidence beyond the necessary status and has an in-product fallback.

| Stage | Message | Trigger | Recipient | In-product fallback | Ops evidence |
| --- | --- | --- | --- | --- | --- |
| Active | Password reset | An existing authorised account requests a reset. | Requesting email. | Reset page and login retry guidance. | Auth provider result; no application message ledger required. |
| Active | Email-code sign-in | Person deliberately chooses the fallback code path. | Requesting email. | Login page/retry guidance. | Auth provider result; no application message ledger required. |
| 1 | Claim status | Claim needs information, is approved, rejected or revoked. | Authenticated claimant's approved address. | Owner request-status feed. | Claim ID, status, template/version, delivery result. |
| 1 | Profile-change status | Proposed change is approved or rejected. | Authenticated owner. | Owner request-status feed. | Change-request ID, status, template/version, delivery result. |
| 2 | Missing-business outcome | Candidate is accepted, needs information or declined. | Submitter only when they supplied a valid contact basis. | Submitted reference/status path where offered. | Candidate ID, outcome, consent/contact basis, delivery result. |
| 2 | Report/correction/privacy outcome | Operator closes a request and a reply is appropriate. | Requester only when contact basis permits it. | Private request reference/status path where offered. | Request ID, outcome, delivery result and operator reason. |

## Contact/help/privacy intake

The public form must classify the request before it reaches Ops: correction, claim help, privacy, technical problem or another allowed topic. It applies validation, rate limiting, Turnstile and consent. It saves a private request and displays an honest on-screen receipt; it must not promise an email or change a listing automatically.

## Delivery and failure rules

- Store only the minimum message metadata: type, linked entity, recipient reference, template/version, provider result, timestamps and correlation ID. Do not store email bodies in the ledger.
- A failed delivery creates an observable Ops state; it is not retried automatically.
- A sender, recipient or template may be used only for an approved catalogue row.
- A message never grants ownership, publishes/unpublishes a listing, changes trust/commercial state or exposes private evidence.
- Retention follows the associated private request/claim policy; delivery metadata remains private and auditable.

## `SUB-15` delivery boundary

`SUB-15` verifies this specification against the current Auth, contact and dormant delivery-ledger implementation, identifies the minimum migration/API/UI changes, and splits `SUB-13` into one implementation issue per enabled message stage. It does not enable an additional sender, dispatcher or outbound message.

## Evidence required before review

- authenticated password sign-in and password-reset recovery check;
- fallback email-code, expiry and recovery check;
- contact input validation/abuse-control and private-queue boundary check;
- review of delivery-ledger access, audit and retention boundaries;
- explicit confirmation that no dormant dispatcher became active; and
- a proposed `SUB-13` child-issue list, one per enabled message path.
