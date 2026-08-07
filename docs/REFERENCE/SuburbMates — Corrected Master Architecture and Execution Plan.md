# SuburbMates — Corrected Master Architecture and Execution Plan

## Current authority and implementation status — 26 July 2026

This document remains the detailed technical reference only where it agrees with the current [Target State and Operating Authority](./SuburbMates%20%E2%80%94%20Target%20State%20and%20Operating%20Authority.md) and [Decision Log](./SuburbMates%20%E2%80%94%20Decision%20Log.md). The public directory is released. The approved-source deterministic candidate handoff is implemented for new candidates; it retains evidence and may create an unclaimed public listing only after the current qualification policy passes.

The historical sections below that describe a holding-only site, manual-only publication, Gemini-assisted public content, Stripe checkout/webhooks, payment-derived tiers, provider dashboards, or a Payments surface are not an active implementation brief. Billing remains disabled until a separately approved commercial model exists. New work must follow the Target State, Journey Map and Operations Responsibility and Follow-through Map rather than re-enabling those historical designs.

## Document status

This document preserves historical architecture detail. It is not an active implementation plan where it conflicts with the current authority above.

It:

* preserves the valid architecture, routing, automation, monetisation, SEO and operational-readiness requirements
* resolves contradictions identified during research
* positions SuburbMates as a **directory-first platform**
* excludes the design and implementation of the internal Ops dashboard, which will be documented separately
* records the former manual Phase 1 publication design as historical context; current publication policy is defined by the Target State and Decision Log

The original architecture established Next.js, Supabase, Cloudflare deployment, the dual-link discovery model, core tables, vendor profiles and published-only visibility. The supplied pSEO analysis added structured data, canonical, abuse-protection and image-accessibility requirements.  

---

# 1. Executive definition

## Outcome

Build a privacy-first directory connecting residents of Melbourne’s northern suburbs directly with relevant local businesses and service providers.

SuburbMates is:

* a local business discovery platform
* directory-first rather than account-first
* capable of publishing useful unclaimed listings
* capable of allowing businesses to claim existing listings
* free from middleman involvement in the resident-to-business relationship
* supported by automated enrichment and verification signals
* protected by manual publication during its initial SEO-sensitive phase

SuburbMates is not:

* restricted to businesses that provide an ABN
* a marketplace or merchant of record
* a universal business-verification authority
* an AI-generated page factory
* a platform where payment automatically proves legitimacy
* a system where every suburb-category database combination is automatically indexed

## Success metrics

Phase 1 is successful when:

1. No unreviewed listing becomes publicly indexable.
2. Every indexed vendor page contains useful, evidence-supported information.
3. Every indexed suburb-category page contains meaningful directory value.
4. Seeded and unclaimed listings are supported without requiring an ABN or payment.
5. ABN, Stripe and AI results are stored as separate supporting signals.
6. Published pages use consistent canonicals and sitemap inclusion rules.
7. Google Search Console reports no manual action, systemic indexing fault or material structured-data problem.
8. Automated workflows fail safely and leave listings unpublished when appropriate.

## Correct interpretation of autonomy

The earlier objective of “100% autonomy” is retained as a long-term operational direction, but corrected to mean:

> Routine data gathering, enrichment, verification and system processing become automated, while uncertain, conflicting or high-risk cases remain reviewable.

It does not mean that ABN, Stripe or a model-generated score may independently publish every listing.

---

# 2. Directory-first operating model

## 2.1 Listings may exist before ownership is claimed

A legitimate listing may enter SuburbMates through:

* SuburbMates seed data
* operator research
* direct business submission
* a business claiming an existing listing
* an approved structured import

This follows the general directory model in which a business may already have a public page before the owner claims it. Yelp’s official business flow allows businesses to search for an existing page, add one when absent, and claim the page separately. ([Yelp Business][1])

## 2.2 ABN is not an entry requirement

A listing must not be excluded merely because:

* no ABN was submitted
* the ABN is not displayed on the business website
* the listing is unclaimed
* SuburbMates sourced the listing independently

Australian Government guidance states that not everyone needs an ABN. ABN status therefore cannot be treated as the universal definition of whether a directory listing is valid or publishable. ([business.gov.au][2])

## 2.3 Independent status dimensions

The following dimensions must remain separate.

### Listing status

```text
draft
pending_review
published
rejected
unpublished
```

### Ownership status

```text
unclaimed
claim_pending
claimed
owner_verified
```

### ABN status

```text
not_provided
pending
matched
partial_match
mismatch
check_failed
```

### Commercial status

```text
free
premium
payment_pending
payment_failed
cancelled
```

### Listing source

```text
seeded_by_suburbmates
operator_added
business_submitted
claimed_existing_listing
approved_import
```

A normal directory record may therefore be:

```text
Published
Unclaimed
ABN not provided
Free
Seeded by SuburbMates
```

## 2.4 Verification labels

Do not use one vague `Verified` badge for every published listing.

Where supported by actual evidence, use precise labels such as:

* `Claimed`
* `Owner Verified`
* `ABN Checked`
* `Premium`

Publication itself does not mean owner verification, ABN verification or paid status.

---

# 3. Core platform principles

