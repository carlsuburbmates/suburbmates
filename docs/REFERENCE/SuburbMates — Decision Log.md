# SuburbMates — Decision Log

## Purpose

This log records owner-approved product decisions and material departures from the current implementation or older documents. It prevents a branch, a lane report, or an outdated specification from silently becoming product policy.

It is a durable repository record. Linear mirrors the active decision and implementation work; GitHub records reviewed technical changes; live production remains the factual release baseline.

## Decision protocol

For every material decision or deviation:

1. record the owner decision, source and date here;
2. link the Linear issue(s) that will align implementation, tests and documentation;
3. identify whether the current production behaviour differs;
4. preserve the discrepancy until it is deliberately resolved through review; and
5. close the record only with repository, database and live-verification evidence where applicable.

No branch, pull request, automation run or lane handover changes product policy by itself.

## Active decisions

### D-001 — Target-state authority and change control

- **Date:** 19 July 2026
- **Decision:** The Target State and Operating Authority is the concise owner-approved operating direction. Where it conflicts with older planning language, the intended direction is authoritative, but implementation must be aligned through explicit work rather than silently changed.
- **Current state:** Older documents still contain manual-publication and holding-posture assumptions. Production was deliberately released on 23 July 2026; the manual safeguards remain in force while the deterministic qualification direction is completed.
- **Required alignment:** Reconcile the Master Architecture, Operations Specification, handover and lane documents; then implement and verify the target state through reviewed issues.
- **Evidence to close:** Updated authority documents, linked issue evidence and a release decision.

### D-002 — Directory-first default unclaimed publication

- **Date:** 19 July 2026
- **Decision:** A business that deterministically qualifies from an approved source is intended to appear in the directory by default as an unclaimed listing. A business does not need to register, claim, provide an ABN or pay before it appears.
- **Guardrail:** "Found" means an approved, in-scope, identifiable, deduplicated candidate without known material safety or legitimacy concerns. Provenance and the qualifying evidence must be retained. Exceptions remain visible to an operator and audit-recorded.
- **Current state:** The token-protected OpenStreetMap handoff automatically creates a new unclaimed listing only after deterministic qualification and retained evidence. The existing catalogue completed a private requalification pass under `existing-catalogue-v2` on 26 July 2026: 619 qualified and 982 exceptions across 1,601 listings, with no lifecycle or public-visibility change. The public launch gate remains enabled by the owner's release decision.
- **Required alignment:** Maintain and prove the qualification, evidence, duplicate, exception and lifecycle controls for every new approved-source candidate.
- **Evidence to close:** Policy implementation, tests, controlled data-path verification, operator exception evidence and authorised public release verification.

### D-003 — Owner participation and public input

- **Date:** 19 July 2026
- **Decision:** Claiming establishes ownership; it does not decide whether an otherwise legitimate listing is published. Owners may propose profile corrections and supporting information through moderated workflows. A public missing-business submission creates a private candidate and cannot publish raw input directly.
- **Current state:** Claim, private status, profile-change, owner/community submission, validation, moderation and bounded transactional-status flows are implemented. A real owner submission and claim have been approved and their permitted status deliveries recorded. Profile-change, community-submission and contact/correction outcomes still need real-world acceptance evidence.
- **Required alignment:** Maintain the existing claim, request-status, profile-change, submission, validation, abuse-control, moderation and necessary transactional communication boundaries.
- **Evidence to close:** The remaining real user and operator acceptance evidence, including failed and abuse-resistant paths.

### D-004 — Capability scope

- **Date:** 19 July 2026
- **Decision:** Monetisation is the only explicitly deferred product capability. It remains disabled until a real paid offer and its price, benefits, entitlement lifecycle, cancellation/failure behaviour and reconciliation model are approved.
- **Decision:** Core directory, acquisition, trust, owner, moderation, communications, media, accessibility, SEO and operational capabilities are build commitments, subject to their safety controls.
- **Guardrail:** Payment never determines publication, ownership, legitimacy or ranking.
- **Evidence to close:** A separate owner-approved commercial model and fully verified billing implementation, if and when monetisation is activated.

