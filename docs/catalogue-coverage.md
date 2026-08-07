# Darebin Catalogue Coverage

## Current baseline

- Catchment: City of Darebin, with Northcote included as a priority suburb.
- Hosted catalogue records: 1,602 total; 1,602 currently published (read-only verification, 7 August 2026).
- Source-file baseline: 1,582 records in `data/vendor-candidates-merged.csv`, plus source-specific supplements.
- Source baseline: OpenStreetMap commercial records plus curated records, merged by stable identity and address-aware duplicate handling. Northcote Rise association records are maintained as a separately sourced supplement.
- Required listing data: business name, category, suburb, and street address where the source provides it. Public phone, email, website, source URL, check date, verification state, and notes are retained when available.

This is a measured public-data baseline, not a claim that every active business has been found. OpenStreetMap coverage varies by business and location. The directory must remain transparent about incomplete profiles.

## Refresh workflow

1. Run `npm run acquire:osm` only to refresh the OpenStreetMap staging file.
2. Run `npm run catalogue:merge` only to prepare the local comparison CSV; it does not publish, import or decide duplicates in the live directory.
3. Run the candidate audit and report against the staged files to identify data-quality problems before any handoff.
4. Send approved OpenStreetMap rows only through the versioned, token-protected candidate handoff. It retains evidence first and may create an unclaimed public listing only after deterministic source, scope, contact, duplicate and safety checks pass.
5. Treat a CSV seed as a separate legacy import operation, never as the routine discovery path. New seed rows remain `pending_review`; do not use `seed` to publish routine discoveries.
6. Add a new association or other source only after its storage-and-display rights, stable identity and field provenance are documented.

The Northcote Rise supplement is sourced from the official Darebin business-associations link. Future expansions require a lawful source or source export, stable identity, provenance and the approved candidate qualification path before they can affect the directory. No generated listings or invented contact details are permitted.

## Geocoding policy

Do not bulk reverse-geocode the catalogue through the public Nominatim service. Its policy restricts bulk use and forbids systematic POI queries. Use a licensed geocoding/Places provider, a permitted data export, or a self-hosted service for the address-enrichment phase. Cache results, retain the provider record as provenance, and do not write an address unless the source returns it.