## 3.1 Privacy-first

Only business information intended for public use should be exposed publicly.

Private operational data, authentication details, raw integration responses and payment identifiers must remain server-side.

## 3.2 Zero middleman

Residents should be able to contact businesses directly through:

* website
* telephone
* public business email, where provided
* other approved direct contact methods

SuburbMates does not need to intercept the customer relationship.

## 3.3 User value before SEO value

Every public page must exist to help residents make a useful discovery or decision.

An internal vendor profile must not be framed or implemented merely as a page “for crawlers.” Google identifies pages created to rank for similar queries while acting as less-useful intermediaries as potential doorway abuse. Google also applies its scaled-content policy regardless of whether large quantities of content are produced by people, AI or a combination. ([Google for Developers][3])

## 3.4 Evidence before generated copy

Generated descriptions may organise or summarise evidence.

They must not invent:

* services
* credentials
* experience
* awards
* guarantees
* opening hours
* pricing
* service areas
* local history
* business ownership
* professional registrations

---

# 4. Technical architecture

## 4.1 Application framework

* Next.js
* App Router
* TypeScript
* Tailwind CSS
* Supabase Postgres
* Supabase Auth
* Supabase Edge Functions where appropriate

The exact Next.js version must be confirmed from the repository and pinned before implementation.

## 4.2 Deployment

Deploy the full-stack Next.js application to **Cloudflare Workers using the supported OpenNext adapter**, subject to a repository compatibility test.

Cloudflare currently recommends its Workers path for full-stack Next.js and documents support for most major Next.js application features through OpenNext. ([Cloudflare Docs][4])

## 4.3 Corrected runtime rule

The previous rule requiring every route to declare:

```ts
export const runtime = 'edge'
```

is removed.

The corrected rule is:

> Select the runtime per route based on verified compatibility with the pinned Next.js version, Cloudflare OpenNext adapter, required libraries and deployment tests.

Next.js documents that its Edge Runtime supports fewer APIs and does not support ISR. A blanket Edge requirement would therefore remove capabilities without a demonstrated benefit. ([Next.js][5])

## 4.4 Dependency rule

The previous blanket ban on native Node.js modules is replaced with:

> Use only dependencies confirmed as compatible with the chosen Cloudflare Workers and OpenNext deployment configuration.

No library should be accepted solely because it works in local Node.js development.

## 4.5 Proxy and middleware conventions

Do not permanently lock the architecture to `middleware.ts`.

Starting with Next.js 16, Middleware was renamed to Proxy, and current runtime behaviour depends on the version and deployment adapter. Proxy may be used for routing conveniences or early checks, but sensitive access control must also be enforced at the protected data and action layers. ([Next.js][6])

---

# 5. Core data architecture

Supabase remains the authoritative data source.

## 5.1 `suburbs`

Stores geographic taxonomy.

Required fields:

```text
slug
name
```

Examples:

```text
northcote
preston
thornbury
```

The original example included `darebin`. Because Darebin is a municipality rather than a suburb, the final taxonomy must explicitly decide whether the platform indexes suburbs, councils, or both.

## 5.2 `categories`

Stores business or service categories.

Required fields:

```text
slug
name
```

Examples:

```text
plumber
electrician
```

## 5.3 `vendors`

The central listing entity.

Original required fields:

```text
id
business_name
contact_email
phone
website
suburb_slug
category_slug
description
tier
is_published
```

Corrected and expanded requirements:

```text
id
slug
business_name
approved_business_name
contact_email
phone
website
suburb_slug
category_slug
description
tier
is_published

listing_status
listing_source
ownership_status
claimed_by_user_id

submitted_abn
abn_status
abn_match_type
abn_official_names
abn_state
abn_postcode
abn_checked_at

payment_status
subscription_status
stripe_customer_id
stripe_subscription_id
stripe_current_period_end
last_stripe_event_at

source_url
source_notes
last_verified_at

logo_url
created_at
updated_at
```

Exact column names may be adjusted during schema design, but the information categories must not be lost.

## 5.4 Moderation and audit data

The platform must support retaining:

```text
moderation_status
rejection_reason
reviewed_at
reviewed_by
published_at
unpublished_at
```

Original submitted data and approved public values should remain distinguishable.

Do not permanently erase rejected records by default. A separate retention policy may purge old rejected data later.

OWASP recommends audit logging around sensitive application actions and data changes. ([OWASP Cheat Sheet Series][7])

## 5.5 Automation records

Persist workflow execution data rather than relying only on transient function logs.

A dedicated table or equivalent storage should track:

```text
job_type
vendor_id
status
attempt_count
started_at
completed_at
last_error
result_summary
retryable
```

Expected job types include:

* ABN lookup
* website evidence retrieval
* Gemini description generation
* logo processing
* Stripe webhook processing
* sitemap or revalidation activity

This information will support the separate Ops implementation later.

## 5.6 Naming convention

Use:

* `suburbs` as the internal database and code term
* `Locations` as the public navigation label where broader language is clearer

Do not alternate unpredictably between `suburbs` and `locations` in code.

---

# 6. Listing acquisition and lifecycle

## 6.1 Seeded listing flow

