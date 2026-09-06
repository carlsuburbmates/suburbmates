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

Open `/ops` and sign in with `admin@suburbmates.com.au` using the normal password form. If the password is unavailable, use **Set or reset password**. The eight-digit email code is a fallback: request it, then enter the newest code in the browser you are using. The email can be opened on another device. If a code fails, wait for the stated email limit before requesting another.

## Daily review — 5 to 15 minutes

1. **HubSpot Decision Inbox (optional)** — use it as your short to-do list when it has tasks. Open the linked SuburbMates page; do not make the decision in HubSpot. It never contains private messages or evidence.
2. **Work** — open only the genuine decisions that need judgment; use its priority groups rather than treating background evidence as a queue.
3. **Businesses** — find a vendor, its authorised evidence and its protected detail/actions when Work links you there or you need to look something up.
4. When Work is empty, stop. Do not inspect background evidence or provider dashboards to create work for yourself.

When an Ops decision reaches its final state, its matching HubSpot task closes automatically. If HubSpot is unavailable, complete the protected Ops decision anyway; the next reconciliation catches up. See [the HubSpot Decision Inbox contract](HUBSPOT_DECISION_INBOX.md).

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

System warnings are supporting information, not permission to change a listing. Follow the warning's exact recovery step once; never edit a business record to compensate for failed automation. The stable [Operations Health issue](https://github.com/carlsuburbmates/suburbmates/issues/104) links the affected workflow and reopens or closes automatically. If a bounded retry fails again, leave the warning open and the affected source paused. Existing public and owner-approved information remains unchanged.

## Weekly review — 10 to 20 minutes

1. Open **System** and read **This week at a glance**.
2. If **Action needed now** is zero, review the directory-activity and profile-coverage summaries, then stop.
3. If a recovery card appears, follow its exact safe step and use **Open Operations Health**. Retry only once.
4. Check whether visitors are progressing from search to profiles and direct contact, and whether the claimed-profile pilot is gaining complete profiles.
5. Leave routine inspections, blocked website domains, repeat discoveries and historic evidence alone unless System explicitly surfaces a threshold or owner-impact warning.

Normal operation never requires a terminal, database console, deployment command, raw provider log or Codex. GitHub is used only through the linked Operations Health page for a bounded workflow retry.

## Boundaries

Do not use Supabase, Cloudflare, Resend, Stripe, deployments, or raw logs for normal work. Stripe, pricing, and billing are not part of normal Operations work.

The locked product authority is in `docs/REFERENCE/`. The implementation record and unresolved launch gates are in `docs/HANDOVER.md` and `COVERAGE.md`.
