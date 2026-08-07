# Exact-email claim-request flow

## Status

This records the current exact-email claim-request implementation. It is not automatic ownership, and it is not the complete approved public claim policy.

Listings are public before, during, and after ownership is claimed. An exact match to the recorded contact email is the approved normal claim path. The completed product also requires a protected, auditable exception, challenge, recovery and revocation path for conflicts, sensitive changes and non-matching evidence. That exception path is not established merely by the direct claim flow below.

1. A business owner signs in with their password, using password reset or the eight-digit email-code fallback if needed, with the email address recorded on their listing.
2. `/claim` calls `list_claimable_vendors_for_current_email()`, which returns only unclaimed listings whose `contact_email` matches the authenticated email.
3. The owner selects a listing and submits a connection explanation, with an optional 11-digit ABN. `submit_claim_for_current_email(UUID, TEXT, TEXT)` locks the listing, checks the email match again, and creates a private `pending` claim request.
4. The request changes neither `owner_id` nor `is_claimed`, and does not change publication. An active operator makes the protected request-information, approval, rejection or revocation decision with an audit reason.
5. The owner sees the outcome in their Dashboard. An approved claim changes ownership only; the listing stays independently public or private according to its lifecycle.

The removed `claim_vendor_for_current_email(UUID)` route must not be restored. `npm run claim:test` verifies the pending-request boundary: anonymous and non-matching users cannot claim; an exact match creates only a pending request; publication and ownership remain unchanged until the protected Ops decision. It is mutation-bearing and must use a disposable environment or the explicitly authorised audit procedure.