```text
Public evidence identified
→ listing created as draft or pending review
→ source provenance stored
→ optional enrichment runs
→ manual publication decision
→ public unclaimed listing
→ business may later claim it
```

## 6.2 Business-submitted listing flow

```text
Business submits details
→ unpublished record created
→ website and optional ABN checks run
→ draft description generated
→ Stripe status attached if applicable
→ manual publication decision
→ listing published or rejected
```

## 6.3 Claim flow

```text
Business locates existing listing
→ initiates claim
→ ownership verification process runs
→ ownership_status changes
→ approved owner may maintain permitted listing fields
```

Claiming changes ownership status. It does not create the listing’s underlying legitimacy by itself.

## 6.4 Publishing requirements

A listing may be published where sufficient evidence supports that:

1. The business or service exists.
2. It fits the geographic and category scope.
3. Its website, telephone, public profile or other source reasonably corresponds with it.
4. Its approved name is accurate and not keyword-stuffed.
5. Its public description contains no unsupported claims.
6. The page provides useful information to directory visitors.
7. The outbound destination does not appear malicious or deceptive.

ABN, payment and claim status may support this decision but are not mandatory.

---

# 7. Publication and visibility gate

## 7.1 Global gate

No listing should appear publicly or enter the search sitemap unless:

```text
is_published = true
```

## 7.2 Invalid and unpublished vendor routes

A direct request for:

* a nonexistent vendor
* an unpublished vendor
* a rejected vendor
* an invalid slug

must not expose the listing.

Use `notFound()` or the appropriate equivalent for the final framework implementation.

## 7.3 Public indexing state

Publication and indexing must remain conceptually separate.

A record can be:

* published and indexable
* published but temporarily `noindex`
* unpublished and inaccessible

This allows a valid public listing or taxonomy page to exist without automatically being placed in the sitemap before it meets the indexing quality gate.

---

# 8. Public routing architecture

## 8.1 Global homepage

```text
/
```

Purpose:

* brand anchor
* primary directory search
* category discovery
* location discovery

## 8.2 Index directories

```text
/locations
/categories
```

`/locations` maps the supported geographic taxonomy.

`/categories` maps the supported business and service categories.

## 8.3 Intermediate taxonomy routes

```text
/[suburb]
/categories/[slug]
```

`/[suburb]` displays appropriate categories and published listings for the selected suburb.

`/categories/[slug]` displays the locations and published listings relevant to the category.

## 8.4 High-intent directory route

```text
/[suburb]/[category]
```

Example:

```text
/northcote/plumber
```

The route displays appropriate published businesses for the combination.

A route must not become indexable merely because the suburb and category records exist.

## 8.5 Vendor profile

```text
/vendor/[slug]
```

This is a user-facing directory page containing approved, useful information and direct business actions.

## 8.6 Sitemap

Logical route:

```text
/sitemap.xml
```

Implemented through the applicable Next.js metadata route, normally `app/sitemap.ts`.

The sitemap must include only:

* canonical URLs
* published listings
* taxonomy pages that pass the indexing quality gate
* public static pages intended for Search

Google describes sitemap inclusion as a signal of the canonical URLs the site prefers; submission does not guarantee crawling or indexing. ([Google for Developers][8])

## 8.7 Shallow navigation

Retain a shallow, intelligible path such as:

```text
Home
→ Locations
→ Suburb and category results
→ Vendor profile
```

The earlier claim that three clicks is universally “optimal for crawl-budget allocation” is removed.

The structure is retained because it supports:

* clear user navigation
* internal linking
* taxonomy comprehension
* discoverability

Google frames crawl-budget optimisation mainly as an issue for very large or frequently changing sites, not as a universal three-click formula. ([Google for Developers][9])

---

# 9. Public interface requirements

## 9.1 Homepage

### Hero

Include:

* a clear directory value proposition
* the core `HeroSearch` function
* location and category search

The original proposed copy was:

> Privacy-first. Verified local businesses. Zero middleman fees.

This wording must not be treated as final because not every published listing will be owner-verified or ABN-checked.

Final hero copy remains a copy decision, but it must not imply universal verification.

### Discovery sections

* Browse by Category
* Browse by Location

### Footer

* sitemap and directory navigation
* relevant council or local resources
* privacy and platform principles
* help, listing and claiming information

## 9.2 Suburb-category results page

Include:

* page heading
* concise factual context
* breadcrumbs
* useful result count
* available filters where justified
* stacked or responsive vendor cards

Breadcrumb pattern:

```text
Home > Locations > [Suburb] > [Category]
```

### Vendor card

Each card should display:

* logo where available
* approved business name
* category
* suburb or service area
* concise approved description excerpt
* relevant specific badges
* `Visit Website`
* `View Profile`

The direct outbound action and internal profile action are both retained.

## 9.3 Vendor profile

### Header

* approved business name
* category
* suburb or service area
* specific status badges
* backlink to the relevant directory route

### Main content

* useful approved description
* publicly supported business information
* contact details
* website
* claimed or unclaimed status
* last verified date where appropriate
* available source-supported service information

### Direct actions

* Call
* Visit Website
* Email, only when a public business email is intended for display

A sticky contact area may be used on suitable desktop layouts but must remain usable on mobile.

