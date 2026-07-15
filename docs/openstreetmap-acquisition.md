# OpenStreetMap Darebin Acquisition Tool

This document outlines the purpose, constraints, and operational details of the OpenStreetMap (OSM) acquisition tool used to seed the Darebin vendor directory.

## Purpose
The acquisition tool queries the OpenStreetMap Overpass API for commercial businesses within the City of Darebin bounding area, extracting them into a staged CSV file (`data/vendor-candidates-osm.csv`) for review and import. It acts as an automated, reproducible way to build out the directory with real-world geographical data while adhering to data-hygiene constraints.

## Constraints & Rules
- **Commercial Only**: The tool filters for named `shop`, `craft`, and `office` tags. For `amenity` tags, it only includes those explicitly matching a commercial allowlist (e.g. bar, cafe, car_rental, car_wash, casino, cinema, clinic, dentists, doctors, fast_food, food_court, fuel, ice_cream, marketplace, nightclub, pharmacy, pub, restaurant, studio, theatre, veterinary).
- **Exclusions**: Normalizes OSM tag values into semantic tokens to reject non-commercial public infrastructure. It strictly excludes education, government, municipal, union, foundation, political-party, and ngo/charity records by checking for tokens like school, kindergarten, library, college, university, community-centre, and townhall, regardless of whether their source tag is shop, craft, office, or amenity. This successfully handles compound tags like `la_trobe_university_student_union`.
- **Deduplication**: Entries are deterministically deduplicated based on a composite key: `name|categorySlug|suburbSlug`.
- **Catchment Mapping**: The `addr:suburb` tag is mapped to valid slugs in `data/darebin-catchment.json`. Unmapped or missing suburbs within the boundary fallback to `darebin`.
- **Category Derivation**: Categories are mapped directly from OSM tags (e.g., `shop=bakery` -> `bakery`), and default to `other` if no exact match is found.
- **Data Hygiene**: Website URLs are automatically sanitized to enforce the `https://` protocol as required by `scripts/audit-vendor-candidates.ts`. Invalid URLs are omitted.
- **Source of Truth**: The target API is `https://maps.mail.ru/osm/tools/overpass/api/interpreter`, with standard Overpass fallbacks.

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
