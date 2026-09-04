# SuburbMates — Website Enrichment and Visual-Profile Delivery Plan

## Status and authority

**Status:** in delivery. The factual-pilot source contract, private inspection ledger and bounded parser are live; the owner-rich factual import and review-first profile fields are in this release. The source remains disabled until the required terms/robots sample review, and provider-backed category imagery remains pending provider setup.

This plan implements D-018 and D-021. It supersedes older wording that treated all business-owned websites as permanently owner-only or that implied immediate bulk enrichment. The Decision Log and Target State remain authoritative if this plan conflicts with them.

## Product outcome

Turn sparse but legitimate Darebin listings into useful, visually rich local-business profiles without turning SuburbMates into a copy of Google or Yellow Pages. A resident should discover a relevant business, understand its useful services and current practical details, and take a direct next step. An owner should find an existing page, claim it, and improve it with minimal friction.

The system is autonomous for routine, low-risk work. It is not autonomous for legal ambiguity, publication decisions, owner identity, image rights, conflicting facts or commercial decisions.

## Verified baseline — 4 September 2026

| Measure | Observed count |
| --- | ---: |
| Published listings | 2,283 |
| Listings with recorded websites | 631 |
| Listings with a description | 234 |
| Listings with hours | 239 |
| Claimed listings | 1 |
| `official_business_site` evidence records | 0 |
| Media proposals | 0 |

The directory cannot yet measure a 25–50 claimed-business rich-profile pilot. It must first make unclaimed profiles useful, make claiming compelling, and then build a claimed pilot cohort without creating fake production records.

## Non-negotiable boundaries

- Google Search, Google Maps, Google reviews and Google imagery are quality benchmarks only. They are never an enrichment, storage or display source.
- Public availability or a crawl allowance is not a licence to republish website writing, photographs, logos, testimonials or reviews.
- `robots.txt` is required crawler behaviour, not permission. Missing/failed robots retrieval, access controls and unclear domain identity fail closed.
- No scraping of Google Images, random image search, closed directories or social platforms for media.
- No AI-generated public facts, fabricated images, hidden personal-data collection, visitor profiling, search-term retention, lead resale or unsolicited marketing email.
- Existing owner-approved facts remain protected. Automation may never silently overwrite them.
- Website enrichment never creates, qualifies or publishes a new business. It enriches an existing, already-published listing only.

## Delivery track A — controlled unclaimed factual enrichment

### A1. Source contract and safety gate

Create a dedicated `official_business_site` source contract distinct from candidate acquisition. It binds a recorded listing website to a verified canonical domain and specifies user agent, request limits, source fields, freshness, terms/robots checks, evidence storage and quiet failure states.

Before any production writes, inspect a deterministic 25–50-domain sample for domain match, robots availability, accessible structured data, terms signals and extraction quality. Do not treat this inspection as reuse permission for protected material. A safe pilot cohort must be broad across categories and suburbs, not cherry-picked for easy sites.

### A2. Bounded extraction

For a passing domain, request the homepage and only labelled same-domain Services, Contact, Booking and Menu pages. Prefer JSON-LD, then clearly factual page elements. Do not crawl site-wide, follow arbitrary links, retain cookies, submit forms, enter logins, access customer content, bypass bot protection or store raw pages beyond the minimum evidence fingerprint needed for a refresh decision.

Extract only explicit facts: phone, public email, address, hours, services and specialties, booking/menu destinations, delivery/accessibility/area-served facts and compatible social destinations. Keep source URL, timestamp, evidence fingerprint, confidence, freshness date and conflicts at field level.

### A3. Application and refresh

Apply only safe, non-conflicting, empty unclaimed factual fields under deterministic rules. Derive a short neutral summary from stored facts—not copied or close-paraphrased text—and present source/freshness context. Conflicting, weak, owner-controlled or uncertain values become private evidence or a suggested review, never a silent public change.

After the pilot proves safety, accuracy and maintainable workload, extend it by scheduled batches across eligible listings. The scheduler reports genuine source failures quietly in `/ops/System`; it does not create Work items merely because a site is unavailable.

## Delivery track B — claimed owner-authorised rich import

### B1. Owner flow

Retain the existing D-020 private homepage JSON-LD preview. Add a separate explicit “Import from my website” action for claimed businesses. It previews the recorded homepage plus the narrow same-domain About, Services, Contact, Booking and Menu allowlist.

The owner can select/edit services, approve or revise the neutral summary, keep/change category-context artwork, upload their own media, or select exact website images and attest that the business has the right to reuse each one. No preselected website photo is considered approved.