---

# 10. Dual-link model

Every discovery card retains two destinations.

## 10.1 Direct outbound link

Purpose:

* let users reach the business website directly
* preserve the zero-middleman model

## 10.2 Internal profile link

Purpose:

* provide a useful SuburbMates directory record
* give residents information before leaving the site
* create a stable canonical listing page
* support discovery through internal search and public search engines

The internal page is not a crawler-only SEO wrapper.

---

# 11. Programmatic SEO strategy

## 11.1 User value threshold

Programmatic generation may scale page creation, but not the evidence or usefulness threshold.

Do not create large volumes of pages whose only differences are:

* suburb name
* category name
* generic generated paragraphs
* one weak or irrelevant listing

Google’s spam policies address both scaled content and doorway pages where pages are created primarily to rank rather than serve as useful destinations. ([Google for Developers][3])

## 11.2 Taxonomy-page indexing gate

A suburb-category page becomes indexable only when it has meaningful directory value.

The gate should consider:

* existence of relevant published inventory
* usefulness of the listings for comparison or discovery
* accurate category and suburb context
* adequate internal navigation
* absence of duplicated filler
* a stable canonical URL

Exact numerical inventory thresholds must be chosen after evaluating launch inventory and page quality.

## 11.3 Page-state handling

### Invalid combination

Return 404.

### Valid combination with insufficient public value

Either:

* keep it unavailable, or
* make it useful for internal browsing but mark it `noindex`

Do not include it in the sitemap.

### Qualified page

* indexable
* self-canonical
* internally linked
* included in sitemap

## 11.4 Generated descriptions

Remove the fixed “300-word” requirement.

The corrected rule is:

> Generate only the amount of copy that the available evidence supports.

No word count guarantees:

* originality
* quality
* usefulness
* indexing
* rankings

The statement that localised AI copy “mathematically guarantees” unique content is expressly rejected.

## 11.5 Duplicate and repetitive copy

Avoid template text that simply swaps:

* suburb
* category
* business name

Descriptions should be concise rather than padded when source evidence is limited.

---

# 12. Technical SEO

## 12.1 Canonical URLs

Every indexable page must output an absolute canonical URL.

Use Next.js metadata such as:

```ts
alternates: {
  canonical: absoluteUrl
}
```

Canonical handling must also be supported by:

* consistent internal links
* redirects where duplicate URL forms should not exist
* canonical-only sitemap entries
* consistent trailing-slash behaviour

Google treats canonical annotations as signals rather than unconditional commands. ([Google for Developers][10])

## 12.2 Structured data

Vendor pages should use Schema.org `LocalBusiness` JSON-LD where the listing has sufficient applicable information.

Only include fields supported by visible and reliable page data.

Do not fabricate:

* ratings
* reviews
* opening hours
* physical addresses
* prices
* coordinates
* service areas

Use the most specific applicable `LocalBusiness` subtype where reliable.

Validate initial pages through Google’s Rich Results Test and inspect them after deployment. Structured data may improve Google’s understanding and eligibility for enhanced presentation, but Google does not guarantee a rich result. ([Google for Developers][11])

## 12.3 Metadata

Each indexable route should provide:

* unique title
* useful meta description
* canonical
* appropriate Open Graph data
* crawl directives appropriate to its publication state

## 12.4 Sitemap rules

Include:

* approved canonical vendor pages
* approved taxonomy pages
* important public static pages

Exclude:

* unpublished vendors
* rejected vendors
* pending claims
* internal tools
* authentication routes
* weak taxonomy combinations
* query-parameter duplicates

## 12.5 Search Console

Configure Google Search Console before or at launch.

Use it to monitor:

* sitemap processing
* crawl and indexing behaviour
* canonical selection
* search performance
* structured-data issues
* security or manual-action notifications

Google describes Search Console as the primary tool for understanding how Google crawls, indexes and serves a site. ([Google for Developers][12])

---

# 13. Abuse prevention and route protection

## 13.1 Why publication remains manual in Phase 1

Open submission systems attract spam, including fake pages and malicious outbound links.

Google explicitly recommends monitoring platforms for user-generated spam and abuse signals. ([Google for Developers][13])

## 13.2 Required submission safeguards

Implement:

* input validation
* URL normalisation
* spam-rate controls
* duplicate detection
* safe handling of uploaded files
* limits on submission frequency
* unpublished-by-default records
* server-side validation
* rejection and audit history

## 13.3 Dynamic route abuse

An attacker may request arbitrary combinations such as:

```text
/fake-suburb/fake-category
```

Protect the application through:

* Cloudflare WAF and rate limiting
* cached validation of accepted suburb and category slugs
* early 404 responses
* prevention of unnecessary Supabase reads
* request and failure logging

The cache implementation must use a Cloudflare-compatible mechanism selected during technical implementation. Redis is not locked as a requirement.

## 13.4 Outbound website safety

Before publication, check that the submitted destination:

* resolves
* reasonably corresponds with the business
* is not an obvious redirect chain to unrelated content
* is not a known deceptive or malicious destination
* uses an acceptable protocol

Automated checks may support this, but final Phase 1 publication remains manual.

