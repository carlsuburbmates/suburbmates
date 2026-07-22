# Self-Service Claim Flow

## Status

This records the current direct email-match implementation. It is not the complete approved public claim policy.

Listings are public before, during, and after ownership is claimed. An exact match to the recorded contact email is the approved normal claim path. The completed product also requires a protected, auditable exception, challenge, recovery and revocation path for conflicts, sensitive changes and non-matching evidence. That exception path is not established merely by the direct claim flow below.

1. A business owner signs in through the email-code flow using the email address recorded on their listing.
2. `/claim` calls `list_claimable_vendors_for_current_email()`, which returns only unclaimed listings whose `contact_email` matches the authenticated email.
3. The owner selects a listing. `claim_vendor_for_current_email(UUID)` locks that row, checks the same email match again, then atomically assigns `owner_id` and sets `is_claimed`.
4. The owner can update their profile from the dashboard. The listing stays public throughout. Sensitive changes and any conflict/revocation path follow the separate approved Ops workflow.

`npm run claim:test` verifies that anonymous users cannot inspect eligible listings, another authenticated email cannot see or claim the listing, the matching email can claim it, and publication survives the claim. The temporary test users and listing are removed afterwards.
