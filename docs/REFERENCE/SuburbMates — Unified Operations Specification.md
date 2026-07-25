# SuburbMates — Unified Operations Specification

## Current authority and operating posture — 26 July 2026

This is a detailed reference only where it agrees with the current [Target State and Operating Authority](./SuburbMates%20%E2%80%94%20Target%20State%20and%20Operating%20Authority.md), [Decision Log](./SuburbMates%20%E2%80%94%20Decision%20Log.md), and [Operations Responsibility and Follow-through Map](./SuburbMates%20%E2%80%94%20Operations%20Responsibility%20and%20Follow-through%20Map.md). The current protected Ops surface is **Work**, **Businesses** and **System**: Work contains only genuine human decisions; Businesses is the real directory register; System is quiet health/readiness context. Deep workflow routes remain protected implementation details, not top-level daily destinations.

The historical Stripe, Payments, tier, payment-status, provider-dashboard, AI-content and manual-only-publication sections below are not active scope. Billing is off and must remain off until a separately approved commercial model exists. Deterministically qualifying approved-source candidates may become unclaimed listings with retained evidence; raw, uncertain or user-submitted candidates remain private. No future implementation may revive a historical section that conflicts with these controls.

**Document status:** Standalone Phase 1 specification
**Authority:** Subordinate to the corrected SuburbMates Master Architecture and Execution Plan
**Primary operator:** One authorised solo operator
**Primary route:** `/ops`
**Operating rule:** Routine platform operations occur inside `/ops`; connected-platform dashboards are reserved for setup, exceptional account administration and emergencies.

---

## 1. Document purpose

This specification defines how SuburbMates will be operated after the platform begins receiving seeded, operator-created, business-submitted and claimed listings.

It converts the platform’s operational data into one usable internal console without requiring the operator to work routinely inside:

* Supabase
* Stripe
* Cloudflare
* Google Search Console
* ABN Lookup
* Gemini administration tools

The original blueprint established Supabase as the database, Stripe as the monetisation service, Cloudflare as the deployment and security layer, Gemini-assisted listing content, the `is_published` gate and public directory routes. 

The pSEO analysis also identified the need for index control, canonical URLs, structured data and abuse protection. 

This document does not change the corrected platform model:

> SuburbMates is a directory-first platform. ABN status, ownership status, commercial status and publication status are independent.

---

# 2. Outcome, metrics and scope

## 2.1 Outcome

Provide one secure operator console that allows the solo operator to:

1. Review and manage all listing lifecycle states.
2. Make final Phase 1 publication decisions.
3. Review and resolve ownership claims.
4. View autonomous ABN results where an ABN exists.
5. View Stripe-derived payment and subscription status.
6. Review AI-generated drafts and warning signals.
7. identify and retry supported failed automations
8. monitor Google indexing and search-performance signals
9. monitor Cloudflare traffic and security summaries
10. review every privileged operational action through an audit history

## 2.2 Success metrics

The Ops system is complete when:

* no routine listing operation requires the Supabase Table Editor
* no routine payment-status check requires the Stripe Dashboard
* no routine indexing check requires opening Search Console
* no routine security-health check requires opening Cloudflare
* no manual ABN lookup is required where an ABN was supplied
* every publication, rejection, unpublication and claim decision is auditable
* stale or failed integration data is clearly labelled
* no automated signal can silently publish a listing during Phase 1
* external system failures do not make unpublished data public

## 2.3 Phase 1 boundary

Phase 1 includes the complete daily operations console.

It does not attempt to reproduce every feature of each connected platform.

The following remain outside routine `/ops` operation:

* changing Supabase schemas or database migrations
* Stripe account compliance, formal disputes and account-level configuration
* creating or modifying Cloudflare WAF rules
* Search Console ownership and permission administration
* API-key creation or rotation
* infrastructure incident debugging requiring raw logs
* destructive data purging under a retention policy

---

# 3. Governing operating principles

## 3.1 Directory first

The primary operational object is a **listing**.

A listing can exist and be published without:

* an owner account
* an ownership claim
* a submitted ABN
* ABN verification
* a Stripe payment
* premium status

A valid listing may be:

```text
Published
Unclaimed
ABN not provided
Free
Seeded by SuburbMates
```

## 3.2 Independent status dimensions

The Ops interface must never collapse different concepts into one general “Verified” state.

It must separately represent:

* listing publication
* ownership or claim
* ABN evidence
* payment and subscription
* listing source
* AI and automation status
* SEO and indexing status

## 3.3 Manual final publication during Phase 1

Automated systems prepare evidence and draft content.

The operator retains responsibility for:

* checking whether the business appears genuine
* confirming the business fits the directory
* correcting the public name
* checking the website and contact information
* reviewing the description
* confirming category and location
* approving the slug
* selecting **Approve & Publish**

ABN, Stripe and AI results support this decision but cannot independently authorise publication.

## 3.4 Supabase as operational source of truth

The dashboard must read normalised operational data from Supabase.

It should not call every external provider live whenever a screen loads.

The preferred pattern is:

```text
External platform or automated function
        ↓
Webhook, event job or scheduled synchronisation
        ↓
Normalised Supabase record
        ↓
/ops
```

This allows `/ops` to remain usable when an external API is temporarily unavailable.

## 3.5 Exception-led design

The Overview must prioritise items requiring attention rather than vanity analytics.

Examples:

* pending listings
* pending claims
* failed automation
* payment failures affecting premium status
* published URLs with indexing issues
* stale integration data
* significant security anomalies

---

# 4. Operator model

## 4.1 Initial role

Phase 1 supports one authorised operator.

No general role-based access-control system or admin hierarchy is required.

The operator must be identified through:

* Supabase Auth
* a server-side authorised user identifier
* an environment-configured `ADMIN_UUID` or equivalent protected allow-list

## 4.2 Operator permissions

The authorised operator may:

* read all operational listing information
* edit approved public fields
* approve and publish listings
* reject listings
* unpublish listings
* restore rejected or unpublished listings for review
* review and decide claims
* view billing status
* retry supported jobs
* view SEO and security summaries
* view audit records