---

# 14. ABN integration

## 14.1 Credential status

The ABN Lookup Web Services GUID has already been stored in `.env`.

Required logical secret:

```text
ABN_LOOKUP_GUID
```

## 14.2 Correct role

ABN Lookup is an optional automated evidence source.

It may:

* validate whether a supplied ABN is active
* retrieve available official names
* retrieve state and postcode
* support business-detail comparison
* prefill or enrich records

The ABN Lookup web services are expressly designed for application integration, including ABN validation and keeping stored details updated. ([ABN Lookup][14])

It must not:

* block all businesses without an ABN
* prove that a submitter owns the business
* prove control of the submitted website
* automatically publish a listing by itself

## 14.3 Correct onboarding flow

```text
Create unpublished listing
→ if ABN supplied, call ABN Lookup
→ store response and match outcome
→ continue moderation regardless of whether ABN exists
```

The previous proposal to prevent a vendor from entering the database until ABN verification succeeds is removed.

## 14.4 Name comparison

Do not require a naïve exact string match.

The comparison must consider:

* current legal or main name
* current business names
* punctuation
* spacing
* abbreviations
* entity suffixes such as `Pty Ltd`
* legal entity versus customer-facing business name
* multiple current business names

The ABR warns that trading-name fields have not been updated since 2012 and recommends avoiding reliance on those fields. ([ABN Lookup][15])

## 14.5 Stored ABN output

Store at least:

* submitted ABN
* active or cancelled status
* official current names
* state
* postcode
* check timestamp
* match type
* match outcome
* failure reason where applicable

## 14.6 ABN states

```text
not_provided
pending
matched
partial_match
mismatch
check_failed
```

A `not_provided` status is neutral and does not prevent publication.

---

# 15. Gemini integration

## 15.1 Credential

```text
GEMINI_API_KEY
```

The supplied material states that this key is already available.

## 15.2 Correct role

Gemini is a content and moderation assistant.

It may:

* draft a business description
* organise supplied evidence
* flag suspicious or keyword-stuffed language
* identify contradictory fields
* flag unsupported claims
* suggest manual-review reasons
* help prioritise records

It must not autonomously establish legal or business legitimacy.

## 15.3 Structured output

Replace the original publication-oriented schema:

```json
{
  "is_legitimate": true,
  "confidence_score": 98,
  "seo_bio": "..."
}
```

with an evidence-oriented structure such as:

```json
{
  "draft_description": "...",
  "website_accessible": true,
  "business_name_found": true,
  "location_evidence_found": false,
  "risk_labels": [],
  "unsupported_claims": [],
  "manual_review_reasons": []
}
```

The exact schema may be extended, but its purpose is to expose evidence and risk—not to authorise publication.

## 15.4 Deprecated confidence gate

Remove:

```ts
if (ai.is_legitimate && ai.confidence_score > 95) {
  publish()
}
```

A model-generated confidence value must not set:

```text
is_published = true
```

Where a confidence score is retained for diagnostics, it must be stored only as model output and not interpreted as a calibrated probability.

## 15.5 Description generation

The function historically named:

```text
generate-bio
```

may be retained, but its behaviour changes.

It must:

1. Accept only evidence available to the backend.
2. Generate concise copy supported by that evidence.
3. Avoid fabricated claims.
4. Return structured warnings.
5. Save a draft description.
6. Leave the record unpublished.
7. fail safely if the model response is invalid.

## 15.6 Website evidence

Do not assume Gemini has visited or verified a website merely because a URL was included in a prompt.

Where website content is used:

* retrieve it through an approved backend process
* limit the retrieved content
* validate the destination
* pass the extracted evidence to Gemini
* retain source provenance

---

# 16. Stripe integration

## 16.1 Correct role

Stripe indicates commercial status.

It may establish that:

* checkout occurred
* payment succeeded, failed or remains pending
* a subscription exists
* a subscription is active, past due, cancelled or ended
* a listing qualifies for premium presentation

Stripe does not establish:

* business ownership
* website control
* ABN ownership
* content accuracy
* publication eligibility

## 16.2 Credentials

Required:

```text
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SIGNING_SECRET
```

Both must remain server-side.

## 16.3 Webhook route

Proposed logical path:

```text
/api/webhook/stripe
```

Possible App Router implementation:

```text
web/src/app/api/webhook/stripe/route.ts
```

The exact path must follow the repository structure.

## 16.4 Webhook security

The handler must:

1. Read the webhook body in the form required by Stripe signature verification.
2. Verify the Stripe signature.
3. Reject invalid events.
4. process events idempotently
5. store the Stripe event ID
6. prevent duplicate processing
7. update only the matched vendor or subscription record
8. log failure without publishing a listing

Stripe requires webhook signature verification and documents webhook delivery as asynchronous. ([Stripe Docs][16])

## 16.5 Checkout events

