# Suburbmates: How the separate Ops document should be built

## Outcome

Create a standalone **SuburbMates Operations Specification** that sits beneath the corrected Master Architecture Plan.

Its purpose is to define one unified operator console for routine platform operations while preserving the directory-first model:

```text
Master Plan
defines what SuburbMates is and how the platform works

Ops Specification
defines how the solo operator reviews, controls and monitors it
```

The Ops document must not alter the Master Plan’s locked rules:

* Listings may be seeded, submitted, claimed or remain unclaimed.
* ABN is optional supporting evidence.
* Stripe represents commercial status, not legitimacy.
* Gemini assists but cannot publish.
* Final publication remains manual during Phase 1.
* Supabase remains the operational source of truth.

The correct product is a **unified daily operations console**, not a “God Mode” replica of every external platform.

---

## Metric

The Ops specification is complete when it enables the following without routine visits to Supabase, Stripe, Cloudflare or Search Console:

1. Review and manage every listing lifecycle state.
2. Publish, reject, unpublish and restore listings.
3. Review claims and ownership status.
4. See autonomous ABN results when available.
5. See locally synchronised Stripe payment and subscription status.
6. Review AI drafts, warnings and failed jobs.
7. Retry supported failed automations.
8. See SEO and indexing-health summaries.
9. See traffic and security-health summaries.
10. See when every external-data view was last synchronised.
11. Maintain an audit trail for every privileged action.

External dashboards should remain necessary only for:

* initial credential and account setup
* account-level compliance or disputes
* emergency infrastructure configuration
* capabilities not exposed through an official API

The document should not promise complete parity with every native dashboard.

---

# 1. Build it as an operations specification, not a UI concept

The earlier Ops drafts concentrated too quickly on cards, badges and buttons.

The new document should be written in this order:

```text
Operating policy
→ state model
→ source-of-truth rules
→ workflows
→ permissions
→ information architecture
→ screen requirements
→ integrations
→ failure handling
→ acceptance criteria
```

This prevents the interface from determining the underlying business rules.

---

# 2. Establish a strict relationship with the Master Plan

The opening section should state that the Ops document:

* implements the corrected platform model
* does not redefine listing eligibility
* does not require ABN verification
* does not equate premium payment with legitimacy
* does not grant AI publication authority
* does not introduce a marketplace or CRM
* does not make the operator manage raw database tables

Any conflict must be resolved in favour of the corrected Master Plan unless the Master Plan is explicitly amended.

---

# 3. Define the operator’s actual responsibilities

The document should first define what the operator needs to accomplish.

## Daily responsibilities

* Review new and changed listings.
* Assess whether sufficient evidence supports publication.
* Correct names, descriptions, categories, suburbs and slugs.
* Approve, reject or unpublish listings.
* Review business claims.
* Identify failed automations.
* Review payment problems affecting premium status.
* Review material SEO or platform-health alerts.

## Periodic responsibilities

* Review stale listings.
* Check unresolved claims.
* Review rejected-listing retention.
* Investigate sustained indexing problems.
* Review recurrent spam sources.
* Confirm integrations remain healthy.

## Exceptional responsibilities

* Stripe disputes or account compliance
* Cloudflare WAF-rule configuration
* Search Console ownership or permission changes
* Supabase database migrations
* secret rotation and account recovery

This distinction prevents rare platform administration from expanding the daily dashboard beyond reason.

---

# 4. Lock the operational state model before designing screens

The Ops document must preserve all independent dimensions from the Master Plan.

## Listing state

```text
draft
pending_review
published
rejected
unpublished
```

## Ownership state

```text
unclaimed
claim_pending
claimed
owner_verified
```

## ABN state

```text
not_provided
pending
matched
partial_match
mismatch
check_failed
```

## Commercial state

At minimum:

```text
free
premium
payment_pending
payment_failed
cancelled
```

Where subscriptions are used, payment and subscription states should remain separate.

## Automation state

```text
queued
running
succeeded
warning
failed
retrying
```

## SEO state

```text
not_eligible
eligible_not_submitted
submitted
indexed
not_indexed
unknown
issue_detected
```

## Listing source

```text
seeded_by_suburbmates
operator_added
business_submitted
claimed_existing_listing
approved_import
```

The UI must never collapse these into one ambiguous label such as “Verified.”

---

# 5. Define Supabase as the operational data hub

The Ops console should not perform multiple live calls to Stripe, Search Console, Cloudflare, ABN Lookup and Gemini every time a page opens.

Instead:

```text
External platform
→ webhook or scheduled synchronisation
→ normalised Supabase record
→ Ops dashboard
```

Supabase should contain:

* current listing data
* ownership and claim state
* ABN results
* Stripe-derived commercial state
* AI outputs and warnings
* automation-job state
* SEO snapshots
* Cloudflare health summaries
* audit records

This provides one stable dashboard even when an external service is temporarily unavailable.

Each synchronised result should include:

```text
source
source_record_id
last_synced_at
sync_status
last_error
data_freshness
```

---

# 6. Use a directory-first information architecture

The primary navigation must reflect the platform’s core purpose.

## Recommended structure

```text
/ops
├── Overview
├── Listings
│   ├── Needs Review
│   ├── Published
│   ├── Rejected
│   ├── Unpublished
│   └── Stale
├── Claims
│   ├── Pending
│   ├── Approved
│   └── Rejected
├── Payments
│   ├── Premium
│   ├── Payment Issues
│   └── Ending or Cancelled
├── SEO
│   ├── Indexing
│   ├── Sitemaps
│   └── Search Performance
└── System
    ├── Failed Jobs
    ├── Integration Health
    ├── Traffic and Security
    └── Audit History
```

**Listings must remain the dominant section.** Payments, SEO and system monitoring support the directory rather than becoming equal products.

---

# 7. Design the Overview as an exception dashboard

The Overview should not be filled with vanity metrics.

It should answer:

> What requires attention now?

Recommended panels:

* Listings awaiting review
* Claims awaiting review
* Failed automations
* Payment issues affecting premium listings
* Published pages with indexing issues
* Stale listings requiring re-verification
* Material security or traffic anomalies
* Integrations with stale or failed synchronisation

Each figure should open the corresponding filtered queue.

Examples:

```text
12 listings need review
3 website checks failed
2 premium payments failed
7 published URLs have unresolved index status
1 integration has not synced in 24 hours
```

---

# 8. Make the listing detail the central workspace

A single card feed is insufficient once listings can be seeded, claimed, updated, rejected and re-reviewed.

Use:

* a filterable listing queue
* a dedicated listing-detail workspace

## Listing queue

Show only enough information to prioritise:

* approved or submitted name
* suburb
* category
* listing source
* listing state
* ownership state
* ABN status
* premium state
* warning count
* last updated
* review priority

## Listing detail

The detail view should contain the complete decision record.

### Submitted or sourced evidence

* Original business name
* Website
* Phone
* Email
* Address or service area where applicable
* Suburb
* Category
* Listing source
* Public evidence source
* Submitted ABN where available
* Logo

### Automated evidence

* Website accessibility result
* Name correspondence
* ABN result
* Current official ABN names
* Stripe status
* Gemini warnings
* Unsupported-claim warnings
* Duplicate-listing warnings
* Automation failures

### Editable public fields

* Approved business name
* Category
* Suburb or service area
* Public description
* Website
* Phone
* Email
* Slug preview
* indexability decision where supported

### History

* Original values
* Previous approved values
* Claim history
* Moderation decisions
* Publication and unpublication dates
* Automation history
* Reviewer and timestamps

---

# 9. Define exact listing actions

## Required Phase 1 actions

```text
Save Draft
Approve & Publish
Reject
Unpublish
Restore for Review
Rerun Supported Checks
```

## Reject

Rejection should require a structured reason, such as:

* obvious spam
* business not found
* outside geographic scope
* category not supported
* misleading or malicious website
* duplicate listing
* insufficient evidence
* prohibited content
* business closed
* other

Do not permanently delete by default.

## Approve and Publish

This action should:

1. Validate required approved fields.
2. Save approved values.
3. preserve the original submission
4. record reviewer and timestamp
5. set publication state
6. calculate the canonical slug
7. trigger required page revalidation
8. make the listing eligible for sitemap inclusion
9. create an audit record

## Unpublish

Require a reason and retain the record.

Possible reasons:

* closed business
* unsafe outbound URL
* ownership dispute
* inaccurate listing
* legal or privacy request
* temporary investigation
* duplicate
* operator decision

---

# 10. Treat ABN as an optional evidence module

The Ops document should specify:

* ABN checks run only where an ABN is supplied or legitimately associated.
* `not_provided` is neutral.
* ABN mismatch does not automatically reject a listing.
* ABN match does not prove ownership.
* The dashboard displays official names and match reasoning.
* Failed checks can be retried.
* The operator may publish using other sufficient public evidence.

No Ops filter should classify “ABN not provided” as inherently suspicious.

---

# 11. Mirror Stripe into Supabase

Stripe webhooks should populate locally stored payment and subscription states. Stripe webhooks are asynchronous, and subscription systems must handle payment failures and subscription status changes rather than relying solely on a successful checkout event. ([Stripe Docs][1])

