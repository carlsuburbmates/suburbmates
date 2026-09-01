# OpenStreetMap Darebin Discovery Tool

This document outlines the purpose, constraints, and operational details of the OpenStreetMap (OSM) acquisition tool. It is one approved discovery and refresh source in the evidence-backed Darebin directory; it is not a direct import or the sole source of a public business identity.

## Purpose
The acquisition tool queries the OpenStreetMap Overpass API for commercial businesses within the City of Darebin bounding area, extracting them into a staged CSV file (`data/vendor-candidates-osm.csv`). The CSV is evidence and staging input, not a direct import or publication mechanism. Approved rows proceed only through the versioned, token-protected OpenStreetMap candidate handoff and its deterministic qualification, evidence, freshness and conflict policy.

## Constraints & Rules
- **Commercial Only**: The tool filters for named `shop`, `craft`, and `office` tags. For `amenity` tags, it only includes those explicitly matching a commercial allowlist (e.g. bar, cafe, car_rental, car_wash, casino, cinema, clinic, dentists, doctors, fast_food, food_court, fuel, ice_cream, marketplace, nightclub, pharmacy, pub, restaurant, studio, theatre, veterinary). It also accepts only these explicit, mapped feature tags: `healthcare=pharmacy|dentist|optometrist`, `leisure=fitness_centre|dance`, and `tourism=hotel|motel|guest_house`. This is an allowlist, not a general healthcare, leisure or tourism import.
- **Exclusions**: Normalizes OSM tag values into semantic tokens to reject non-commercial public infrastructure. It strictly excludes education, government, municipal, union, foundation, political-party, and ngo/charity records by checking for tokens like school, kindergarten, library, college, university, community-centre, and townhall, regardless of whether their source tag is shop, craft, office, or amenity. This successfully handles compound tags like `la_trobe_university_student_union`.
- **Deduplication**: Entries are deterministically deduplicated based on a composite key: `name|categorySlug|suburbSlug`.
- **Catchment Mapping**: The `addr:suburb` tag is mapped to valid slugs in `data/darebin-catchment.json`. Unmapped or missing suburbs within the boundary fallback to `darebin`.
- **Category Derivation**: Categories are mapped directly from OSM tags (e.g., `shop=bakery` -> `bakery`), and default to `other` if no exact match is found.
- **Data Hygiene**: Website URLs are automatically sanitized to enforce the `https://` protocol as required by `scripts/audit-vendor-candidates.ts`. Invalid URLs are omitted.
- **Useful profile detail and hours**: For cafes, restaurants, fast food, bars, pubs and ice-cream businesses, valid structured OSM `cuisine`, `takeaway`, `delivery`, `outdoor_seating`, `diet:vegan` and `diet:vegetarian` tags become short factual details such as `Cuisine: Italian. Takeaway available.` Any category can receive `Source-reported wheelchair access.` only for the exact tag `wheelchair=yes`; `limited`, `no` and all other values are deliberately not simplified into a public access promise. This is not generated marketing copy, retains source evidence, and can fill only an empty unclaimed profile description. Only explicit `yes` or `only` values are rendered where applicable. An OSM `opening_hours` value can fill only an empty, unclaimed `trading_hours` field when it is `24/7` or contains an explicit time range, is retained verbatim rather than reinterpreted, and is shown as source-reported with a check-before-visiting reminder. Prose-only or seasonal-only values remain evidence-only.
- **Multiple contact values**: When OSM supplies several phone numbers in one tag, the candidate retains the first listed number. The normal candidate audit still rejects an invalid number rather than allowing one malformed tag to invalidate a whole source run.
- **Source endpoints**: The workflow tries its configured Overpass providers in a bounded sequence, then makes one delayed retry of that sequence. An outage fails closed: it does not send an empty, partial or stale CSV to the handoff.
- **Source contract**: The handoff accepts the current `openstreetmap-candidate-v2` contract only when its executable contract and private approved-source registry agree on version, allowed host, enabled state and storage/display permission. A missing or changed contract is held safely; no candidate or listing changes.
- **Source-linked channels**: Exact OSM `contact:facebook`/`facebook` and `contact:instagram`/`instagram` values may become direct canonical profile links only for the supported HTTPS platform hosts. Query strings and fragments are discarded. The system never fetches, copies or displays social content.

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

## Results and evidence

Counts vary by source observation and are not a directory-quality claim. The GitHub workflow retains the exact audited CSV for 30 days and records private, idempotent candidate receipts. Recheck the current source artifact, `candidate_handoff_runs`, `integration_health`, and `docs/HANDOVER.md` rather than relying on historic acquisition totals in this document.
