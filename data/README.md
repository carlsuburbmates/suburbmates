# Vendor Data

## Canonical files

- `vendor-candidates.csv`: curated candidate source.
- `vendor-candidates-osm.csv`: OpenStreetMap acquisition output.
- `vendor-candidates-merged.csv`: deterministic curated-plus-OSM output.
- `vendor-candidates-northcote-rise.csv`: official Northcote Rise association supplement.
- `darebin-catchment.json`: allowed City of Darebin suburb manifest.

Legacy/template files remain for reference only and must not be treated as the current catalogue source.

## Required listing fields

Every real listing needs a business name, category slug, and suburb slug. Address, phone, email, website, source URL, and notes are enrichment fields. Missing enrichment must never block a real public listing.

## Import safety

Always audit and dry-run before a live import:

```bash
npm run audit -- data/vendor-candidates-merged.csv
npm run seed -- --dry-run data/vendor-candidates-merged.csv
npm run seed -- data/vendor-candidates-merged.csv
```

Run the same audit and seed sequence for `vendor-candidates-northcote-rise.csv`. The importer is idempotent, preserves owner-entered fields, publishes new catalogue listings, and retains source provenance.