The Ops document should define:

## Read-only daily information

* Free or premium
* Payment status
* Subscription status
* Current period end
* Last successful payment
* Last failed payment
* Last webhook event
* Webhook processing status

## Actions

The document should phase financially consequential actions.

### Phase 1

* View payment state.
* Retry internal webhook processing where safe.
* Record that a payment issue needs attention.
* Copy or open the relevant external reference only for exceptional investigation.

### Later controlled phase

Potentially add:

* cancel subscription
* issue refund
* resend billing-management link

These actions require confirmations, audit logs and explicit Stripe API handling. They should not delay the core directory moderation launch.

---

# 12. Integrate Search Console as snapshots, not as “Google control”

The Ops document should use the Search Console APIs only for the information they actually provide.

## Available operational data

Search Analytics can provide clicks, impressions and other search-performance dimensions, but the API does not guarantee every row and generally returns top data rather than a complete raw dataset. ([Google for Developers][2])

The URL Inspection API can return the status of the version in Google’s index; it does not provide a live indexability test through that endpoint. ([Google for Developers][3])

The Sitemaps API can report submission, processing, warnings and errors, but its historical `indexed` count field is deprecated and should not be designed as a dependable indexed-page total. ([Google for Developers][4])

## Therefore display

* URL inspection status
* Google-selected canonical
* last crawl where returned
* coverage or indexing result
* mobile or structured-data results where returned
* sitemap processing status
* sitemap errors and warnings
* clicks and impressions
* last Search Console synchronisation

## Do not include

* a promise of real-time Google status
* an authoritative “all pages indexed” count derived from the deprecated sitemap field
* a general “Request indexing” feature

Google’s Indexing API is restricted to pages containing `JobPosting` or livestream `BroadcastEvent` content, so it is not a general submission API for ordinary directory pages. ([Google for Developers][5])

---

# 13. Integrate Cloudflare as operational summaries

Cloudflare’s GraphQL Analytics API can provide HTTP-request and firewall-related data for integration into another application. ([Cloudflare Docs][6])

The Ops document should define read-only summaries such as:

* total requests
* blocked requests
* significant WAF events
* top targeted paths
* unusual request spikes
* bot-related signals
* recent Worker errors where available
* last Cloudflare synchronisation

However, Cloudflare uses adaptive sampling for some analytics datasets, including security-event data at higher volumes. The dashboard must therefore label these figures as operational analytics rather than exact accounting data. ([Cloudflare Docs][7])

Do not replicate full WAF-rule configuration inside the first Ops version.

---

# 14. Add a proper System and automation-health model

Every autonomous workflow should create a visible job record.

## Job types

* ABN lookup
* Website evidence retrieval
* Gemini description generation
* Logo optimisation
* Stripe webhook processing
* Search Console synchronisation
* Cloudflare synchronisation
* Page revalidation
* Sitemap refresh

## Job detail

```text
job_type
listing_id
status
attempt_count
started_at
completed_at
last_error
result_summary
retryable
next_retry_at
```

## Supported actions

* Retry
* Mark resolved
* Open affected listing
* View technical detail
* Copy error reference

A Retry control must only exist where the job is designed to run idempotently.

---

# 15. Define security at every layer

The document must not treat the hidden `/ops` route as security.

## Required model

* Supabase Auth for operator authentication
* one authorised operator identity initially
* server-side authorisation on every protected read
* server-side authorisation on every mutation
* Supabase RLS as defence in depth
* server-only secret use
* audit log for every privileged operation

Next.js currently states that Server Functions can be reached by direct POST requests and that authentication and authorisation must be verified inside each protected function. ([Next.js][8])

Supabase describes RLS as database-level defence in depth that can work with Supabase Auth to control data access. ([Supabase][9])

The implementation details should be finalised only after inspecting the pinned Next.js, Supabase and Cloudflare configuration.

---

# 16. Define data freshness explicitly

Every external panel should show one of:

```text
Current
Delayed
Stale
Sync failed
Not configured
```

Also display:

* source
* last successful synchronisation
* current sync attempt
* last error
* manual refresh where safe

This prevents an old Stripe, Google or Cloudflare result from appearing current.

---

# 17. Build the document in phases

## Phase 1 — Essential daily operations

Include:

* Overview
* Listings
* Claims
* ABN evidence
* Stripe status
* AI drafts and warnings
* automation failures
* audit history
* basic SEO snapshots
* basic security summaries

Actions:

* Save
* Publish
* Reject
* Unpublish
* Restore
* Retry supported checks

## Phase 2 — Deeper integrated operations

Potential additions:

* financial actions
* richer Search Console reporting
* more detailed Cloudflare analytics
* stale-listing review programmes
* bulk operations
* operator notifications
* trend reporting

