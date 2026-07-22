# Public release acceptance

Do not turn on public launch until every applicable item below has a recorded result. A failed item means leave the holding page on.

## 1. Operator review

- Sign in to `/ops`.
- Review one candidate in **Candidates**. Acknowledge or dismiss it; confirm this does not publish a listing.
- Open one listing and record an ABN check. Confirm the result is evidence only.
- As a claimed owner, submit one real authorised image; in Ops, approve or reject it with a reason. Confirm the image is not public while holding remains on.

## 2. Owner and submitter journeys

- Claim an existing business using the intended account. Confirm the request is pending and visible in the dashboard; it must not publish or grant ownership automatically.
- Submit a profile change. Confirm it stays pending until an operator decides it.
- Add a missing business. Confirm it creates a private review item and the submitter can see its private status after signing in.
- Submit one correction, claim-help, or privacy request. Confirm it reaches Ops and is not public.

## 3. Communications

- Confirm the email feature gate remains off unless an explicit release decision enables it.
- If enabled later, test one permitted status message and one deliberate delivery failure. Confirm the in-product status remains usable and Ops can see the delivery result. Never enable retries, bulk sends, marketing, or a general inbox.

## 4. Public release candidate

Only after the above passes, enable the release candidate in a controlled environment and verify:

- Browse, category and suburb routes show only eligible listings.
- A vendor profile has correct contact details, canonical URL, redirect behaviour, and no unintended private data.
- Sitemap contains only eligible public routes.
- Metadata and robots directives are appropriate for released routes.
- Stripe remains disabled.

## 5. Release and rollback

- Record the release decision in Linear and the Ops audit trail.
- Enable the public launch gate.
- Immediately verify home, browse, one taxonomy page, one vendor profile, and the sitemap.
- If any acceptance item fails, disable the public launch gate and record why. Do not work around a failure by publishing more listings.