### D-005 — Automation and release evidence

- **Date:** 19 July 2026
- **Decision:** Automation may acquire, normalise, deduplicate and record evidence. It must be idempotent, observable and safe to retry; it must surface exceptions rather than invent facts. AI may not invent public facts or make discretionary publication, claim or ownership decisions.
- **Decision:** Before every material audit, implementation or release phase, refresh `origin/main`, inspect the shared worktree/branch state and use the remote main branch as the audit and release baseline. Refresh again before reporting a phase complete.
- **Guardrail:** No automatic merge, reset, deployment, production data change or policy change follows from that refresh. Unmerged lane work is candidate work, not accepted truth.
- **Evidence to close:** Relevant CI evidence, persisted run and exception evidence, tests, review and live verification where a public or production behaviour changes.

### D-006 — Communications and account access

- **Date:** 19 July 2026
- **Decision:** Communications is a first-class user journey. Existing authorised accounts use password sign-in as the normal path; password reset and the eight-digit email-code fallback are delivered from `auth@suburbmates.com.au`. Only the approved staged status messages may use that sender. A public support inbox, marketing mail, bulk notification system and uncontrolled retries remain disabled.
- **Decision required before expansion:** `SUB-15` must approve the exact post-release message catalogue: trigger, recipient, sender, content boundary, contact/consent basis, retained evidence, failure state, retention and Ops action.
- **Guardrail:** A user must retain an in-product status/recovery path if a message cannot be delivered. A message never changes publication, ownership, trust, commercial or claim state.
- **Evidence to close:** Approved journey/map, message catalogue, authorised implementation and end-to-end delivery/failure evidence for each enabled message.

### D-007 — SUB-7 owner decisions: directory, claims, communications and release

- **Date:** 19 July 2026
- **Claim policy:** An exact match to the listing's recorded contact email is the normal claim path. Conflicts, sensitive changes, challenges, recovery, revocation and non-matching evidence enter a protected, auditable exception path. Claims change ownership only.
- **Missing-business policy:** A submission is private first. Deterministically qualified, approved-source, in-scope, identifiable and deduplicated candidates may become unclaimed listings; uncertain or risky candidates enter Ops exception review. Direct self-service public profile creation is not allowed.
- **Communications policy:** Keep the current sign-in email. After public release, introduce only explicitly approved transactional status messages in stages, with an in-product status/recovery path and no marketing, general support inbox, bulk notifications or uncontrolled retries. `SUB-15` defines the exact catalogue before `SUB-13` implements any message.
- **Release policy:** The first public release is authorised. Continue to record thin end-to-end acceptance evidence for resident, owner, submission/report, Ops, automation and public-route journeys; records existing in the database are not sufficient evidence by themselves.
- **Correction/privacy policy:** Use a private tracked request with operator decision reason and audit history. Never silently delete a listing or audit history, and never automatically remove public information solely from an unreviewed request.
- **First launch:** The initial public launch is complete when the minimum end-to-end journeys above are proven. Stripe, broad email, bulk ABN checks, AI publication and optional polish are not launch prerequisites.
- **Evidence to close:** Update authority/issue descriptions; build the ready foundation work; then verify each public journey and release gate.

### D-008 — Cross-device email-code fallback

- **Date:** 22 July 2026
- **Decision:** The approved `auth@suburbmates.com.au` email-code fallback uses an eight-digit, one-time code entered in the browser where the person wants to sign in. It replaces the browser-bound magic-link interaction; password sign-in remains the normal path for existing authorised accounts.
- **Guardrail:** This changes neither the approved sender nor any other communications capability. Codes expire through Supabase Auth, are single-use, and do not decide a claim, publication, ownership or any other product state.
- **Evidence to close:** A live owner-device test of code delivery, expiry, supersession and successful session handoff, followed by removal of the temporary review callback.