## Phase 3 — Exception-led autonomy

As validated automation grows:

* ordinary records require less manual work
* uncertain records remain in review queues
* dashboard attention shifts from every listing to exceptions
* publication policy remains measurable and reversible

---

## Timebox

The Ops document should be limited to **Phase 1 daily operations plus clearly separated future phases**.

Do not allow the first specification to become:

* a full Stripe replacement
* a full Search Console replacement
* a Cloudflare WAF editor
* a Supabase database administration interface
* a CRM
* a general analytics warehouse

The document should be complete enough to build the launch console, but prevent future capabilities from entering the initial implementation scope.

---

## Risks and dependencies

### 1. Data-model readiness

The Master Plan lists required information categories, but the actual repository schema must be inspected before the Ops document locks exact table and column names.

### 2. Search Console limitations

Google data will be delayed and incomplete in places. The dashboard must show snapshots and limitations rather than imply direct control over indexing. ([Google for Developers][3])

### 3. Cloudflare analytics precision

Some Cloudflare security data can be sampled. It should be used for operational signals, not exact totals. ([Cloudflare Docs][7])

### 4. Financial-action scope

Refunds and cancellations are technically possible through Stripe APIs, but including them in the first release adds risk and confirmation requirements.

### 5. Authentication implementation

The Ops document can lock the security outcome, but the exact Next.js and Cloudflare-compatible implementation must follow repository verification.

### 6. No-data-loss requirement

The document must preserve every prior synthesised Ops requirement, including both superseded and corrected positions.

---

## Required no-data-loss appendix

The final Ops specification should include a **Decision and Requirement Ledger**.

For every material item from the synthesised messages, record:

```text
Requirement
Source or earlier proposal
Final disposition
Final section
Status
```

Allowed dispositions:

```text
Retained
Corrected
Deferred
Superseded
Unresolved
```

Examples:

| Earlier item                      | Final disposition                               |
| --------------------------------- | ----------------------------------------------- |
| One hidden moderation page        | Corrected to a unified daily operations console |
| ABN badge                         | Retained, but optional and neutral when absent  |
| Stripe tier visibility            | Retained                                        |
| Delete button                     | Superseded by Reject and retention              |
| AI confidence auto-publish        | Superseded                                      |
| Search Console integration        | Retained as snapshots                           |
| Cloudflare integration            | Retained as read-only operational summaries     |
| Daily operations inside `/ops`    | Retained                                        |
| Full native-dashboard replacement | Corrected to routine-operations coverage only   |

This ledger is the mechanism that ensures nothing is silently lost.

---

## Next action

The next deliverable should be the complete standalone:

# **SuburbMates — Unified Operations Specification**

It should contain:

1. Document authority and relationship to the Master Plan
2. Operating objectives and scope boundaries
3. Operator responsibilities
4. Complete operational state model
5. Source-of-truth and synchronisation architecture
6. Navigation and information architecture
7. Overview requirements
8. Listing queue and listing-detail specification
9. Claim-management specification
10. Payment-status specification
11. SEO-monitoring specification
12. Cloudflare and security-monitoring specification
13. Automation-health specification
14. Action and workflow definitions
15. Authentication, authorisation and audit requirements
16. Data-freshness and failure handling
17. Phase 1 acceptance criteria
18. Deferred phases
19. Unresolved decisions
20. Decision and Requirement Ledger

That structure will preserve the synthesised material while producing an Ops plan that is implementable, directory-first and narrow enough for a solo operator.

[1]: https://docs.stripe.com/billing/subscriptions/webhooks?utm_source=chatgpt.com "Using webhooks with subscriptions"
[2]: https://developers.google.com/webmaster-tools/v1/searchanalytics/query?utm_source=chatgpt.com "Search Analytics: query | Search Console API"
[3]: https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect?utm_source=chatgpt.com "Method: index.inspect | Search Console API"
[4]: https://developers.google.com/webmaster-tools/v1/sitemaps?utm_source=chatgpt.com "Sitemaps | Search Console API"
[5]: https://developers.google.com/search/apis/indexing-api/v3/using-api?utm_source=chatgpt.com "How to Use the Indexing API | Google Search Central"
[6]: https://developers.cloudflare.com/analytics/graphql-api/?utm_source=chatgpt.com "GraphQL Analytics API"
[7]: https://developers.cloudflare.com/analytics/graphql-api/sampling/?utm_source=chatgpt.com "Sampling - Analytics"
[8]: https://nextjs.org/docs/app/getting-started/mutating-data?utm_source=chatgpt.com "Getting Started: Mutating Data"
[9]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
