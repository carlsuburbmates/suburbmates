# Vendor Acquisition Strategy

## Objective

Build the broadest defensible directory of active public-facing businesses in the City of Darebin, starting with Northcote, without inventing records or relying on a prohibited directory scrape.

This is an acquisition pipeline, not a one-time CSV exercise. Every record must retain its source URL, source date, source state, stable import identity, field-level provenance and freshness. Raw or incomplete records remain private until they pass the approved deterministic source, scope, identity, duplicate and safety policy; a missing website, phone or email alone is not a rejection rule. Public listings can later be claimed or enriched by the business owner.

## Source order

1. **OpenStreetMap commercial features** are an active, attributed bulk-discovery contract across Darebin.
2. **Victorian liquor licences by location** are an active first-party CC BY 4.0 contract, refreshed monthly and mapped only to approved public categories.
3. **Tax Practitioners Board public register** is an active CC BY 4.0 organisation-only contract, refreshed monthly. It emits only active Victorian organisation trading names with a non-postal Darebin business address, maps them narrowly to Accountant, and never retains individual-agent fields, individual trading names, registration numbers or dates.
4. **Darebin-linked business associations** are prospective coverage sources only. They may not be ingested until their reuse licence, field permissions, stable identity and refresh path have been documented in a versioned source contract.
5. **Business-owned websites** are not an automated enrichment source. Owner-provided content may be proposed through protected owner journeys and is subject to review; the automation does not crawl business websites or copy their images.
6. **ABN Lookup or a separately licensed business dataset** may support identity validation and coverage measurement after a dedicated approval. ABN data is not treated as a complete shopfront directory because it does not reliably provide the public address, phone, or category needed by the product.

## Candidate-source assessment — 30 August 2026

- **Darebin food-business pages:** official regulatory guidance, but no machine-readable, display-permitted premises register was located. It is not an automated catalogue contract.
- **Consumer Affairs Victoria public registers:** useful for a resident's individual compliance check, but the estate-agent register explicitly requires a written purpose request for bulk use and prohibits direct-marketing use. It may include residential-address personal data. It is therefore not a source for storage or automated public directory display.
- **City of Melbourne business-establishments open data:** CC BY, but it covers the City of Melbourne—not Darebin—so it is out of scope.
- **Tax Practitioners Board public register:** the full register contains personal-agent content, so wholesale ingestion is prohibited. Its current organisation-only, active-Victorian, non-postal Darebin subset is separately licensed CC BY 4.0 and contractually filtered before the candidate artifact is written. The 31 August 2026 local acquisition yielded 267 Accountant candidates across the canonical catchment; normal qualification, duplicate evidence, source freshness and conflict rules still apply before any public listing can exist.

The next source must provide both a compatible licence for persistent display and an automatable, stable record/refresh path. Until then, the active contracts remain OpenStreetMap and the Victorian liquor-licence dataset.

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