## 4.3 Prohibited client authority

The browser must never receive unrestricted Supabase secret credentials or direct authority to bypass database controls.

Every sensitive read and mutation must be authorised server-side.

Next.js states that exported Server Functions can be reached through direct POST requests, so authentication and authorisation must be checked inside each protected function rather than relying only on the visible interface. ([Next.js][1])

---

# 5. Operational state model

## 5.1 Listing status

```text
draft
pending_review
published
rejected
unpublished
```

### Definitions

| Status           | Meaning                                                       |
| ---------------- | ------------------------------------------------------------- |
| `draft`          | Incomplete internal record not ready for review               |
| `pending_review` | Record has sufficient information to enter the operator queue |
| `published`      | Public listing approved by the operator                       |
| `rejected`       | Listing retained internally but not approved                  |
| `unpublished`    | Previously public listing removed from public access          |

## 5.2 Ownership status

```text
unclaimed
claim_pending
claimed
owner_verified
```

| Status           | Meaning                                                 |
| ---------------- | ------------------------------------------------------- |
| `unclaimed`      | No approved business owner controls the listing         |
| `claim_pending`  | A claim request is awaiting review                      |
| `claimed`        | A claim was accepted under the implemented claim policy |
| `owner_verified` | A stronger ownership-verification process was completed |

Publication does not automatically change ownership status.

## 5.3 ABN status

```text
not_provided
pending
matched
partial_match
mismatch
check_failed
```

`not_provided` is neutral.

It must not:

* lower the listing automatically
* create a spam warning by itself
* prevent publication
* imply that the business is illegitimate

## 5.4 Commercial tier

```text
free
premium
```

## 5.5 Payment status

```text
not_applicable
pending
paid
failed
refunded
partially_refunded
disputed
unknown
```

## 5.6 Subscription status

Where premium is recurring:

```text
not_applicable
trialing
active
past_due
unpaid
paused
cancelled
ended
unknown
```

The exact values must be normalised from Stripe rather than exposing raw provider values inconsistently.

## 5.7 Listing source

```text
seeded_by_suburbmates
operator_added
business_submitted
claimed_existing_listing
approved_import
```

## 5.8 Automation status

```text
queued
running
succeeded
warning
failed
retrying
cancelled
```

## 5.9 SEO eligibility status

```text
not_eligible
eligible
noindex
unknown
```

## 5.10 Google index status

```text
not_checked
indexed
not_indexed
unknown
issue_detected
```

The Search Console URL Inspection API reports the version known to Google and does not perform a live indexability test, so `/ops` must not describe its data as real-time live-page validation. ([Google for Developers][2])

## 5.11 Data-freshness status

```text
current
delayed
stale
sync_failed
not_configured
```

Freshness thresholds must be derived from each integration’s expected synchronisation interval rather than using one global threshold.

---

# 6. Logical data architecture

Exact table names must be confirmed against the repository before migrations are written. The following is the required logical structure.

## 6.1 Core listing record

The existing `vendors` table remains the central listing entity.

It must make available:

```text
id
slug
business_name
approved_business_name
website
phone
contact_email
suburb_slug
category_slug
description
listing_status
listing_source
ownership_status
tier
is_published
created_at
updated_at
published_at
unpublished_at
last_verified_at
```

## 6.2 Listing provenance

A source record should retain:

```text
vendor_id
source_type
source_url
source_name
source_notes
captured_at
captured_by
```

This establishes why a seeded or operator-added listing was considered to exist.

## 6.3 ABN evidence

Store ABN checks separately or as a complete structured record:

```text
vendor_id
submitted_abn
abn_status
entity_status
official_names
state
postcode
match_type
match_explanation
checked_at
raw_response_reference
last_error
```

ABN Lookup supports application integration for ABN validation and database updates. Its official guidance warns against relying on trading-name fields because they have not been updated since 2012. ([ABN Lookup][3])

## 6.4 Claim record

```text
id
vendor_id
claimant_user_id
claim_status
submitted_evidence
review_notes
reviewed_by
submitted_at
reviewed_at
```

Recommended claim statuses:

```text
pending
needs_information
approved
rejected
revoked
withdrawn
```

## 6.5 Billing state

```text
vendor_id
tier
payment_status
subscription_status
stripe_customer_id
stripe_subscription_id
stripe_checkout_session_id
stripe_current_period_end
last_successful_payment_at
last_failed_payment_at
last_stripe_event_id
last_stripe_event_at
last_reconciled_at
```

## 6.6 AI review and content draft

```text
vendor_id
draft_description
risk_labels
unsupported_claims
website_accessible
business_name_found
location_evidence_found
manual_review_reasons
model_name
prompt_version
generated_at
status
last_error
```

## 6.7 Automation jobs

```text
id
job_type
vendor_id
status
attempt_count
started_at
completed_at
next_retry_at
retryable
result_summary
last_error
correlation_id
```

## 6.8 SEO snapshots

```text
url
vendor_id
inspection_status
coverage_state
google_canonical
user_canonical
last_crawl_at
rich_results_status
mobile_status
clicks
impressions
snapshot_date
last_synced_at
sync_status
last_error
```

## 6.9 Sitemap snapshots

```text
sitemap_url
submitted_at
last_downloaded_at
warnings
errors
last_synced_at
sync_status
```

## 6.10 Traffic and security snapshots

```text
period_start
period_end
total_requests
blocked_requests
security_events
top_targeted_paths
suspected_bot_requests
worker_error_summary
sampled
confidence_information
last_synced_at
sync_status
```

Cloudflare’s GraphQL Analytics API supports HTTP and firewall-related data for integration into another application. Some datasets use adaptive sampling, so `/ops` must label sampled figures and avoid presenting them as exact accounting totals. ([Cloudflare Docs][4])

## 6.11 Integration health

```text
integration
configured
status
last_attempt_at
last_success_at
next_expected_sync_at
last_error
failure_count
```

