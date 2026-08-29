# OpenStreetMap Darebin Acquisition Tool

This document outlines the purpose, constraints, and operational details of the OpenStreetMap (OSM) acquisition tool used to seed the Darebin vendor directory.

## Purpose
The acquisition tool queries the OpenStreetMap Overpass API for commercial businesses within the City of Darebin bounding area, extracting them into a staged CSV file (`data/vendor-candidates-osm.csv`). The CSV is evidence and staging input, not a direct import or publication mechanism. Approved rows proceed only through the versioned, token-protected OpenStreetMap candidate handoff and its deterministic qualification policy.

## Constraints & Rules
- **Commercial Only**: The tool filters for named `shop`, `craft`, and `office` tags. For `amenity` tags, it only includes those explicitly matching a commercial allowlist (e.g. bar, cafe, car_rental, car_wash, casino, cinema, clinic, dentists, doctors, fast_food, food_court, fuel, ice_cream, marketplace, nightclub, pharmacy, pub, restaurant, studio, theatre, veterinary).
- **Exclusions**: Normalizes OSM tag values into semantic tokens to reject non-commercial public infrastructure. It strictly excludes education, government, municipal, union, foundation, political-party, and ngo/charity records by checking for tokens like school, kindergarten, library, college, university, community-centre, and townhall, regardless of whether their source tag is shop, craft, office, or amenity. This successfully handles compound tags like `la_trobe_university_student_union`.
- **Deduplication**: Entries are deterministically deduplicated based on a composite key: `name|categorySlug|suburbSlug`.
- **Catchment Mapping**: The `addr:suburb` tag is mapped to valid slugs in `data/darebin-catchment.json`. Unmapped or missing suburbs within the boundary fallback to `darebin`.
- **Category Derivation**: Categories are mapped directly from OSM tags (e.g., `shop=bakery` -> `bakery`), and default to `other` if no exact match is found.
- **Data Hygiene**: Website URLs are automatically sanitized to enforce the `https://` protocol as required by `scripts/audit-vendor-candidates.ts`. Invalid URLs are omitted.
- **Useful profile detail and hours**: For cafes, restaurants, fast food, bars, pubs and ice-cream businesses, valid structured OSM `cuisine`, `takeaway`, `delivery`, `outdoor_seating`, `diet:vegan` and `diet:vegetarian` tags become short factual details such as `Cuisine: Italian. Takeaway available.` This is not generated marketing copy, retains source evidence, and can fill only an empty unclaimed profile description. Only explicit `yes` or `only` values are rendered. An OSM `opening_hours` value can fill only an empty, unclaimed `trading_hours` field when it is `24/7` or contains an explicit time range, is retained verbatim rather than reinterpreted, and is shown as source-reported with a check-before-visiting reminder. Prose-only or seasonal-only values remain evidence-only.
- **Multiple contact values**: When OSM supplies several phone numbers in one tag, the candidate retains the first listed number. The normal candidate audit still rejects an invalid number rather than allowing one malformed tag to invalidate a whole source run.
- **Source of Truth**: The target API is `https://maps.mail.ru/osm/tools/overpass/api/interpreter`, with standard Overpass fallbacks.
- **Source Contract**: The handoff accepts only `openstreetmap-candidate-v1` records from the expected OpenStreetMap host. A missing or changed contract is held safely; no candidate or listing changes.

## Execution
Run the unit tests via:
```bash
npm run acquire:osm:test
```
(This test suite evaluates logic completely offline without executing any live API fetches or filesystem writes, as the execution guard strictly checks the command basename).

Run the acquisition tool via:
```bash
npm run acquire:osm
```
Run the audit tool on the output via:
```bash
npm run audit -- data/vendor-candidates-osm.csv
```

## Results & Statistics
- **Total Valid Records Acquired**: 1545
- **Excluded Non-Commercial/Missing Name Records**: 3698
- **Total Audit Failures**: 0 (all 1545 records passed strict catalog hygiene checks).

The majority of acquired businesses fallback to the `darebin` suburb slug (1163), with prominent representations in `preston` (219), `thornbury` (176), and `northcote` (95). The most common categories include `restaurant` (163), `cafe` (144), `fast-food` (111), and `hairdresser` (65).
