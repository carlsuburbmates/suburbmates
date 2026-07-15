# Darebin Catalogue Coverage

## Current baseline

- Catchment: City of Darebin, with Northcote included as a priority suburb.
- Hosted catalogue records: 1,621 total; 1,600 currently published.
- Source-file baseline: 1,582 records in `data/vendor-candidates-merged.csv`, plus source-specific supplements.
- Source baseline: OpenStreetMap commercial records plus curated records, merged by stable identity and address-aware duplicate handling. Northcote Rise association records are maintained as a separately sourced supplement.
- Required listing data: business name, category, suburb, and street address where the source provides it. Public phone, email, website, source URL, check date, verification state, and notes are retained when available.

This is a measured public-data baseline, not a claim that every active business has been found. OpenStreetMap coverage varies by business and location. The directory must remain transparent about incomplete profiles.

## Refresh workflow

1. Run `npm run acquire:osm` to refresh the public-source staging file.
2. Run `npm run catalogue:merge` to merge it with curated records.
3. Run `npm run audit -- data/vendor-candidates-merged.csv` and resolve every failure.
4. Run `npm run catalogue:report -- data/vendor-candidates-merged.csv` to record coverage, missing-field counts, suburb distribution, and sources.
5. Run `npm run seed -- --dry-run data/vendor-candidates-merged.csv` to check the import and reconciliation result.
6. Run `npm run seed -- data/vendor-candidates-merged.csv` to publish new records and enrich existing ones without clearing owner-entered fields.
7. Run `npm run audit -- data/vendor-candidates-northcote-rise.csv` and then `npm run seed -- data/vendor-candidates-northcote-rise.csv` to refresh the Northcote Rise association supplement.

The Northcote Rise supplement is sourced from the official Darebin business-associations link and is deduplicated against the hosted catalogue by stable name/suburb/category identity, with address qualification for same-name businesses at different locations. Future expansions should add a lawful source or source export, then compare against this baseline by business name and address before import. No generated listings or invented contact details are permitted.

## Geocoding policy

Do not bulk reverse-geocode the catalogue through the public Nominatim service. Its policy restricts bulk use and forbids systematic POI queries. Use a licensed geocoding/Places provider, a permitted data export, or a self-hosted service for the address-enrichment phase. Cache results, retain the provider record as provenance, and do not write an address unless the source returns it.