### D-009 — Private missing-business status

- **Date:** 22 July 2026
- **Decision:** A missing-business submission records a separate submitter email for private, signed-in status access. The business contact details remain governed by the at-least-one-contact rule.
- **Guardrail:** Status is plain language only and separate from the operator listing queue. It cannot publish a listing, assign ownership, or send a general notification.
- **Identity rule:** The same email may be used by a submitter and later by a business owner. Authentication never makes it an owner; only an approved claim creates the ownership link.
- **Owner-submitted candidate rule:** A person who owns, manages, or represents a missing business signs in first, submits the private candidate and a relationship explanation, and receives a pending claim request. That combined intake never publishes the candidate or grants ownership automatically.

### D-010 — Operator-run ABN evidence

- **Date:** 22 July 2026
- **Decision:** An operator may check one supplied ABN at a time using ABN Lookup. The full ABN and returned supporting details are private evidence. The public product may show only `ABN checked` when the latest result is active and less than 90 days old.
- **Guardrail:** An ABN check cannot publish or unpublish a listing, grant or remove ownership, affect ranking, change a commercial state, or create a general `verified` badge. Missing, invalid, inactive, not-found and unavailable results are plain-language Ops outcomes, not a negative public label.
- **Operational rule:** There is no bulk job or automatic recheck. When the 90-day evidence window expires, the public signal disappears until an operator deliberately checks again.
- **Evidence to close:** Authorisation, active/inactive/invalid/provider-failure tests; persisted private evidence and audit record; live operator check; and a public projection showing the signal without exposing the ABN.

### D-011 — First public release authorisation

- **Date:** 23 July 2026
- **Decision:** The owner explicitly authorised the first public directory release. The `NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED` gate is enabled in the production deployment.

### D-012 — Password sign-in for existing authorised accounts

- **Date:** 23 July 2026
- **Decision:** Existing authorised accounts may use email and password as the primary sign-in path. Password reset is sent only from `auth@suburbmates.com.au` and returns only to the real SuburbMates callback. The eight-digit email code remains a fallback.
- **Boundary:** This does not add a public account-registration screen, a new sender, marketing email, a general inbox, or application-managed authentication messages.
- **Security rule:** Passwords must be at least 12 characters. The hosted plan does not include Supabase's optional breached-password check; the operator should use a unique password and may enable that provider feature only if the plan changes.
- **Evidence required:** A real reset from the controlled email account, password sign-in in a separate browser/device, and confirmation that the fallback email-code path remains intact.

### D-013 — Bulk automation evidence is not a manual Ops backlog

- **Date:** 24 July 2026
- **Decision:** Routine automated exclusions and repeated discovery events remain private audit evidence, not individual operator tasks. A person reviews only records that require genuine judgment, such as a possible duplicate with no separate automatic exclusion.
- **Decision:** Existing-catalogue evidence gaps are a future batch data-improvement programme. They do not require the operator to process one listing at a time and do not change a listing's visibility by themselves.
- **Boundary:** A confirmed duplicate, missing customer contact method, or unsupported category is safely held by automation. Automation does not merge uncertain duplicates, publish a held record, assign ownership, or delete evidence.
- **Verified result:** Home, browse, a populated category route, a representative published profile and the sitemap return successfully. The sitemap contains 1,685 eligible public URLs; canonical and `www` redirect behaviour are correct; released pages no longer carry the holding-page `noindex` directive; `/ops` still redirects unauthenticated visitors to sign-in.
- **Guardrail:** This authorisation does not enable Stripe, general outbound email, bulk ABN checks, AI publication, raw-candidate publication or automated ownership decisions.
- **Outstanding evidence:** Complete real authenticated owner/submitter and operator walkthroughs, including the candidate-to-Ops, ABN evidence and owner-media paths. Any failure must be recorded and corrected; it is not a reason to publish additional listings.