Support:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
```

The second event is necessary where delayed payment methods are supported. Stripe recommends an idempotent fulfilment process that verifies payment status. ([Stripe Docs][17])

## 16.6 Subscription lifecycle

Where premium is recurring, also process relevant events such as:

```text
invoice.paid
invoice.payment_failed
customer.subscription.updated
customer.subscription.deleted
```

Stripe advises tracking subscription lifecycle changes and revoking paid access where a subscription ends or becomes ineligible. ([Stripe Docs][18])

## 16.7 Metadata

Checkout creation must include a trusted reference such as:

```text
vendor_id
```

The webhook must verify and use that reference to update the corresponding Supabase record.

## 16.8 Stored Stripe state

Store at least:

```text
tier
payment_status
subscription_status
stripe_customer_id
stripe_subscription_id
stripe_current_period_end
last_stripe_event_at
```

## 16.9 Phase 1 publication rule

Payment may update:

```text
tier = premium
```

It must not automatically set:

```text
is_published = true
```

---

# 17. Media processing and accessibility

## 17.1 Logo optimisation

The functional requirement remains:

* optimise uploaded logos
* use efficient modern formats such as WebP where appropriate
* control dimensions
* reduce unnecessary storage and transfer size

The original proposed implementation was a Supabase Edge Function:

```text
compress-logo
```

That name may be retained, but the final implementation may use:

* Supabase Edge Functions
* Cloudflare image tooling
* another verified Cloudflare-compatible processing path

The outcome is locked; the exact processing service remains subject to compatibility and cost review.

## 17.2 Alternative text

Do not call Gemini solely to generate logo alternative text.

Determine alt text from context and approved listing data.

Examples:

* When the logo is the functional link: use text describing the destination or business.
* When an adjacent heading already gives the business name and the logo adds no information: an empty `alt=""` may be appropriate.
* When the logo uniquely conveys the business identity: use the approved business name.

W3C guidance requires text alternatives to reflect the image’s information or function, not merely provide a literal visual description. ([W3C][19])

---

# 18. Security and data access

## 18.1 Row Level Security

Enable Supabase Row Level Security on all exposed tables.

Public users must only be able to retrieve records intended for public display.

Sensitive write operations must require authenticated and authorised server-side execution.

Supabase recommends RLS for exposed tables and states that service-role credentials bypass RLS and must never be exposed to the browser. ([Supabase][20])

## 18.2 Secret handling

Never expose:

* Stripe secret key
* Stripe signing secret
* Gemini API key
* ABN Lookup GUID where it must remain private
* Supabase service-role or secret key

Store secrets using the deployment platform’s secret-management mechanism rather than public environment variables or committed `.env` files.

## 18.3 Public database reads

Public directory queries must enforce:

```text
is_published = true
```

through database policy or a secure server query—not only by filtering in frontend code.

## 18.4 Auditability

Log:

* publication
* unpublication
* rejection
* claim approval
* automated evidence checks
* payment-status changes
* integration failures
* privileged data edits

## 18.5 Rejection rather than immediate deletion

Use a rejected or archived state first.

Permanent deletion should occur only through a later retention and purge policy.

---

# 19. Monitoring and integration readiness

This section establishes the platform requirements only. The unified Ops interface will be specified separately.

## 19.1 Supabase

Persist:

* current listing data
* automation results
* moderation state
* integration status
* audit records

## 19.2 Stripe

Persist sufficient local payment state so normal application behaviour does not require a live Stripe query on every request.

## 19.3 Cloudflare

Configure:

* WAF
* rate limits
* application analytics
* bot and threat monitoring
* caching appropriate to the selected deployment architecture

## 19.4 Google Search Console

Configure:

* site verification
* sitemap submission
* indexing monitoring
* structured-data monitoring
* search performance monitoring

## 19.5 Future Ops compatibility

The platform must expose clean, structured data for the future Ops layer to consume, including:

* listing review state
* ABN status
* Stripe status
* automation failures
* indexing state where integrated later
* security and traffic summaries where integrated later

This requirement does not define the Ops layout, routes or controls.

---

# 20. Environment and credential inventory

## Known required values

```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY or service-role equivalent
GEMINI_API_KEY
ABN_LOOKUP_GUID
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SIGNING_SECRET
PUBLIC_SITE_URL
```

Names should follow the exact environment conventions of the pinned packages and deployment platform.

## User-provided credential status

* `ABN_LOOKUP_GUID`: already saved in `.env`
* `GEMINI_API_KEY`: stated as already available
* Stripe secret and signing secret: must be provisioned or confirmed
* Supabase and Cloudflare credentials: must be verified from the repository and deployment configuration

Do not expose secret credentials through client-side-prefixed environment variables.

---

# 21. Corrected autonomy roadmap

## Phase 0 — Foundation

Build and validate:

* core taxonomy
* vendor schema
* listing source and ownership states
* publication gate
* claim-capable data model
* public routes
* sitemap gate
* canonical metadata
* structured data foundation
* RLS
* audit records

## Phase 1 — Safe directory launch

Automate:

* listing intake
* optional ABN lookup
* AI draft creation
* website evidence assistance
* logo optimisation
* Stripe event processing
* tier updates
* route and sitemap generation for approved records

Keep manual:

* final business-evidence assessment
* business-name correction
* category and suburb confirmation
* description quality approval
* slug approval
* final publication
* rejection of spam or unsupported listings

## Phase 2 — Assisted exception management

After sufficient production evidence:

* improve automated risk labels
* prioritise high-confidence, low-risk cases
* reduce operator review time
* route conflicting evidence to exceptions
* measure false positives and false negatives
* retain human publication until a specific policy is validated

## Phase 3 — Conditional automation

Only introduce automatic publication where:

* the rule is explicitly defined
* the evidence combination is validated against real moderation outcomes
* rollback and unpublish controls exist
* audit logs are complete
* sampling and quality monitoring continue
* no individual ABN, Stripe or Gemini signal is treated as conclusive

The future rule may combine several evidence types, but the exact policy remains unresolved.

## Long-term state

```text
Routine evidence gathering is automated
→ ordinary records are processed consistently
→ uncertain or high-risk records become exceptions
→ publication automation is introduced only where measured evidence supports it
```

---

# 22. Implementation sequence

## Stage 1 — Repository verification

Confirm:

* repository structure
* Next.js version
* current deployment target
* Cloudflare adapter
* Supabase schema
* existing routes
* existing environment variables
* existing Stripe or Gemini code
* compatibility of dependencies

No new runtime or file-convention decision should be made before this check.

## Stage 2 — Schema migration

Add:

* listing-source fields
* ownership status
* ABN states
* Stripe states
* provenance fields
* moderation states
* automation-job records
* audit fields

## Stage 3 — Public directory foundation

Implement:

* homepage
* location and category indexes
* taxonomy routes
* vendor profiles
* dual-link cards
* published-only public queries
* mobile-first public layouts

## Stage 4 — SEO controls

Implement:

* canonical metadata
* dynamic sitemap
* taxonomy indexing gates
* LocalBusiness JSON-LD
* invalid-route handling
* Search Console setup
* structured-data validation

## Stage 5 — Automation

Implement:

* ABN lookup when supplied
* evidence-oriented Gemini output
* safe description generation
* logo optimisation
* Stripe webhook signature verification
* idempotent payment processing
* automation logging

## Stage 6 — Abuse protection

Implement:

* WAF and rate limits
* cached taxonomy validation
* spam detection
* duplicate listing detection
* safe outbound URL validation
* upload constraints

## Stage 7 — Phase 1 launch gate

Do not launch public submissions until:

* listings default to unpublished
* pending data cannot leak publicly
* invalid vendor URLs return the correct response
* only qualified URLs enter the sitemap
* payment cannot accidentally publish a listing
* AI cannot accidentally publish a listing
* missing ABN does not block a legitimate listing
* audit records are working

---

# 23. Acceptance criteria

## Directory model

* Seeded listings can be published without owner claims.
* Listings can remain unclaimed.
* Businesses can claim existing listings.
* No ABN is required for directory inclusion.
* Premium is independent of publication and ownership.

## Public data

* Only approved public fields are displayed.
* Unpublished records are inaccessible.
* Public pages remain useful without relying on generated filler.
* Vendor pages provide genuine user value.

## SEO

* Every indexable page has a stable canonical.
* Only qualified URLs appear in the sitemap.
* Invalid combinations return 404.
* Weak valid combinations do not enter the index.
* JSON-LD reflects visible, supported information.
* No automatic 300-word content requirement exists.

## Integrations

* ABN checks are optional and autonomous when an ABN is supplied.
* Stripe events are signature-verified and idempotent.
* Payment updates commercial status but not publication.
* Gemini produces drafts and warnings but cannot publish.
* Automation failures leave the listing in a safe state.

## Security

* RLS protects exposed Supabase tables.
* Secret keys are server-side only.
* Privileged actions are auditable.
* Rejected records are retained under a controlled state.
* Dynamic routes and submissions have abuse controls.

---

# 24. Remaining unresolved decisions

These matters have not yet been conclusively defined and must not be silently invented during implementation.

## 24.1 Geographic taxonomy

Determine whether SuburbMates indexes:

* individual suburbs only
* local government areas only
* both suburbs and councils

The existing example mixes Northcote with Darebin.

## 24.2 Taxonomy indexing threshold

Define the minimum useful inventory and content criteria before a suburb-category page becomes indexable.

## 24.3 Slug lifecycle

Determine:

* whether the slug follows the approved business name
* whether a name edit regenerates the slug
* when slugs become stable
* how old slugs redirect
* how collisions are resolved

## 24.4 Claim verification

Define how a business proves authority to claim an existing listing.

## 24.5 Public source attribution

Determine whether listing provenance is shown publicly or retained only internally.

## 24.6 ABN fuzzy matching

Define normalisation and acceptable match types without relying on outdated trading-name fields.

## 24.7 Premium model

Define whether premium is:

* recurring subscription
* fixed-duration purchase
* another commercial structure

This determines the required Stripe lifecycle events.

## 24.8 Image-processing implementation

Choose between Supabase processing, Cloudflare image tooling or another verified compatible method.

## 24.9 Rejected-data retention

Define how long rejected records and submitted personal data are retained before purge.

## 24.10 Future automatic-publication policy

No automatic trust-gate combination is currently approved.

---

# 25. Explicitly superseded statements

The following earlier statements must not be treated as current requirements.

### Superseded

```text
Only ABN-verified businesses may be listed.
```

### Corrected

ABN is optional supporting evidence.

---

### Superseded

```text
A Stripe payment proves that a vendor is legitimate.
```

### Corrected

Stripe proves payment state only.

---

### Superseded

```text
Payment automatically sets is_published = true.
```

### Corrected

Payment updates commercial status during Phase 1.

---

### Superseded

```text
Gemini confidence above 95% automatically publishes the listing.
```

### Corrected

Gemini prepares drafts and risk indicators but has no publication authority.

---

### Superseded

```text
The internal vendor page exists for search-engine crawlers.
```

### Corrected

The vendor profile must be a useful destination for residents.

---

### Superseded

```text
Every AI biography must contain 300 words.
```

### Corrected

Description length is limited by evidence and usefulness.

---

### Superseded

```text
Localised AI text mathematically guarantees unique content.
```

### Corrected

Wording variation does not guarantee quality, originality or index value.

---

### Superseded

```text
Every valid suburb-category combination should be indexable.
```

### Corrected

Only combinations that pass the usefulness threshold are indexable.

---

### Superseded

```text
Three clicks is an optimal crawl-budget rule.
```

### Corrected

The shallow hierarchy is retained for navigation and internal linking.

---

### Superseded

```text
Every route must use the Edge Runtime.
```

### Corrected

Runtime selection follows verified Cloudflare OpenNext compatibility.

---

### Superseded

```text
AI should generate logo alt text.
```

### Corrected

Alternative text is determined from approved data and image purpose.

---

### Superseded

```text
Spam should immediately be permanently deleted.
```

### Corrected

Reject and audit first; purge later under a retention policy.

---

# 26. Boundary of the separate Ops plan

This master platform plan intentionally does not specify:

* the `/ops` page architecture
* dashboard navigation
* moderation cards
* dashboard actions
* integrated Stripe controls
* Search Console dashboard views
* Cloudflare dashboard views
* system-health panels
* operator authentication implementation
* unified operational reporting

The platform requirements needed by that future plan are preserved here:

* direct Supabase source-of-truth data
* listing and moderation statuses
* ABN results
* Stripe states
* automation job records
* audit history
* publication controls
* integration-ready monitoring data

The separate Ops plan must be built against this corrected directory-first foundation.

---

# Final locked platform model

```text
SuburbMates is a directory first.