## 6.12 Audit log

```text
id
actor_user_id
action_type
entity_type
entity_id
before_snapshot
after_snapshot
reason
created_at
correlation_id
```

The audit log must cover:

* publication
* rejection
* unpublication
* restoration
* claim decisions
* public-field edits
* slug changes
* tier overrides
* job retries
* privileged synchronisation actions

---

# 7. Synchronisation architecture

## 7.1 Stripe

Stripe should primarily update Supabase through verified webhooks.

The webhook processor must:

1. Verify Stripe signatures.
2. reject invalid events
3. store the Stripe event identifier
4. prevent duplicate processing
5. normalise payment and subscription states
6. update the relevant vendor billing record
7. create an automation or event log
8. leave publication status unchanged

Stripe webhooks are asynchronous and may report later events such as recurring payment success or failure. Stripe also supports idempotency for safe retries. ([Stripe Docs][5])

A scheduled reconciliation job should compare locally stored billing state with Stripe periodically so a missed webhook does not leave `/ops` permanently inaccurate.

## 7.2 ABN Lookup

ABN checking is event-driven when:

* a submitted listing contains an ABN
* an operator adds an ABN
* a previously failed check is retried
* the ABN changes

The existing GUID stored in `.env` remains the credential.

The result is stored in Supabase and displayed in `/ops`.

The operator does not need to visit the ABN Lookup website routinely.

## 7.3 Gemini

Gemini processing is event-driven when:

* a listing becomes ready for enrichment
* relevant business information changes
* the operator requests regeneration
* a failed job is retried

Gemini writes:

* a draft description
* warning labels
* unsupported-claim flags
* evidence-presence indicators
* manual-review reasons

It never writes `is_published = true`.

## 7.4 Google Search Console

Search Console data should be synchronised on a scheduled basis.

The official API provides:

* Search Analytics
* Sitemaps
* URL Inspection
* site-related resources

([Google for Developers][6])

Phase 1 should use:

* daily aggregate Search Analytics synchronisation
* sitemap status synchronisation
* prioritised URL Inspection for newly published or problematic URLs
* on-demand inspection refresh subject to API quotas

The API has usage limits, so `/ops` must queue and prioritise inspections rather than calling the API for every page load. ([Google for Developers][7])

## 7.5 Cloudflare

Cloudflare data should be synchronised into operational summaries rather than queried separately by every browser session.

Recommended Phase 1 pattern:

* hourly security and traffic summaries
* daily consolidated trend snapshot
* on-demand refresh where API limits allow
* automatic warning creation when thresholds are exceeded

Cloudflare’s GraphQL API has request limits, reinforcing the need for synchronised summaries rather than uncontrolled page-level queries. ([Cloudflare Docs][8])

---

# 8. Route and information architecture

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
│   ├── Needs Information
│   ├── Approved
│   └── Rejected
├── Payments
│   ├── Premium
│   ├── Payment Issues
│   ├── Ending or Cancelled
│   └── Reconciliation Issues
├── SEO
│   ├── Indexing
│   ├── Sitemaps
│   ├── Search Performance
│   └── Structured Data
├── System
│   ├── Failed Jobs
│   ├── Integration Health
│   ├── Traffic and Security
│   └── Audit History
└── Settings
    └── Read-only integration configuration status
