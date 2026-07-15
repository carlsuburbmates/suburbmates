# Vendor Acquisition Strategy

## Objective

Build the broadest defensible directory of active public-facing businesses in the City of Darebin, starting with Northcote, without inventing records or relying on a prohibited directory scrape.

This is an acquisition pipeline, not a one-time CSV exercise. Every record must retain its source URL, source date, source state, and stable import identity. Incomplete records remain public and can later be claimed or enriched by the business owner.

## Source order

1. **OpenStreetMap commercial features** for bulk geographic discovery across the whole Darebin catchment. The existing Overpass acquisition is the baseline and must retain OSM attribution.
2. **Darebin-linked business associations** for local precinct coverage and better names, addresses, phones, emails, and websites. Current sources include Northcote Rise, Preston Central, and Fairfield Village. Reservoir currently has no equivalent public directory linked from Council.
3. **Business-owned websites** linked by those sources for field enrichment only. Do not crawl beyond the public pages needed to confirm the business identity and contact details.
4. **ABN Lookup or an appropriately licensed business dataset** for identity validation and coverage measurement. ABN data is not treated as a complete shopfront directory because it does not reliably provide the public address, phone, or category needed by the product.

## Sources excluded

Do not scrape or bulk-rehost Yellow Pages, White Pages, Google Places, Foursquare, Facebook, or similar closed directories without a written licence that explicitly permits this product use and storage. Their current terms either prohibit automated extraction or restrict caching, bulk display, or re-hosting of place data.

If a paid provider is later selected as the primary coverage source, it must provide a commercial licence for persistent directory display, refreshes, owner-claim workflows, and source attribution. An API that only permits transient search results is not sufficient.

## Reconciliation rules

- Prefer a stable source ID when a source provides one; otherwise use the source URL plus normalized business identity.
- Match by normalized name plus exact or equivalent address first.
- Use phone and canonical website domain as supporting identity signals.
- Same name at different addresses remains separate listings.
- Never merge solely because two businesses share a name in the same suburb.
- Merge fields only when the incoming source is authoritative for that field and retain provenance.
- New source records are public immediately, regardless of contact completeness or claim state.
- Never generate a phone, email, address, website, or business record from inference.

## Refresh workflow

1. Acquire each permitted source into a source-specific staging file.
2. Audit required fields and source provenance.
3. Normalize names, addresses, phone numbers, emails, websites, categories, and suburb slugs.
4. Produce a duplicate report before writing to Supabase.
5. Upsert by stable source identity with address-aware collision handling.
6. Preserve owner-entered fields and publication state.
7. Report additions, enrichments, possible duplicates, stale records, and missing-field coverage.

## Coverage reality

No public free source proves that every active business has been found. A Yelp-sized catalogue requires a licensed commercial dataset or direct data-sharing agreement, combined with local open and official sources. The system therefore measures coverage by source and field completeness rather than claiming exhaustiveness.
