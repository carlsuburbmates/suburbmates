# Vendor Acquisition Strategy

## Objective

Build the broadest defensible directory of active public-facing businesses in the City of Darebin, starting with Northcote, without inventing records or relying on a prohibited directory scrape.

This is an acquisition pipeline, not a one-time CSV exercise. Every record must retain its source URL, source date, source state, stable import identity, field-level provenance and freshness. Raw or incomplete records remain private until they pass the approved deterministic source, scope, identity, duplicate and safety policy; a missing website, phone or email alone is not a rejection rule. Public listings can later be claimed or enriched by the business owner.

## Source order

1. **OpenStreetMap commercial features** are an active, attributed bulk-discovery contract across Darebin.
2. **Victorian liquor licences by location** are an active first-party CC BY 4.0 contract, refreshed monthly and mapped only to approved public categories.
3. **Tax Practitioners Board public register** is an active CC BY 4.0 organisation-only contract, refreshed monthly. It emits only active Victorian organisation trading names with a non-postal Darebin business address, maps them narrowly to Accountant, and never retains individual-agent fields, individual trading names, registration numbers or dates.
4. **ASIC Credit Licensee Dataset** is an active CC BY 3.0 AU organisation-only contract, refreshed weekly. It emits only active Victorian corporate or institutional licensees with a principal Darebin locality, maps them narrowly to Financial, and never retains individual licensee names, raw licence numbers, ABNs, ACNs, authorisation text, coordinates or postal addresses.
5. **Darebin Council and Darebin-linked business associations** are the next coverage priority. A source may be automated only after the provider grants a reusable feed or written permission that covers persistent public display, refreshes and attribution, and the feed supplies a stable business identity plus a non-postal Darebin location.
6. **Business-owned websites** are not an automated enrichment source. Owner-provided content may be proposed through protected owner journeys and is subject to review; the automation does not crawl business websites or copy their images.
7. **Australian Business Register (ABR) bulk extract** is CC BY 3.0 AU and may be used later for aggregate coverage measurement. It is not a current public-listing feed: its location is only state/postcode-level, it has no useful category or direct-contact fields, and its legal-name fields can identify an individual. A future measurement job must discard legal names and never create, enrich or publish a listing from this extract alone.
8. **A separately licensed business dataset** may become a coverage source only when its agreement expressly permits persistent directory display, refreshes, owner-claim workflows and attribution.

## Candidate-source assessment — 1 September 2026

- **Darebin food-business pages:** official regulatory guidance, but no machine-readable, display-permitted premises register was located. It is not an automated catalogue contract.
- **Consumer Affairs Victoria public registers:** useful for a resident's individual compliance check, but the estate-agent register explicitly requires a written purpose request for bulk use and prohibits direct-marketing use. It may include residential-address personal data. It is therefore not a source for storage or automated public directory display.
- **City of Melbourne business-establishments open data:** the current Data.gov.au metadata lists its licence as **not specified**, and it covers the City of Melbourne—not Darebin—so it is out of scope and not an automated contract.
- **Victorian Building Practitioner Register:** current DataVic metadata identifies it as a weekly-updated register but labels the licence **other-closed**. It is therefore excluded from bulk storage, enrichment or public-directory display.
- **EPA Victoria licences and works approvals:** the datasets use CC BY 4.0, but they describe regulated scheduled premises and environmental approval activity, not an in-scope, customer-facing business directory with a stable public category mapping. They are not an automated catalogue contract without a separate field, scope and presentation review.
- **Fair Jobs Code registers:** the current CSV metadata exposes business/trade names and ABNs but no Darebin business address or suitable public service category; it also has an older data refresh. It cannot establish the local identity and scope required for a public profile, so it is not a candidate or enrichment source.
- **Tax Practitioners Board public register:** the full register contains personal-agent content, so wholesale ingestion is prohibited. Its current organisation-only, active-Victorian, non-postal Darebin subset is separately licensed CC BY 4.0 and contractually filtered before the candidate artifact is written. The 31 August 2026 local acquisition yielded 267 Accountant candidates across the canonical catchment; normal qualification, duplicate evidence, source freshness and conflict rules still apply before any public listing can exist.
- **ASIC Credit Licensee Dataset:** the official register is CC BY 3.0 AU, refreshed weekly and exposes a current first-party CSV through Data.gov.au. It includes active status, principal locality/state/postcode and a public business name where supplied. The contract accepts only `APPR` Victorian records whose legal licensee name contains a corporate or institutional marker and whose principal locality is in the existing Darebin catchment. It hashes the raw licence number into a private source identity and emits only the selected public business/legal organisation name and locality. Individual names, ABNs/ACNs, authorisations, latitude/longitude and postcode are never emitted. The August 2026 audit found 37 approved catchment-locality rows and 33 corporate/institutional records; normal duplicate, qualification and conflict rules still apply before any public listing can exist.
- **Australian Business Register bulk extract:** the official dataset is CC BY 3.0 AU and refreshes regularly, but its public fields provide only state and postcode for the main business location, not a shopfront address or reliable service category. Its legal-name fields can also be personal data. It therefore does not meet the public-profile identity/scope rule. It is allowed only as a future aggregate coverage measurement input after a dedicated privacy-filtered implementation; it is not a candidate handoff, enrichment or publication source.
- **Darebin Council and trader-association maps:** these are potentially high-value local coverage sources, but the currently published maps/pages do not provide a reusable-data licence, stable machine-readable record ID or refresh feed. The next external step is a written data-sharing arrangement that grants those three requirements. Until that exists, they remain prospective and are not scraped or copied.

