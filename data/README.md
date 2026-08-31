# Vendor Data

## Active source staging

- `vendor-candidates-osm.csv`: generated OpenStreetMap acquisition output. The scheduled workflow recreates it before audit, reporting and the versioned source handoff.
- `vendor-candidates-northcote-rise.csv`: historic official Northcote Rise association supplement.
- `darebin-catchment.json`: allowed City of Darebin suburb manifest.

`vendor-candidates.csv`, `vendor-candidates-merged.csv`, `vendor-import-ready.csv` and templates are historic migration evidence only. They must not be used to seed, merge, publish or refresh the live catalogue. Current sources enter through their own approved, versioned source contract.

## Required listing fields

Every real listing needs a business name, category slug, and suburb slug. Address, phone, email, website, source URL, and notes are enrichment fields. Missing enrichment must never block a real public listing.

## Source safety

Audit an acquired source artifact before its authenticated handoff:

```bash
npm run acquire:osm
npm run audit -- data/vendor-candidates-osm.csv
npm run catalogue:report -- data/vendor-candidates-osm.csv
```

The private candidate handoff is idempotent, preserves owner-entered fields, retains source provenance and only creates an unclaimed listing after its deterministic qualification passes.
