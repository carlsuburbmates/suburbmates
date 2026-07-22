# Public release acceptance and ongoing verification

The owner authorised the first public release on 23 July 2026. This register preserves the evidence still required after release and the rollback rule: a material public safety, privacy, integrity or route failure means deliberately disable the public-launch gate and record why.

## 1. Operator review

- Sign in to `/ops`.
- Review one candidate in **Candidates**. Acknowledge or dismiss it; confirm this does not publish a listing.
- Open one listing and record an ABN check. Confirm the result is evidence only.
- As a claimed owner, submit one real authorised image; in Ops, approve or reject it with a reason. Confirm the image remains private until approved.

## 2. Owner and submitter journeys

- Claim an existing business using the intended account. Confirm the request is pending and visible in the dashboard; it must not publish or grant ownership automatically.
- Submit a profile change. Confirm it stays pending until an operator decides it.
- Add a missing business. Confirm it creates a private review item and the submitter can see its private status after signing in.
- Submit one correction, claim-help, or privacy request. Confirm it reaches Ops and is not public.

## 3. Communications

- Test one permitted status message and one deliberate delivery failure. Confirm the in-product status remains usable and Ops can see the delivery result. Never enable retries, bulk sends, marketing, or a general inbox.

## 4. Public release candidate

Maintain the following release checks and record any failure:

- Browse, category and suburb routes show only eligible listings.
- A vendor profile has correct contact details, canonical URL, redirect behaviour, and no unintended private data.
- Sitemap contains only eligible public routes.
- Metadata and robots directives are appropriate for released routes.
- Stripe remains disabled.

## 5. Release evidence and rollback

- The release decision is recorded in D-011 and Linear `SUB-14`.
- The public launch gate is enabled.
- Home, browse, one taxonomy page, one vendor profile and the sitemap were verified at first release; repeat this check after material public-route changes.
- If any acceptance item fails, disable the public launch gate and record why. Do not work around a failure by publishing more listings.
