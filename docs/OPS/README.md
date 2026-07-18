# SuburbMates Operations

This is the working guide for one person operating SuburbMates. Use the Operations area for normal work; you do not need to understand the database, hosting, email provider, code, or technical logs.

## Your responsibility

Make careful, explainable decisions about listings and requests. Before deciding, answer:

1. What happened?
2. What evidence supports the decision?
3. What will change for the public, owner, or requester?
4. What will not change?

Write the reason in the decision note. The system keeps it as permanent audit evidence.

## Getting in

Open `/ops` and sign in with `admin@suburbmates.com.au`. Open the email link in the same browser that requested it. If a link fails, wait for the stated email limit and use the newest link; do not repeatedly request more links.

## Daily order

1. **Listings** — decide whether a business is suitable for the public directory.
2. **Claims** — decide whether a person should control an existing listing.
3. **Profile edits** — decide whether an approved owner’s proposed public changes are accurate.
4. **Contact** — handle support, correction, claim-help, and privacy messages.
5. **System** — notice warnings and confirm decisions appear in the permanent record.

Routine exact-email claims are intended to be low-friction. Claims requiring a challenge, recovery, revocation, conflict resolution or sensitive-change review belong in the protected Claims queue. A claim never publishes a listing or changes unrelated trust/commercial state.

If a queue grows, use **Next page** and **Previous page** at the bottom. Each page has up to 100 items. An empty queue needs no action.

## Decisions

| Queue | Safe choices | What changes |
| --- | --- | --- |
| Listings | Save a draft, move to review, publish, approve changes, reject, unpublish | Only explicit publication makes a listing public. A claim, payment, ABN result, tier, or automated check never publishes it. |
| Claims | Request information, approve, reject, revoke | Ownership only. A claim decision never publishes a listing or alters its public details. |
| Profile edits | Approve or reject | Only approved public fields change. Ownership, publication, payment, tier, and ABN stay unchanged. |
| Contact | Start work, return to new, resolve, mark spam, reopen, restore | Only the private request status changes. Listings and ownership stay unchanged. |

When uncertain, leave a listing unpublished, save a draft, request information, or record why more review is needed. Do not invent business facts, delete records to tidy up, overwrite evidence, or use automation as a substitute for your decision.

## System warnings

System warnings are supporting information, not permission to change a listing. If a warning says it needs technical help, record it and ask for help. You do not need provider dashboards for routine operations.

## Boundaries

Do not use Supabase, Cloudflare, Resend, Stripe, deployments, or raw logs for normal work. Stripe, pricing, and billing are not part of normal Operations work.

The locked product authority is in `docs/REFERENCE/`. The implementation record and unresolved launch gates are in `docs/HANDOVER.md` and `COVERAGE.md`.