Listings may be seeded, submitted, claimed or remain unclaimed.

ABN, ownership and Stripe are independent attributes.

Automation gathers evidence, enriches data and processes integrations.

AI drafts content but does not determine legitimacy.

The operator controls publication during Phase 1.

Only useful, approved pages become publicly indexable.

Future autonomy is introduced through measured, reversible trust policies—not assumptions.
```

[1]: https://business.yelp.com/?utm_source=chatgpt.com "Yelp for Business: Free and paid advertising solutions"
[2]: https://business.gov.au/registrations/register-for-an-australian-business-number-abn?utm_source=chatgpt.com "Register for an Australian Business Number"
[3]: https://developers.google.com/search/docs/essentials/spam-policies?utm_source=chatgpt.com "Spam Policies for Google Web Search"
[4]: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/?utm_source=chatgpt.com "Next.js · Cloudflare Workers docs"
[5]: https://nextjs.org/docs/app/api-reference/edge?utm_source=chatgpt.com "Edge Runtime - API Reference"
[6]: https://nextjs.org/docs/app/getting-started/proxy?utm_source=chatgpt.com "Getting Started: Proxy"
[7]: https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html?utm_source=chatgpt.com "Logging - OWASP Cheat Sheet Series"
[8]: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap?utm_source=chatgpt.com "Build and Submit a Sitemap | Google Search Central"
[9]: https://developers.google.com/search/docs/crawling-indexing?utm_source=chatgpt.com "Overview of crawling and indexing topics"
[10]: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?utm_source=chatgpt.com "How to specify a canonical URL with rel=\"canonical\" and ..."
[11]: https://developers.google.com/search/docs/appearance/structured-data/local-business?utm_source=chatgpt.com "Local Business (LocalBusiness) Structured Data"
[12]: https://developers.google.com/search/docs/monitor-debug/search-console-start?utm_source=chatgpt.com "How To Use Search Console"
[13]: https://developers.google.com/search/docs/monitor-debug/prevent-abuse?utm_source=chatgpt.com "Prevent user-generated spam on your site or platform"
[14]: https://abr.business.gov.au/Documentation/Default?utm_source=chatgpt.com "Web services user guide"
[15]: https://abr.business.gov.au/Documentation/DataDictionary?utm_source=chatgpt.com "Data dictionary"
[16]: https://docs.stripe.com/webhooks?utm_source=chatgpt.com "Receive Stripe events in your webhook endpoint"
[17]: https://docs.stripe.com/agentic-commerce/apps/accept-payment?locale=en-GB&utm_source=chatgpt.com "Accept a payment"
[18]: https://docs.stripe.com/billing/subscriptions/webhooks?utm_source=chatgpt.com "Using webhooks with subscriptions"
[19]: https://www.w3.org/WAI/tutorials/images/decision-tree/?utm_source=chatgpt.com "An alt Decision Tree | Web Accessibility Initiative (WAI)"
[20]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
