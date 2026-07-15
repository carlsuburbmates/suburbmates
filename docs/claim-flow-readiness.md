# Self-Service Claim Flow

Listings are public before, during, and after ownership is claimed. There is no staff queue, approval step, rejection step, or publication gate.

1. A business owner signs in through the magic-link flow using the email address recorded on their listing.
2. `/claim` calls `list_claimable_vendors_for_current_email()`, which returns only unclaimed listings whose `contact_email` matches the authenticated email.
3. The owner selects a listing. `claim_vendor_for_current_email(UUID)` locks that row, checks the same email match again, then atomically assigns `owner_id` and sets `is_claimed`.
4. The owner can update their profile from the dashboard. The listing stays public throughout.

`npm run claim:test` verifies that anonymous users cannot inspect eligible listings, another authenticated email cannot see or claim the listing, the matching email can claim it, and publication survives the claim. The temporary test users and listing are removed afterwards.