```

## 8.1 Navigation priority

The order must remain directory-first:

1. Overview
2. Listings
3. Claims
4. Payments
5. SEO
6. System

Payments and analytics support the directory. They are not the primary product.

## 8.2 Route visibility

`/ops` must:

* be absent from public navigation
* be excluded from the public sitemap
* return `noindex`
* require authentication and authorisation

These controls reduce accidental discovery but do not replace access security.

---

# 9. Overview specification

## 9.1 Purpose

The Overview answers:

> What requires attention now?

## 9.2 Required priority cards

Each count links to its filtered queue.

### Listings

* Pending review
* High-risk warnings
* Stale published listings
* Recently unpublished
* Duplicate candidates

### Claims

* Pending claims
* Claims awaiting more information
* Ownership conflicts

### Payments

* Failed premium payments
* Past-due subscriptions
* Cancelled premium subscriptions still showing premium
* Stripe events that failed local processing

### SEO

* Newly published URLs not yet inspected
* Published URLs reported as not indexed
* Google canonical mismatches
* Sitemap errors or warnings
* Structured-data issues

### System

* Failed jobs
* Jobs exceeding expected duration
* integrations with stale data
* repeated ABN failures
* repeated Gemini failures
* security anomalies

## 9.3 Secondary operational metrics

Show only metrics that support decisions:

* listings published during the selected period
* listings rejected during the selected period
* median review age
* claims approved
* premium listing count
* search clicks and impressions
* blocked-request trend
* automation success rate

Avoid vanity totals that provide no operational action.

---

# 10. Listings queue specification

## 10.1 Queue purpose

The Listings queue provides rapid triage and access to complete listing details.

It should not attempt to show every field in a single card.

## 10.2 Required columns

* Approved or submitted business name
* Suburb
* Category
* Listing source
* Listing status
* Ownership status
* ABN status
* Tier
* Payment or subscription warning
* AI or evidence warning count
* Website status
* Last updated
* Queue age
* Priority

## 10.3 Required filters

### Listing lifecycle

* Draft
* Pending review
* Published
* Rejected
* Unpublished

### Listing source

* Seeded
* Operator-added
* Business-submitted
* Claimed existing
* Imported

### Ownership

* Unclaimed
* Claim pending
* Claimed
* Owner verified

### ABN

* Not provided
* Matched
* Partial match
* Mismatch
* Failed

### Commercial

* Free
* Premium
* Payment issue
* Subscription ending or cancelled

### Evidence and risk

* Website inaccessible
* Possible duplicate
* Keyword-stuffed name
* Unsupported AI claims
* Missing contact method
* Failed automation
* Stale listing

## 10.4 Sorting

Support:

* oldest pending first
* newest first
* highest warning count
* premium payment issue
* claim pending
* stale verification
* alphabetical
* suburb
* category

## 10.5 Search

Search by:

* business name
* approved business name
* website domain
* phone
* email
* ABN
* suburb
* category
* listing ID
* Stripe customer reference where authorised

---

# 11. Listing-detail workspace

## 11.1 Purpose

The listing-detail page is the central decision workspace.

It must place submitted evidence, automated signals, editable public information and history in one view.

## 11.2 Header

Display:

* approved business name or submitted name
* listing status
* listing source
* ownership status
* suburb
* category
* tier
* last updated
* public profile link when published

Primary actions appear in the header or fixed action area.

## 11.3 Evidence panel

Display:

* original submitted or sourced name
* website
* phone
* email
* suburb or service area
* category
* public source URL
* source notes
* logo
* submitted ABN where available
* date evidence was collected

The original values must remain visible after edits.

## 11.4 Website panel

Display:

* destination URL
* final resolved domain
* accessibility result
* redirect warning
* whether the business name was found
* whether location evidence was found
* last check time
* last error
* direct safe-preview or open action

A website result is evidence, not an automatic legitimacy decision.

## 11.5 ABN panel

Display:

* submitted ABN
* ABN status
* entity status
* official current names
* state
* postcode
* match type
* match explanation
* last checked
* retry action where appropriate

Absence of an ABN must display neutrally:

```text
ABN not provided
```

## 11.6 Stripe panel

Display:

* Free or Premium
* Payment status
* Subscription status
* Current period end
* Last successful payment
* Last failed payment
* Last webhook event
* Last reconciliation
* Data freshness
* Processing warnings

Payment information must not appear as a generic legitimacy badge.

## 11.7 AI panel

Display:

* draft description
* risk labels
* unsupported claims
* website evidence indicators
* manual-review reasons
* model and prompt version
* generation time
* job status

The operator must be able to:

* accept the draft
* edit it
* discard it
* regenerate it
* retry a failed job

Regeneration must not overwrite an operator-approved description without confirmation.

## 11.8 Editable public fields

The operator may edit:

* approved business name
* public description
* category
* suburb or service area
* website
* public phone
* public email
* logo selection
* slug preview

## 11.9 Slug handling

The interface must show:

* proposed slug
* current slug
* collision warnings
* whether changing it will affect a published URL

For unpublished listings, the slug may be regenerated from the approved business name.

For published listings, a slug change must require confirmation and create a redirect from the previous canonical URL where technically supported.

The final slug lifecycle remains subject to the Master Plan’s unresolved-decision process.

## 11.10 History panel

Display:

* original submission
* prior approved values
* publication events
* unpublication events
* rejection events
* claim history
* ABN checks
* AI runs
* payment changes
* operator actions
* automation failures and retries

---

# 12. Listing actions

## 12.1 Save Draft

Saves operator edits without changing public visibility.

Requirements:

* validate field formats
* preserve original submitted values
* write an audit event
* do not publish
* do not modify claim or ABN state
* do not trigger sitemap inclusion

## 12.2 Approve & Publish

This is the Phase 1 publication authority.

The action must:

1. Re-authorise the operator.
2. validate required approved fields
3. confirm the website and public contact formats
4. confirm category and location
5. validate or generate the slug
6. save approved values
7. set `listing_status = published`
8. set `is_published = true`
9. set `published_at`
10. record the operator
11. write a complete audit event
12. enqueue page revalidation or cache refresh
13. make the URL eligible for sitemap inclusion
14. enqueue a Search Console snapshot job when appropriate

It must not:

* alter ABN status
* mark ownership as claimed
* change payment status
* imply a general “Verified” state

## 12.3 Reject

Rejection retains the record.

A structured reason is required.

Recommended reasons:

```text
obvious_spam
business_not_found
outside_geographic_scope
unsupported_category
malicious_or_misleading_website
duplicate_listing
insufficient_evidence
prohibited_content
business_closed
invalid_submission
other
```

The action must:

* set `listing_status = rejected`
* set `is_published = false`
* preserve all source data
* save the reason and operator note
* record reviewer and date
* write an audit event

## 12.4 Unpublish

Used for a previously public listing.

A reason is required.

Recommended reasons:

* business closed
* unsafe outbound URL
* inaccurate listing
* duplicate
* ownership dispute
* privacy or legal concern
* investigation
* operator decision
* payment-related presentation correction, where only premium status is affected

Unpublishing must:

* make the public page inaccessible or non-public according to platform policy
* remove it from future sitemap output
* retain prior public values
* record the reason and operator
* enqueue cache and sitemap updates

A failed premium payment alone should ordinarily remove premium benefits, not automatically delete or reject the underlying directory listing.

## 12.5 Restore for Review

Moves a rejected or unpublished record back to `pending_review`.

It must not publish automatically.

## 12.6 Retry Supported Checks

Available checks may include:

* ABN lookup
* website evidence retrieval
* Gemini draft generation
* logo processing
* Search Console inspection
* Stripe reconciliation

Retry must only be enabled for idempotent jobs.

---

# 13. Claim-management specification

## 13.1 Claims queue

Display:

* claimant
* business listing
* claim status
* submission date
* evidence summary
* listing ownership status
* conflicting claims
* operator notes

## 13.2 Claim detail

Show:

* claimant account
* requested listing
* evidence submitted
* business contact correspondence
* existing listing source
* ABN evidence where available
* relevant website or domain evidence
* prior claims
* warnings or conflicts

ABN evidence may support a claim but cannot independently prove that the claimant controls the listing.

## 13.3 Claim actions

```text
Approve Claim
Reject Claim
Request More Information
Revoke Claim
```

## 13.4 Approve Claim

The action must:

* set claim status to approved
* update ownership status
* associate the approved user
* preserve the listing’s publication state
* record the operator and basis
* write an audit event

Approving a claim must not automatically:

* publish an unpublished listing
* mark the ABN as matched
* change the tier
* approve unreviewed public edits

## 13.5 Claim verification policy

The exact ownership-verification method remains unresolved and must be defined before claims are launched.

Possible evidence may include:

* domain email
* website verification
* business email confirmation
* documented authority
* another approved method

The Ops implementation must support evidence review without prematurely locking one method into the schema.

---

# 14. Payments specification

## 14.1 Purpose

The Payments section provides operational awareness of commercial status without turning `/ops` into a full accounting platform.

## 14.2 Required views

### Premium

* Active premium listings
* Current subscription state
* Current period end
* Last successful payment

### Payment Issues

* Failed payment
* Past due
* Unpaid
* Webhook processing failed
* Local and Stripe state mismatch

### Ending or Cancelled

* Cancelled
* Ending at period close
* Expired
* Premium benefits awaiting removal

### Reconciliation Issues

* No recent reconciliation
* Unknown customer reference
* Missing vendor mapping
* Duplicate Stripe association
* Event processing failure

## 14.3 Phase 1 actions

* View local billing history
* Resynchronise the billing record
* Retry failed local event processing
* Remove premium presentation where the commercial state no longer qualifies
* Mark an issue resolved
* open the affected listing
* copy the Stripe reference for exceptional investigation

## 14.4 Deferred financial actions

The following are not required for the first operational release:

* issuing refunds
* partial refunds
* cancelling subscriptions
* responding to disputes
* changing payment methods
* editing invoices

These may later be added with:

* explicit confirmation
* separate authorisation
* Stripe API validation
* idempotency
* complete audit records

Until then, native Stripe access is allowed only for these exceptional financial actions.

---

# 15. SEO operations specification

## 15.1 Indexing view

Show one row per canonical public URL.

Required information:

* listing or taxonomy page
* canonical URL
* publication state
* SEO eligibility
* Google index status
* Google-selected canonical
* user-declared canonical
* last crawl date
* last inspection date
* sitemap inclusion
* issue summary
* freshness

## 15.2 Filters

* Published but not inspected
* Published but not indexed
* Canonical mismatch
* Crawled but not indexed
* Blocked or excluded
* Structured-data issue
* Mobile issue
* Sitemap issue
* Stale inspection
* Recently published

## 15.3 Search-performance view

Display:

* clicks
* impressions
* click-through rate where calculated
* average position where returned
* comparison with prior period
* top pages
* top queries
* pages losing traffic
* pages gaining traffic

Search Analytics supports filtered search-traffic queries across dimensions such as pages, queries, countries and devices. ([Google for Developers][9])

## 15.4 Sitemap view

Display:

* sitemap URL
* submission state
* last submitted
* last downloaded
* warnings
* errors
* last synchronised

The Search Console API supports listing, retrieving and submitting sitemap records. ([Google for Developers][10])

## 15.5 Structured-data view

Display issues associated with supported vendor-page markup where Search Console or inspection data makes them available.

Do not claim:

* that structured data guarantees a rich result
* that a valid schema guarantees indexing
* that Search Console data is live

## 15.6 SEO actions

Phase 1 supports:

* refresh stored Search Console data
* queue a priority URL inspection
* open the affected listing
* mark an issue for investigation
* rerun local page validation
* verify sitemap eligibility
* view declared and Google-selected canonicals

It does not provide a general “force Google to index” action.

---

# 16. Traffic and security specification

## 16.1 Purpose

Provide sufficient security visibility for daily operations without replicating Cloudflare’s full configuration interface.

## 16.2 Required summaries

* Total requests
* Request trend
* Blocked requests
* Security-event trend
* Suspected bot traffic
* Top targeted paths
* Most common block reasons
* Significant traffic spikes
* Worker or application error summary where available
* Last Cloudflare synchronisation
* Whether values are sampled

## 16.3 Alert conditions

Create an attention item where configurable thresholds indicate:

* substantial request spike
* large increase in blocked requests
* concentrated attack on a route
* repeated attack against submission endpoints
* sustained Worker errors
* synchronisation failure
* repeated requests to invalid taxonomy routes

## 16.4 Phase 1 actions

* Open related operational detail
* filter affected paths
* acknowledge alert
* mark resolved
* record an operator note
* refresh the snapshot

WAF rule creation, modification and emergency mitigation remain Cloudflare-native exceptional operations.

---

# 17. Automation and system-health specification

## 17.1 Job types

The System section must support:

```text
abn_lookup
website_evidence
gemini_description
logo_processing
stripe_webhook
stripe_reconciliation
search_console_sync
url_inspection
cloudflare_sync
page_revalidation
sitemap_refresh
duplicate_detection
```

## 17.2 Failed Jobs queue

Display:

* job type
* affected listing or URL
* status
* attempt count
* first failure
* latest attempt
* latest error
* retryability
* next scheduled retry
* correlation reference

## 17.3 Integration Health

One row per integration:

* Supabase
* Stripe
* ABN Lookup
* Gemini
* Google Search Console
* Cloudflare
* media-processing service

Display:

```text
Configured
Healthy
Delayed
Stale
Failed
Not configured
```

Also display:

* last attempt
* last success
* next expected sync
* current failure count
* last error

## 17.4 Retry behaviour

A retry action must:

1. Re-authorise the operator.
2. confirm that the job is retryable
3. avoid duplicate side effects
4. create a new attempt record
5. preserve the original failure
6. update the affected listing only after success
7. write an audit event

## 17.5 Manual resolution

Some failures cannot be rerun.

Provide:

* Mark resolved
* Add operator note
* Open affected listing
* Copy technical reference

---

# 18. Audit-history specification

## 18.1 Global audit view

Filters:

* operator
* action
* entity type
* listing
* claim
* date
* successful or failed
* reason

## 18.2 Required audited actions

* Save public-field edits
* Publish
* Reject
* Unpublish
* Restore
* Claim approval
* Claim rejection
* Claim revocation
* Slug change
* Premium-state override
* Job retry
* Manual synchronisation
* Alert resolution

## 18.3 Audit record presentation

Display:

* timestamp
* operator
* action
* affected record
* reason
* changed fields
* before and after values
* correlation ID
* outcome

Sensitive secrets and full payment credentials must never be written into audit snapshots.

---

# 19. Security specification

## 19.1 Authentication

Use Supabase Auth or the repository’s confirmed authentication implementation.

The operator must authenticate before accessing `/ops`.

## 19.2 Authorisation

Every protected read and action must call a central server-side authorisation function such as:

```text
verifyOpsAdmin()
```

This must compare the authenticated user with the authorised operator configuration.

## 19.3 Database security

Enable Supabase Row Level Security on exposed tables.

Public access must be restricted to approved public records.

Operational records must be accessible only through authorised policies or trusted server-side operations.

Supabase describes RLS as database-level defence in depth that can be combined with Supabase Auth. ([Supabase][11])

## 19.4 Secret handling

Never expose to the browser:

* Supabase secret or service-role key
* Stripe secret key
* Stripe signing secret
* Gemini API key
* ABN Lookup GUID
* Search Console OAuth credentials
* Cloudflare API token

## 19.5 Route protection

A route-level check may redirect unauthorised users early, but it is not the sole security layer.

Sensitive data access must still be authorised inside:

* page-level server reads
* route handlers
* Server Functions or Actions
* background jobs
* database policies

## 19.6 Runtime and Cloudflare compatibility

Do not force every Ops route into the Edge Runtime.

Use the runtime supported by the repository’s pinned Next.js and Cloudflare OpenNext configuration.

Cloudflare currently supports App Router, Route Handlers, Server Actions, SSR and other major Next.js features through its Workers/OpenNext path, while specific middleware runtime combinations still have limitations. ([Cloudflare Docs][12])

---

# 20. Data-freshness and failure presentation

## 20.1 Required freshness display

Every externally sourced panel must display:

* source
* last successful synchronisation
* current status
* expected next synchronisation
* last error
* whether a manual refresh is available

## 20.2 Freshness rules

Each integration must define its own expected interval.

Example operational defaults, subject to implementation confirmation:

| Integration    | Primary update                 | Reconciliation              |
| -------------- | ------------------------------ | --------------------------- |
| Stripe         | Webhook-driven                 | Daily                       |
| ABN Lookup     | On submission or edit          | Manual retry                |
| Gemini         | Event-driven                   | Manual retry                |
| Search Console | Daily                          | Priority on demand          |
| Cloudflare     | Hourly summary                 | Daily consolidated snapshot |
| Sitemap        | On relevant publication change | Scheduled validation        |

## 20.3 Fail-safe rule

When external data is unavailable:

* preserve the last known result
* label it stale or failed
* do not present it as current
* do not publish based on it
* create an operational warning
* permit a supported retry

---

# 21. Phase 1 operating workflows

## 21.1 New seeded listing

```text
Public evidence collected
→ Internal listing created
→ Source recorded
→ Website and optional ABN checks
→ AI draft generated
→ Listing enters Needs Review
→ Operator edits and verifies
→ Approve & Publish or Reject
```

## 21.2 Business-submitted listing

```text
Submission received
→ Unpublished record created
→ Optional ABN check
→ Website evidence check
→ AI draft and warnings
→ Payment status attached where applicable
→ Operator review
→ Approve & Publish or Reject
```

## 21.3 Claim request

```text
Claim submitted
→ Claim enters queue
→ Evidence reviewed
→ Request more information, approve or reject
→ Ownership state updated
→ Publication remains a separate decision
```

## 21.4 Premium payment

```text
Stripe event received
→ Signature verified
→ Event deduplicated
→ Billing state updated
→ Premium presentation applied when eligible
→ Listing publication remains unchanged
→ Payment issue enters queue if processing fails
```

## 21.5 Published listing develops an issue

```text
SEO, website, claim or security issue detected
→ Attention item created
→ Listing detail opened
→ Operator investigates
→ Correct, unpublish or dismiss with reason
→ Audit record written
```

## 21.6 Automation failure

```text
Job fails
→ Failure record retained
→ System queue updated
→ Automatic retry where configured
→ Operator retry where supported
→ Manual resolution where retry is unsafe
```

---

# 22. External-platform access policy

## 22.1 Supabase

**Routine access:** None.

Use Supabase directly only for:

* migrations
* schema changes
* RLS development
* emergency database repair
* technical debugging unavailable through `/ops`

## 22.2 Stripe

**Routine access:** None.

Use Stripe directly only for:

* disputes
* refunds or cancellations not yet exposed safely in `/ops`
* account compliance
* tax or business settings
* webhook-endpoint configuration
* emergency reconciliation

## 22.3 Cloudflare

**Routine access:** None.

Use Cloudflare directly only for:

* WAF rule changes
* DNS changes
* API-token management
* deployment incidents
* emergency traffic mitigation
* unsupported diagnostic detail

## 22.4 Google Search Console

**Routine access:** None.

Use Search Console directly only for:

* initial property verification
* permissions and OAuth setup
* manual diagnostics not exposed through the API
* exceptional investigation requiring native reports

## 22.5 ABN Lookup

**Routine access:** None.

Use the native service only for:

* API-registration administration
* exceptional verification where the API result is ambiguous or unavailable

## 22.6 Gemini administration

**Routine access:** None.

Use it directly only for:

* API-key management
* model availability
* billing or quota administration
* provider-level incidents

---

# 23. Phase 1 acceptance criteria

## 23.1 Access and security

* `/ops` is unavailable without authentication.
* An authenticated non-operator cannot read Ops data.
* Every mutation independently checks authorisation.
* Operational tables are protected by RLS or trusted server access.
* No secret is included in client bundles or API responses.
* `/ops` is excluded from public sitemaps and marked `noindex`.

## 23.2 Listings

* All lifecycle states are visible.
* The operator can search and filter listings.
* Original and approved values remain distinguishable.
* The operator can save, publish, reject, unpublish and restore.
* Missing ABN status does not block publication.
* Payment status does not control publication.
* AI output cannot control publication.
* Rejected listings are retained with reasons.
* Every privileged action creates an audit record.

## 23.3 Claims

* Claim state is independent of publication.
* Claims can be reviewed and decided.
* Evidence and decision reasons are retained.
* Approving a claim does not publish an unpublished listing automatically.

## 23.4 Stripe

* Webhook signatures are verified.
* Duplicate events do not create duplicate effects.
* Local payment and subscription states are visible.
* Failed local event processing appears in `/ops`.
* Billing state can be reconciled.
* Premium status changes do not delete the underlying listing.

## 23.5 ABN

* The existing GUID is used server-side.
* ABN lookup runs without routine operator action.
* Official names and match explanation are visible.
* Trading-name fields are not treated as definitive.
* `not_provided` is neutral.
* Failure does not automatically reject or publish.

## 23.6 AI

* Draft and warning output is visible.
* Operator edits cannot be overwritten silently.
* Invalid model output fails safely.
* Model confidence cannot publish a listing.
* Regeneration and retry are auditable.

## 23.7 SEO

* Search Console snapshots are visible.
* Data freshness is displayed.
* Published URLs with issues can be filtered.
* Canonical mismatches are visible.
* Sitemap warnings and errors are visible.
* The interface does not claim live indexing control.

## 23.8 Cloudflare

* Traffic and security summaries are visible.
* Sampled values are labelled.
* Significant anomalies create attention items.
* WAF configuration is not required for daily monitoring.

## 23.9 System health

* All supported job types are visible.
* Failed jobs contain actionable context.
* Safe retries are available.
* Integration health and last success are visible.
* Stale data cannot appear current.

---

# 24. Deferred capabilities

The following are deliberately deferred until the core Ops system is stable:

* multi-user operator roles
* complex RBAC
* bulk publication
* automatic publication
* automatic claim approval
* automatic ABN-based publication
* automatic payment-based publication
* automatic Gemini-based publication
* refunds and subscription cancellation from `/ops`
* dispute management
* Cloudflare WAF rule editing
* full Supabase database administration
* real-time analytics warehouse
* custom report builder
* complete native-dashboard parity
* permanent rejected-record purge UI
* configurable notification centre
* advanced bulk SEO inspection

---

# 25. Unresolved implementation decisions

These must be resolved during repository analysis and must not be silently assumed.

1. Exact Next.js version and Cloudflare/OpenNext configuration.
2. Exact database table and column names.
3. Claim-verification method.
4. Premium billing model: recurring, fixed-duration or both.
5. Slug changes and redirect policy.
6. Rejected-record retention period.
7. Exact Search Console OAuth and property model.
8. Exact Cloudflare datasets available under the account plan.
9. Cloudflare warning thresholds.
10. Search Console synchronisation frequency within quotas.
11. Whether payment refunds and cancellations enter a later Ops release.
12. Whether public/noindex listings are required as a distinct operator state.
13. Exact stale-listing re-verification schedule.
14. Whether listing source URLs are visible publicly or only operationally.
15. Exact method used for website content retrieval and safety checks.

---

# 26. Implementation sequence

## Stage 1 — Repository and schema audit

Confirm:

* project paths
* Next.js version
* Supabase clients
* authentication
* existing vendor schema
* Stripe implementation
* ABN environment value
* Gemini integration
* Cloudflare deployment
* existing audit or job tables

## Stage 2 — Operational data foundation

Implement or migrate:

* listing states
* ownership states
* ABN records
* billing state
* claim records
* automation jobs
* SEO snapshots
* security snapshots
* integration health
* audit log

## Stage 3 — Security foundation

Implement:

* operator authentication
* central authorisation
* protected server reads
* protected mutations
* RLS
* secret separation
* noindex and sitemap exclusion

## Stage 4 — Directory operations

Build:

* Overview
* Listings queue
* Listing detail
* Save
* Approve & Publish
* Reject
* Unpublish
* Restore
* audit history

## Stage 5 — Claims

Build:

* Claims queue
* Claim detail
* Request information
* Approve
* Reject
* Revoke

## Stage 6 — Integrated status

Build:

* Stripe status and reconciliation
* ABN results and retry
* AI output and retry
* automation-health queues

## Stage 7 — SEO and security summaries

Build:

* Search Console synchronisation
* URL inspection summaries
* sitemap status
* search performance
* Cloudflare traffic and security snapshots
* alert thresholds

## Stage 8 — Acceptance pass

Verify every Phase 1 acceptance criterion before routine operations are moved away from the native dashboards.

---

# 27. Decision and Requirement Ledger

| Earlier proposal or requirement                 | Final disposition            | Final rule                                                                                     |
| ----------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Do not build a custom admin dashboard           | **Superseded**               | A custom unified Ops console is required because Supabase is unsuitable for routine moderation |
| Use Supabase Table Editor for approval          | **Superseded**               | Routine listing operations occur in `/ops`                                                     |
| Use Stripe Dashboard for routine billing checks | **Superseded**               | Stripe status is synchronised into Supabase and displayed in `/ops`                            |
| Use Cloudflare Dashboard for routine monitoring | **Corrected**                | Cloudflare summaries are displayed in `/ops`; native access is exceptional                     |
| Search Console monitoring                       | **Retained and elevated**    | SEO snapshots are a required Phase 1 Ops function                                              |
| One hidden `/ops` route                         | **Retained and expanded**    | `/ops` becomes a unified console with internal sections                                        |
| Hidden route as security                        | **Superseded**               | Server authorisation and RLS are mandatory                                                     |
| One authorised operator                         | **Retained**                 | No complex RBAC in Phase 1                                                                     |
| `ADMIN_UUID`                                    | **Retained with correction** | May identify the operator but cannot be the only security mechanism                            |
| Middleware-only access gate                     | **Superseded**               | Every server read and mutation independently verifies authority                                |
| All routes use Edge Runtime                     | **Superseded**               | Runtime follows verified Next.js and Cloudflare compatibility                                  |
| Pending vendor feed                             | **Retained**                 | Implemented as a searchable queue plus detail workspace                                        |
| Single vendor card containing everything        | **Corrected**                | Queue supports triage; detail view supports full review                                        |
| ABN status visible                              | **Retained**                 | Autonomous optional evidence                                                                   |
| ABN GUID already in `.env`                      | **Retained**                 | No manual ABN lookup required                                                                  |
| ABN required for publication                    | **Superseded**               | `not_provided` is neutral                                                                      |
| ABN match proves ownership                      | **Superseded**               | ABN evidence and ownership are separate                                                        |
| Stripe tier visible                             | **Retained**                 | Free/Premium and billing state are displayed                                                   |
| Payment proves legitimacy                       | **Superseded**               | Payment represents commercial status only                                                      |
| Payment automatically publishes                 | **Superseded**               | Publication remains manual in Phase 1                                                          |
| AI-generated description                        | **Retained with correction** | Draft only; operator reviews and edits                                                         |
| Fixed 300-word biography                        | **Superseded**               | Description length follows available evidence                                                  |
| AI confidence above 95% publishes               | **Superseded**               | AI has no publication authority                                                                |
| Edit business name in dashboard                 | **Retained**                 | Submitted and approved names remain distinct                                                   |
| Edit AI description                             | **Retained**                 | Changes save to the approved public field                                                      |
| Slug check                                      | **Retained**                 | Preview, collision handling and redirect warning required                                      |
| Delete spam permanently                         | **Superseded**               | Reject and retain first; purge later under policy                                              |
| Approve & Publish                               | **Retained**                 | Sole Phase 1 publication authority                                                             |
| Reject                                          | **Retained**                 | Structured reason and audit history required                                                   |
| Unpublish                                       | **Added and retained**       | Necessary for post-publication problems                                                        |
| Restore rejected listing                        | **Retained**                 | Returns record to review, not publication                                                      |
| Seeded and unclaimed listings                   | **Retained and central**     | Required directory-first capability                                                            |
| Claim management                                | **Retained and expanded**    | Separate queue and workflow                                                                    |
| Generic Verified badge                          | **Superseded**               | Use specific independent statuses                                                              |
| Stripe webhook failures visible                 | **Retained**                 | Included in Payments and System                                                                |
| Refund from `/ops`                              | **Deferred**                 | Not required for Phase 1                                                                       |
| Cancel subscription from `/ops`                 | **Deferred**                 | Not required for Phase 1                                                                       |
| Search Console index information                | **Retained with limitation** | Stored snapshots, not real-time Google control                                                 |
| Request indexing from `/ops`                    | **Not adopted**              | No general indexing-control promise                                                            |
| Cloudflare GraphQL integration                  | **Retained**                 | Read-only operational summaries                                                                |
| WAF configuration inside `/ops`                 | **Deferred**                 | Native Cloudflare exceptional operation                                                        |
| Automation health panel                         | **Retained**                 | Required Phase 1 System function                                                               |
| Retry failed jobs                               | **Retained**                 | Only for idempotent supported jobs                                                             |
| Audit history                                   | **Retained and mandatory**   | All privileged actions recorded                                                                |
| Data-freshness indicators                       | **Retained and mandatory**   | External data cannot appear current when stale                                                 |
| External dashboards never used                  | **Corrected**                | Not used routinely; retained for setup and exceptional operations                              |
| “God Mode” dashboard                            | **Corrected**                | Unified operator console, not unrestricted infrastructure control                              |
| Directory-first priority                        | **Locked**                   | Listings remain the dominant Ops area                                                          |
| Supabase as source of truth                     | **Locked**                   | External states are normalised into Supabase                                                   |
| Manual Phase 1 publication                      | **Locked**                   | Automation prepares evidence; operator publishes                                               |
| Future exception-led autonomy                   | **Deferred direction**       | Introduced only after measured operational evidence                                            |

---

# 28. Final locked Ops model

```text
SuburbMates /ops is the solo operator’s routine control centre.