### D-014 — Address-only matching is not duplicate evidence

- **Date:** 26 July 2026
- **Decision:** A shared street address alone is not a duplicate signal. Shopping centres and multi-tenant buildings legitimately contain many different businesses; automation must not create an operator task merely because two listings share an address.
- **Rule:** Automatic duplicate blocking requires a strong identifier match: the same normalised website, phone number, or both business name and address. Similar names at different addresses remain distinct listings unless separate source evidence shows they are the same entity.
- **Current state:** The existing-catalogue requalification policy is versioned to re-run under this rule. It changes only private evidence status; it does not delete, merge, publish, unpublish, claim or alter any business record.
- **Evidence to close:** Regression coverage for shared-address businesses, a completed requalification run, and an Ops Work list with address-only false positives removed.

### D-015 — Exceptional deletion of rejected listings

- **Date:** 31 July 2026
- **Decision:** The operator may permanently delete one rejected listing from its protected detail view when it was never public and has no linked operational records. A reason and an explicit `DELETE` confirmation are required.
- **Guardrail:** This is not bulk clean-up, does not apply to a public or previously public listing, and must retain an append-only audit event. A record with claims, evidence, drafts, submissions, candidate/requalification links, media or redirect history remains retained.
- **Current state:** The 21 reviewed, never-public rejected records were owner-authorised for deletion. Their audit history was retained.
- **Evidence to close:** Protected-function, UI-boundary and database verification; an authenticated operator walkthrough when a future eligible rejected record exists.

### D-016 — Deployment-complete sync rule

- **Date:** 7 August 2026
- **Decision:** For an owner-authorised deployable change, “sync” includes the normal merge, deployment and live verification path. It does not end at a branch push, pull-request merge or passing CI run.
- **Required evidence:** Record the merged commit or pull request, deployment version or URL, affected live route or integration, and the relevant live result. Public route, sitemap, access-control or catalogue changes also require the production smoke check.
- **Status rule:** Use only `local only`, `in review`, `merged`, `deployed—verification pending`, or `live verified`. A missing deployment or live proof is a stated blocker; it is never silently handed back to the owner.
- **Guardrail:** This rule does not authorise an unapproved product, database, security or commercial change. It completes the normal delivery of an already owner-authorised deployable change.

### D-017 — Technical completion uses controlled non-production evidence

- **Date:** 9 August 2026
- **Decision:** SuburbMates may be declared technically complete without waiting for ordinary businesses or community members to create production cases. Required journey acceptance is proved with automated fixtures and controlled end-to-end testing in a local or disposable non-production environment; it does not require a permanent staging system.
- **Production rule:** Production acceptance is non-mutating: verify public routes, access control, metadata, sitemap, deployment and relevant integrations against real production data. Never create fabricated durable businesses, claims, contact requests, ABN records, media, accounts or audit events in production merely to satisfy acceptance.
- **Controlled-test rule:** Synthetic data must be clearly identified, isolated from production, covered by reset or teardown, and use test identities, inboxes and provider stubs where needed. It must prove the intended success, validation/error, recovery, permission and private/public-data boundaries for each journey.
- **Completion rule:** Technical completion requires automated and controlled end-to-end evidence for every required journey and failure branch, production smoke evidence, no unresolved critical or high-severity defect, and recorded results in the relevant Linear work. Genuine customer activity remains valuable post-release operational validation; it is not a release-blocking prerequisite.
- **Guardrail:** This does not relax any product boundary. Claims, submissions, ABN evidence, media, communications, publication, audit and retention rules must behave identically in the controlled environment; Stripe, general email, AI publication, bulk ABN work and automated media processing remain disabled.
- **Required alignment:** `SUB-14`, the Journey Map, the post-release acceptance register and execution protocol must distinguish technical completion from later real-world observation.

