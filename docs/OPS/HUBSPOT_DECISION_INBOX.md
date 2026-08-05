# HubSpot Decision Inbox Contract

## Purpose

HubSpot is the solo operator's daily **Decision Inbox**. SuburbMates `/ops` remains the protected **Decision Room** and the only place that changes directory, ownership, profile, contact, privacy, or audit state.

## What reaches HubSpot

Exactly one HubSpot task may exist for each current, genuine operator action:

Clearly labelled test and acceptance fixtures are excluded and are automatically closed if an earlier sync created a task for them.

| Label | Source in SuburbMates | HubSpot contents | Closure condition |
| --- | --- | --- | --- |
| Listing review | A listing in `draft` or `pending_review` | Plain title, priority, safe business name, direct `/ops/listings/:id` link | Listing no longer needs review after a protected decision. |
| Possible duplicate | An open, sole `possible_duplicate` exception | Plain title and direct protected evidence link; no raw candidate data | Exception is acknowledged or dismissed, or its related review changes state. |
| Ownership claim | A `pending` or `needs_information` claim | Safe business name and `/ops/claims/:id` link; no claimant identity or evidence | Claim is decided. |
| Profile change | A `pending` profile-change request | Safe business name and `/ops/profile-edits/:id` link; no proposed values | Request is decided. |
| Contact or privacy request | A `new` or `in_progress` contact request | Request class and `/ops/contact/:id` link only; business name only when explicitly safe | Request reaches a terminal decision. |
| System issue | A failed, degraded or stale monitored health row, or a failed job | Plain service/job label and `/ops/system` anchor; no error payload | The monitored issue is healthy/current or the failed job is no longer actionable. |

## Never send to HubSpot

- directory-wide listings, background exclusions, repeat discoveries, or historic evidence gaps;
- private contact message text, requester details, claimant details, evidence, ABNs, account data, media paths, audit notes, provider errors, or credentials;
- a HubSpot action that publishes, claims, edits, deletes, or otherwise changes a SuburbMates record.

## Technical boundary

The one-way integration creates or updates HubSpot **Tasks** only. Every task includes one canonical protected SuburbMates link and uses a stable SuburbMates work identifier. A successful protected Ops decision attempts to close its mapped HubSpot task, but a HubSpot outage must never block or reverse the decision. The next bounded reconciliation closes anything missed.

Credentials are server-only and least-privilege within HubSpot's available model: the Task API mandates the single coarse `crm.objects.contacts.write` scope even for unassociated Tasks. The integration code uses that token only for Task create/update calls; it never reads or writes contacts, companies, deals, marketing, billing, or sensitive data. The token is never exposed to the browser or stored in the database.

## Operator routine

1. Open HubSpot and work only the short Decision Inbox.
2. Open the linked `/ops` page.
3. Read the protected evidence and make the bounded decision there.
4. The corresponding HubSpot task closes automatically; background evidence remains out of sight.