Listings are the primary operational object.

Seeded, submitted, claimed and unclaimed listings are supported.

ABN, ownership, payment and publication remain independent.

Supabase stores the normalised operational state.

Stripe, ABN Lookup, Gemini, Search Console and Cloudflare feed the dashboard through secure integrations.

The operator reviews evidence, edits public data and controls publication during Phase 1.

Native service dashboards are reserved for setup, exceptional administration and emergencies.

The Ops console exposes decisions and failures without becoming a CRM, database editor, accounting platform or infrastructure-control suite.
```

[1]: https://nextjs.org/docs/app/guides/data-security?utm_source=chatgpt.com "Guides: Data Security"
[2]: https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult?utm_source=chatgpt.com "UrlInspectionResult | Search Console API"
[3]: https://abr.business.gov.au/Documentation/Default?utm_source=chatgpt.com "Web services user guide"
[4]: https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-firewall-events/?utm_source=chatgpt.com "Querying Firewall Events with GraphQL - Analytics"
[5]: https://docs.stripe.com/webhooks?utm_source=chatgpt.com "Receive Stripe events in your webhook endpoint"
[6]: https://developers.google.com/webmaster-tools/v1/api_reference_index?utm_source=chatgpt.com "API Reference | Search Console API"
[7]: https://developers.google.com/webmaster-tools/limits?utm_source=chatgpt.com "Usage Limits | Search Console API - Google for Developers"
[8]: https://developers.cloudflare.com/analytics/graphql-api/limits/?utm_source=chatgpt.com "GraphQL API - Limits · Cloudflare Analytics docs"
[9]: https://developers.google.com/webmaster-tools/v1/searchanalytics/query?utm_source=chatgpt.com "Search Analytics: query | Search Console API"
[10]: https://developers.google.com/webmaster-tools/v1/sitemaps/submit?utm_source=chatgpt.com "Sitemaps: submit | Search Console API"
[11]: https://supabase.com/docs/guides/database/postgres/row-level-security?utm_source=chatgpt.com "Row Level Security | Supabase Docs"
[12]: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/?utm_source=chatgpt.com "Next.js · Cloudflare Workers docs"