### D-018 — Modern directory automation, useful public profiles and value-first owner participation

- **Date:** 28 August 2026
- **Owner decision:** SuburbMates is to become an automated, evidence-backed local-business product, not an OpenStreetMap-only listing dump or a Yellow Pages replica. A legitimate Darebin business without its own website should be able to receive a useful public SuburbMates profile when sufficient lawfully usable evidence supports its identity and location.
- **Source and evidence rule:** OpenStreetMap remains a permitted discovery source but is no longer the sole intended source. The replacement acquisition system must use a versioned approved-source registry. Every stored public fact must retain field-level provenance, source URL or stable source record, observation time, freshness state and conflict handling. Closed-directory copying, unlicensed storage/display, fabricated facts and undisclosed source substitution remain prohibited.
- **Qualification rule:** A missing website, phone or email does not itself make a legitimate business ineligible for a public profile. Deterministic publication still requires an approved source, in-scope identity, deduplication, safety checks and enough evidence to avoid a misleading page. Existing owner-confirmed facts remain protected from automated overwrite. Ambiguous or conflicting evidence remains private for review.
- **Search and public-product rule:** Public search must interpret grounded resident intent, including ordinary phrasing, category relationships, singular/plural forms, spelling variation, business-name precision and location context. It must not invent businesses or use private request content. Profiles, cards and public journeys must become visually distinctive, useful and mobile-first, with direct contact and local decision support rather than a sparse database presentation.
- **Media rule:** Business imagery, logos and other media require owner permission or a documented compatible licence. Automation may validate, process and moderate permitted submissions, but may not copy arbitrary third-party images or create fake business imagery.
- **Commercial rule:** The intended future commercial offer is an owner-chosen featured/enhancement product delivered after the free directory experience creates real value. Payment must never determine publication, ownership, legitimacy, factual trust signals or organic search ranking. Billing remains disabled until the concrete benefit, price, entitlement, cancellation/failure handling and reconciliation model are separately implemented and approved.
- **Automation rule:** Automation is expected to run continuously: discover, normalise, deduplicate, enrich, refresh, detect conflicts, publish deterministic safe changes and report genuine failures. AI may assist query interpretation, controlled classification and evidence-limited drafts, but may not invent a public fact or make a discretionary publication, ownership, moderation or commercial decision.
- **Required alignment:** Replace the single-source candidate contract, contact-required qualification assumption, one-off existing-catalogue requalification posture and thin-profile public presentation with an auditable multi-source enrichment and refresh lifecycle. Update the acquisition workflow, schema/RLS contracts, tests, `/ops` system evidence, public UI, handover and Linear work before declaring the programme complete.

### D-019 — Safe public source-reported trading hours

- **Date:** 30 August 2026
- **Owner decision:** As part of the approved modern-directory direction, retire the blanket rule that structured source hours can exist only as private evidence. Exact source-supplied hours may improve an otherwise thin public profile when they pass a narrow, reproducible acceptance rule.
- **Public rule:** A schedule is eligible only when it is `24/7` or contains an explicit time range. The stored expression is shown verbatim as **source-reported hours**, with a reminder to check with the business before visiting. Prose-only, seasonal-only, invalid or overlong values remain private evidence and never appear publicly.
- **Safety rule:** Automation may fill only an empty `trading_hours` field on an unclaimed listing. It retains field-level source/provenance/freshness evidence, records a conflicting later observation privately, and never overwrites an owner-controlled or existing schedule. An approved owner may propose a correction through the existing private profile-change review, stale-base and immutable-audit lifecycle; it never updates the public listing directly. This does not create a live “open now” claim, infer holiday exceptions, alter organic ranking, or relax any claim/publication boundary.
- **Evidence to close:** Migration/projection review, acquisition and candidate-handoff regression coverage, Cloudflare release evidence, and an in-app production check after a post-release approved-source observation has supplied an eligible schedule.

