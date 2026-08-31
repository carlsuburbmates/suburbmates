# Darebin Catalogue Coverage

## Historical baseline — 7 August 2026

- Catchment: City of Darebin, with Northcote included as a priority suburb.
- Hosted catalogue records: 1,602 total; 1,602 published (read-only verification, 7 August 2026). This is historical evidence; see `docs/HANDOVER.md` for the current verified production total and active source composition.
- Historic source-file baseline: 1,582 records in `data/vendor-candidates-merged.csv`. It is retained as migration evidence only, not a current source or coverage measure.
- Source baseline at the time: OpenStreetMap commercial records plus curated records. Current coverage must be measured from a fresh approved-source artifact and the production evidence records, not a legacy local merge.
- Required listing data: business name, category, suburb, and street address where the source provides it. Public phone, email, website, source URL, check date, verification state, and notes are retained when available.

This is a measured public-data baseline, not a claim that every active business has been found. OpenStreetMap coverage varies by business and location. The directory must remain transparent about incomplete profiles.

## Approved-source refresh workflow

1. Run the acquisition workflow for the specific approved source contract. OpenStreetMap, Victorian liquor licences and the Tax Practitioners Board organisation-only register each have their own versioned contract and schedule in `docs/AUTOMATION/WORKFLOWS.md`.
2. Run the source-specific audit and report against staged data before its handoff.
3. Send only approved-source rows through the versioned, token-protected candidate handoff. It retains evidence first and may create an unclaimed public listing only after deterministic source, in-scope identity/category, duplicate and safety checks pass. Missing website, phone or email is not a standalone exclusion.
4. Do not use a CSV seed or broad local merge for routine discovery, publication or refresh.
5. Add a source only after its storage-and-display rights, stable identity, field provenance, refresh and attribution terms are recorded in the approved-source registry.

The Northcote Rise supplement is sourced from the official Darebin business-associations link. Future expansions require a lawful source or source export, stable identity, provenance and the approved candidate qualification path before they can affect the directory. No generated listings or invented contact details are permitted.

## Geocoding policy

Do not bulk reverse-geocode the catalogue through the public Nominatim service. Its policy restricts bulk use and forbids systematic POI queries. Use a licensed geocoding/Places provider, a permitted data export, or a self-hosted service for the address-enrichment phase. Cache results, retain the provider record as provenance, and do not write an address unless the source returns it.
