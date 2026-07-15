# Catalogue Merge

This document outlines the behavior and rules for the automated catalogue merge tool, which combines the manually curated primary source (`data/vendor-candidates.csv`) with the staged OpenStreetMap acquisition source (`data/vendor-candidates-osm.csv`).

## Execution

To run the offline unit test suite:
```bash
npm run catalogue:merge:test
```

To run the deterministic merge and generate `data/vendor-candidates-merged.csv`:
```bash
npm run catalogue:merge
```

## Rules & Constraints

- **Deterministic Merge**: Both input files are parsed securely (handling quoted CSV correctly), deduplicated, and sorted alphabetically by normalized business name then suburb slug, guaranteeing stable and predictable output.
- **Manual Source Priority**: Records from the manual CSV are the highest priority. If an OSM duplicate is found, the manual record takes precedence.
- **Enrichment**: Empty optional fields in a manual record will be safely backfilled using data from the OSM duplicate (e.g., if OSM has a phone number but the manual record does not).
- **Exact Deduplication**: A record is considered a duplicate if its normalized business name matches exactly, AND:
  - Both records share the exact normalized address.
  - OR both records share the exact `suburb_slug`.
  - OR one record uses the generic `darebin` fallback while the other belongs to a specific suburb in the Darebin catchment allowlist (e.g., `preston`).
- **Generic Category Mapping**: Broad non-descriptive OSM tags (`yes`, `other`, `vacant`, `general`, `company`, `craft`, `trade`) are intercepted and converted to `local-business` to satisfy data hygiene while retaining the commercial entity.
- **Source Provenance Preserved**: The `notes` field dynamically tracks provenance. A manual record's note is never destroyed. If an OSM duplicate enriches it, the OSM note is appended. If a generic OSM category is mapped, the raw original tag is appended to the notes (e.g., `OSM Category: yes`).

## Results

Current results of the deterministic merge process:
- **Manual Input Records**: 77
- **OSM Input Records**: 1545
- **Duplicates Merged**: 40
- **Final Record Count**: 1582 (0 audit failures)