### D-020 — Owner-authorised structured website detail preview

- **Date:** 4 September 2026
- **Owner decision:** An approved owner may explicitly ask SuburbMates to read narrowly bounded, machine-readable JSON-LD from the already-recorded HTTPS website for their claimed listing. This is a private form-assistance tool, not a general crawler, candidate source or automated enrichment programme.
- **Safety rule:** The tool reads one recorded website homepage only after an owner opt-in. It follows at most three same-domain HTTPS redirects, bounds response and JSON-LD size, accepts only telephone, email, opening-hours and canonical Facebook/Instagram fields, and never reads or stores page text, HTML, images, cookies, descriptions, analytics, search terms or arbitrary linked pages. The preview is `private, no-store` and does not create a database record.
- **Review rule:** The owner chooses which previewed values are copied into their existing profile-change form. Existing form values are never overwritten; submission still uses the existing owner-only, stale-base, operator-reviewed and immutable-audit path. The preview never alters a public profile, source evidence, ownership, publication, ranking or commercial state.
- **Boundary:** This permission did not authorise bulk website crawling, scraping an unclaimed business site, third-party images, generic page-copy reuse, automatic public updates, or treating a website as a versioned approved discovery source. D-021 supersedes that boundary only for the separately versioned and evidence-limited official-website enrichment lifecycle; it does not expand this owner-preview route.
- **Evidence to close:** Utility/route/UI boundary tests, controlled owner-route acceptance, Cloudflare release evidence and a non-mutating production access check. A genuine owner use is valuable operational evidence but is not a reason to create a synthetic production request.

### D-021 — Evidence-limited official website enrichment precedes monetisation

