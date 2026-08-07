# Ops coverage and open gates

## Verified scope

- `/ops` requires a valid session and active server-side operator membership.
- Listing, claim, profile-edit, and contact decisions use authorised server-side routines and append permanent audit records.
- Queue pages use protected pagination rather than silently stopping at 100 records.
- System status and decision history use plain English and do not display raw provider errors, metadata, or internal reference IDs.
- The owner-status feed is read-only and returns only request type, status, controlled explanation, next step, and dates for the signed-in owner’s own claim and profile-change requests.
- The one-way HubSpot Decision Inbox may mirror a genuine decision as a low-detail task, but the protected Ops action remains the only place that changes SuburbMates data.

## What remains for acceptance

The owner-status feed is a data boundary for User Workflows to display; this Ops change does not create another owner screen. A browser acceptance can use the first genuine request. Do not create fake production requests because the audit trail is permanent.

## Boundaries

- No listing publication, ownership change, import, deploy, Stripe, pricing, or billing change is included.
- The released public directory, public owner dashboard display, and automation presentation belong to their respective lanes.
- Technical repair remains exceptional. The operator should record a warning and ask for help, not use provider dashboards.