The next source must provide both a compatible licence for persistent display and an automatable, stable record/refresh path. The active contracts are OpenStreetMap, Victorian liquor licences by location, the Tax Practitioners Board organisation-only register and the ASIC Credit Licensee organisation-only register.

## Ready-to-send local source permission brief — not yet sent or approved

This is the exact scope required before a Darebin Council, trader association or similar local provider can become an automated source. It is a request brief only: it grants SuburbMates no permission to copy, store, display, scrape or refresh any current page, map or directory.

> SuburbMates is a Darebin local-business directory that sends residents directly to businesses. We would like to discuss a reusable data feed or written permission for a limited business-listing dataset. Could you confirm whether SuburbMates may persist, display and periodically refresh the supplied business name, public category, public business address or Darebin locality, public contact details and a stable source identifier/URL? We would retain field-level source attribution and observation dates, give the provider any required attribution, and never use the data for advertising, lead resale, individual profiling or direct marketing. We would exclude owner/personal contact details, internal notes, application/permit history and any field you do not authorise for public display. A feed may be CSV, API or another documented export; the minimum technical requirement is a stable business identity and non-postal Darebin location so records can be reconciled safely.

Before onboarding, record all of the following in the approved-source registry and source review:

1. written authorisation or an explicit compatible licence covering storage, public directory display, attribution and recurring refreshes;
2. a documented delivery method, update cadence and stable record ID or canonical source URL;
3. permitted public fields and explicit exclusions, especially personal/proprietor data and permit or compliance detail;
4. an attribution form and any change/withdrawal process; and
5. a dry-run artifact, duplicate report, field-level evidence mapping and deterministic qualification test before production handoff.

No source becomes active merely because it is public, searchable, viewable in a map, or useful for a manual enquiry.

## Sources excluded

Do not scrape or bulk-rehost Yellow Pages, White Pages, Google Places, Foursquare, Facebook, or similar closed directories without a written licence that explicitly permits this product use and storage. Their current terms either prohibit automated extraction or restrict caching, bulk display, or re-hosting of place data.

If a paid provider is later selected as the primary coverage source, it must provide a commercial licence for persistent directory display, refreshes, owner-claim workflows, and source attribution. An API that only permits transient search results is not sufficient.

## Reconciliation rules

- Prefer a stable source ID when a source provides one; otherwise use the source URL plus normalized business identity.
- Match by normalized name plus exact or equivalent address first.
- Use phone and canonical website domain as supporting identity signals.
- Same name at different addresses remains separate listings.
- Never merge solely because two businesses share a name in the same suburb.
- Retain field-level provenance, observation time, freshness and conflicts for every source fact.
- A later approved-source observation re-observes evidence and freshness. It may fill an empty direct-contact field or a bounded, source-derived profile description on an unclaimed listing; it never silently overwrites a public or owner-confirmed field.
- A new approved-source record may become public only after the deterministic qualification policy passes and evidence is retained. Claim state never decides publication.
- Never generate a phone, email, address, website, or business record from inference.

## Refresh workflow

1. Acquire each permitted source into a source-specific staging file.
2. Audit required fields and source provenance.
3. Normalize names, addresses, phone numbers, emails, websites, categories, and suburb slugs.
4. Produce a duplicate report before writing to Supabase.
5. Send permitted source rows through the versioned candidate handoff; it records qualification, provenance, freshness, conflicts and exceptions before any public listing can exist.
6. Preserve owner-entered fields and keep publication independent from ownership, ABN and commercial state.
7. Report additions, enrichments, possible duplicates, stale records, and missing-field coverage without inventing facts or merging a live record by similarity alone.

## Coverage reality

No public free source proves that every active business has been found. A Yelp-sized catalogue requires a licensed commercial dataset or direct data-sharing agreement, combined with local open and official sources. The system therefore measures coverage by source and field completeness rather than claiming exhaustiveness.