### B2. Real-media flow

For a selected image, record the original source URL, owner permission attestation, content hash, retrieval date, alt text and moderation decision. Copy the approved file to private SuburbMates storage; never hotlink a business website image. Existing media moderation, correction and takedown controls remain the publication gate.

The resulting image is clearly business media, unlike licensed category artwork. Later website refreshes suggest changes and never silently replace owner-approved copy, services or images.

## Delivery track C — autonomous licensed visual context

### C1. Purpose and provider

Licensed stock imagery gives unclaimed profiles and discovery pages visual richness while real media is absent. It is contextual design material, never evidence that a business, person, product, premises or service is depicted.

Use one provider contract at first. Pexels is the initial candidate because its API supports free search, landscape orientation, image metadata, visible provider linking and photographer credit within the anticipated workload. Creating the external provider account/API key is the only provider setup step; no provider account, API key or image retrieval is assumed until that is completed.

### C2. Autonomous relevance and quality rules

Use the existing category taxonomy, augmented by retained factual service signals, to map each listing to a small curated keyword set. This avoids a taxonomy migration and avoids raw marketing text. The selector automatically chooses only landscape images, applies category-specific exclusions and varies the chosen image across neighbouring cards.

Reject images with identifiable people, recognisable brands/logos, unrelated premises, misleading products, text-heavy compositions, poor contrast or an unsuitable audience. Do not add visual-AI tagging, dominant-colour crawling or another paid image-analysis platform merely to automate a low-risk category-context selection.

Each public image displays: **“Licensed category image — does not depict this business”**, the provider and photographer credit, and a provider link. Retain provider photo ID, original URL, photographer, licence snapshot, keyword map version, selection date and crop metadata. A stock image never counts as an owner-approved image or as a monetisation quality-gate success.

## Presentation, search and accessibility

- Enriched result cards show business name, category, suburb, concise factual detail and the obvious `View profile` route.
- Profiles foreground useful services, factual summary, booking/menu/contact routes, source/freshness context and rights-cleared real media when available.
- Homepage and category modules may spotlight more complete source-backed profiles. Ordinary search ranking remains neutral: no paid, claimed or image-based boost.
- Visuals use responsive crops, meaningful alt text, accessible contrast, keyboard focus, loading states and a non-image fallback. Image-heavy design must not block fast mobile discovery.

## Measurement and monetisation gate

Use existing privacy-preserving first-party observability only. Measure aggregate profile views and website, phone, email, directions, booking, menu, claim, missing-business and contact-completion actions. Retain no visitor identity, IP address, search term, message text, email or form content for this analysis.

Before commercial work, a 25–50 claimed-business pilot must show each qualifying profile has:

1. at least one useful action route;
2. current hours or an explicit unavailable state;
3. at least three meaningful service/category facts;
4. a short owner-approved description;
5. one rights-cleared **real** business image;
6. visible freshness/source context; and
7. measurable improvement in profile-to-contact outcomes against unchanged profiles.

Test a target of 80% quality-gate completion with under two minutes of operator review per profile; it is a target, not proof. Stripe, pricing, featured placement and entitlements remain paused. Any future paid offer must not affect publication, legitimacy, ownership, factual trust signals or organic search rank.

## Sequenced implementation

1. Amend source strategy, D-021 and capability authority; inspect current schema, evidence, media and observability contracts.
2. Implement and test the factual-pilot source contract, schema/RLS protections, bounded crawler/parser, evidence/conflict lifecycle and quiet `/ops/System` health reporting.
3. Run controlled non-production acceptance. Deploy only after the first source contract is proven; live-check non-mutating routes without fabricating durable production content.
4. Implement the owner-authorised rich-import review, exact-image permission attestation and existing-media-workflow integration. **In progress:** the owner preview now reads bounded same-domain structured pages and can add a neutral fact-derived summary, services, booking/menu links, areas served and accessibility details to the existing immutable-audit review request. Existing private owner upload/moderation remains the real-media route; selected website-image retrieval still needs its explicit source-URL attestation step.
5. Implement licensed category-context image selection, credits, fallbacks and owner replacement options after provider setup.
6. Improve homepage/category/profile presentation and aggregate cohort measurement; run the unclaimed pilot gradually.
7. Build a genuine claimed cohort and run the quality/outcome window before proposing monetisation.

Every release-affecting stage requires focused tests, `npm --prefix web run lint`, `npm --prefix web run build`, `npm --prefix web run cf:build`, `npm run check`, normal Cloudflare deployment and in-app-browser production verification.