- **Date:** 4 September 2026
- **Owner decision:** D-020 is a useful compliance foundation, not the finished enrichment model. The directory will become visually rich and substantially more useful through two autonomous but distinct tracks: evidence-limited factual enrichment for a controlled unclaimed-site pilot, then scaled safe refresh; and owner-authorised rich import for claimed profiles. It must not begin with a blanket scrape of all listed websites.
- **Unclaimed factual-pilot rule:** Before any scaled refresh, test 25–50 recorded, verified official HTTPS domains under a versioned `official_business_site` contract. The crawler identifies itself, obeys `robots.txt` and explicit site terms, and fails closed on disallow, server/network failure obtaining robots, uncertain domain identity, authentication, paywall, bot challenge or unsupported content. It is bounded to structured data and clearly factual material on the homepage and a small same-domain allowlist of labelled Services, Contact, Booking or Menu pages. It is never a discovery source and cannot create or publish a business.
- **Evidence and factual-content rule:** Retain source URL, observation time, freshness, confidence, content fingerprint and field-level evidence/conflicts. Extract only explicit business facts—contact channels, hours, services/specialties, booking/menu destinations, areas served, accessibility and comparable useful attributes. Generate a concise neutral summary only from retained facts; never copy or closely paraphrase marketing prose. Existing owner-approved facts are never overwritten; ambiguity is private evidence or a suggested change.
- **Rich owner-import and media rule:** A claimed business may explicitly request a private import from the homepage plus the narrow same-domain allowlist. The owner reviews and edits proposed services and summary, then chooses real images, uploads media, or authorises exact website images while attesting to reuse rights. Before public display, an authorised image is copied to private SuburbMates storage with its source, permission attestation, hash and date, then follows the existing moderation, correction and takedown workflow. No website image, logo, testimonial, review, marketing prose or Google-derived content is automatically copied, stored or displayed.
- **Autonomous licensed visual-context rule:** The public product may automatically select licensed category-context imagery for unclaimed profiles using the existing category taxonomy plus factual service signals, a curated keyword map, landscape composition, unsuitable-content exclusions and diversity controls. It is not a business image, quality signal or evidence of business activity. It must say **“Licensed category image — does not depict this business”** and show the provider/photographer credit and provider link. Relevant generic people, products, services in action, tools, workplaces and premises are allowed when clearly presented as category context rather than the listed business. Do not use recognisable brands, logos, watermarks, prominent signage, text-heavy imagery or a caption implying business endorsement. Pexels is the active recorded provider contract and its key remains server-only. Do not introduce external visual-AI or website-colour-analysis services solely to select stock context.
- **Presentation and measurement rule:** Homepage and category discovery modules may feature profiles with more source-backed useful facts and visual context, but organic directory search remains neutral and unchanged. Aggregate first-party measurements may compare profile views and direct contact, booking, menu and directions actions for enriched versus unchanged profiles; they retain neither visitor identity nor search text.
- **Commercial rule:** Stripe, pricing, entitlements and paid placement remain paused. A paid offer cannot be considered until a 25–50 **claimed**-business pilot shows a useful action route, current hours or explicit unavailability, three meaningful service facts, a short owner-approved summary, one rights-cleared real business image, visible freshness and a measurable improvement in profile-to-contact outcomes. An 80% quality-gate pass rate with under two minutes of operator review is a target to test, not established evidence.
- **Implementation plan and evidence to close:** Follow [Website Enrichment and Visual-Profile Delivery Plan](./SuburbMates%20%E2%80%94%20Website%20Enrichment%20and%20Visual-Profile%20Delivery%20Plan.md). Complete source-contract and schema/RLS review; crawler/parser/evidence/conflict/media tests; controlled acceptance; deployment and in-app production verification; and a documented aggregate outcome window. No synthetic production business, owner, content or media record may be created merely to close evidence.
- **Autonomy amendment — 5 September 2026:** Per-host manual approval is an operator override, not the default scheduler gate. For recorded HTTPS websites on existing published unclaimed listings, the bounded runner may autonomously inspect structured public business facts after enforcing robots and transiently checking any clearly linked same-domain terms page. A possible automated-access restriction, unreadable linked terms, explicit operator block, uncertain domain, unsafe redirect or technical failure holds that site and applies nothing. A deterministic clear result is limited to facts; it is not permission to retain terms/page content, prose, reviews, testimonials, logos or media. Retain only fingerprints, assessment basis, source/freshness evidence and conflicts. Successive batches must skip still-fresh inspections so automation advances through the cohort instead of repeatedly inspecting the same listings.

## Open deviations to track

| Deviation | Current truth | Required resolution |
| --- | --- | --- |
| Publication policy | New approved-source candidates that pass deterministic qualification become unclaimed public listings with retained evidence. The existing catalogue's 982 `existing-catalogue-v2` exceptions remain a private remediation record; no retrospective visibility decision has been recorded. | Keep new-candidate controls operational and record a separate decision before changing visibility of existing listings. |
| Public product | Public directory release is live with a populated sitemap and indexable released routes. | Maintain production route checks and correct any observed public-data or SEO defect. |
| Owner and public input | A real owner submission and claim are approved and recorded. Profile correction, community submission and contact/correction still lack real outcome evidence. | Prove these flows in controlled non-production acceptance; record genuine cases later as operational observation, without fabricating durable production records. |
| Monetisation | Stripe is disabled. | Leave disabled until separately approved commercial scope exists. |
| Automation record | Automation safety controls exist but documentation and issue records need current-state reconciliation. | Maintain evidence, exception handling and current documentation as workflows are hardened. |
| Modern directory direction | Production accepts versioned OpenStreetMap and Victorian liquor-licence contracts, does not reject a candidate merely because contact details are absent, retains field-level evidence/freshness/conflicts, and supports grounded intent search plus owner-approved media presentation. The existing-catalogue evidence-gap cohort and genuine owner media participation remain ongoing work. | Continue adding only explicitly licensed, display-permitted sources through the registry; retain safe refresh/conflict behaviour; obtain real owner-approved media and complete controlled acceptance of remaining public journeys. |
