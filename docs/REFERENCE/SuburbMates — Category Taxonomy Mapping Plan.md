# SuburbMates — Category Taxonomy Mapping Plan

## Purpose

Make category labels easier for Darebin residents to browse without changing the directory-first model, inventing business facts, or silently weakening the existing publication, duplicate, owner, audit, and SEO boundaries.

This is a controlled taxonomy-quality plan, not a bulk recategorisation job. A category describes an existing public listing; it does not establish its legitimacy, ownership, ranking, publication, ABN evidence, or commercial status.

## Evidence snapshot

Observed against the live Supabase project on 26 August 2026:

- 175 active category labels cover 1,606 published listings.
- Every category currently has at least one listing; 79 categories have only one or two listings.
- `public.vendors.category_slug` has the only foreign-key reference to `public.categories.slug`. `public.published_vendors` and `public.taxonomy_page_eligibility` are derived views.
- Category slugs are also public filter and taxonomy-route identifiers. A merge can affect `/businesses?category=...`, `/categories/[slug]`, `/[suburb]/[service]`, sitemap eligibility, future submissions, approved-source acquisition, operator drafts, and duplicate comparison.

## Locked implementation rules

1. Keep immutable audit events, acquisition evidence and historical handoff records unchanged. They record what was known at the time.
2. Never merge categories merely because their labels are similar. Review representative listings and their public descriptions/source evidence first.
3. Preserve old public category URLs with a permanent redirect or alias. Never leave a previously indexable taxonomy route as an unexplained 404.
4. Normalise aliases before duplicate comparison and before a new candidate or business submission is validated; otherwise the same business can evade a category-based duplicate check.
5. The public picker shows canonical categories only. Aliases remain accepted as compatibility input, not as a second public choice.
6. Keep `local-business` as the existing generic fallback until a separately evidenced listing-level classification pass exists. Do not bulk infer specific categories from names.

## Recommended mapping decisions

### Phase 0 — bounded approved-source additions

These are new canonical categories for explicit OpenStreetMap feature tags, not a reclassification of existing listings. The source pipeline may create a candidate only when its tag is exact; all other leisure, tourism and healthcare values remain excluded.

| OSM feature | Canonical slug | Public label | Explicit exclusions |
| --- | --- | --- | --- |
| `leisure=fitness_centre` | `fitness` | Fitness | Sports grounds, parks, tracks and unspecified leisure. |
| `leisure=dance` | `dance-studio` | Dance Studios | Other leisure values. |
| `tourism=hotel`, `motel`, `guest_house` | `accommodation` | Accommodation | Hostels, attractions, museums and information points. |
| `healthcare=pharmacy`, `dentist`, `optometrist` | Existing `pharmacy`, `dentist`, `optician` | Existing labels | Clinics, hospitals, alternative/unknown care, and all other healthcare values. |

The release adds the three canonical category rows before the scheduled source job can emit them. Existing category assignments, URLs and historical evidence are unchanged.

### Phase 1 — completed safe presentation corrections (1 September 2026)

These change only a readable category name, not a slug, URL, listing assignment, search filter, or source contract. The three corrections are implemented by `20260901113000_correct_category_presentation_labels.sql` and protected by `category-presentation:test`.

| Existing slug | Current label | Proposed public label | Reason |
| --- | --- | --- | --- |
| `doityourself` | Doityourself | DIY | Standard readable abbreviation. |
| `hifi` | Hifi | Hi-Fi | Standard punctuation. |
| `it` | It | IT | Correct acronym casing. |

### Phase 2 — approved merge candidate

| Alias slug | Canonical slug | Listings affected at snapshot | Recommendation |
| --- | --- | ---: | --- |
| `jewelry` | `jeweller` | 4 → 1 | Merge after a brief listing-evidence check. `Jeweller` is the established Australian-English label and the two labels describe the same retail/service category. |

The canonical public name remains **Jeweller**. Existing `jewelry` filter and taxonomy URLs must resolve permanently to `jeweller`.

### Phase 3 — evidence review queue, not automatic merges

These are plausible overlaps but have distinct enough meanings that they must not be merged from labels alone:

| Candidate labels | Why review is needed |
| --- | --- |
| `houseware` / `homewares` | Likely overlap, but source classification may distinguish product retail from general homewares. |
| `chemist` / `pharmacy` | Usually related, but a business can be a chemist, pharmacy, or health retailer. |
| `cleaner` / `cleaning` | A provider and a service category may be intentionally distinct. |
| `electrical` / `electrician` | Retail/supply and trade services can differ. |
| `coffee` / `cafe` | Roasters, suppliers and cafes should not be collapsed automatically. |

All other low-volume labels remain valid until evidence identifies a real label defect or overlap. No category is removed simply because it has few listings.

## Exact implementation sequence

1. **Read-only evidence pass**
   - Export the category inventory with published counts.
   - For every proposed merge, review representative public listing names, descriptions, source types and current taxonomy-route eligibility.
   - Record the resulting keep/merge decision and reason in the Decision Log and Linear.

2. **Introduce a durable alias map**
   - Add a minimal category-alias relation: `alias_slug` → canonical `category_slug`, with a foreign key to the canonical category and no public write path.
   - Seed only the approved `jewelry` → `jeweller` mapping. Do not add speculative aliases.
   - Resolve aliases in the server-side directory filter, taxonomy-route lookup, approved-source normalisation, candidate handoff and public-submission validation.

3. **Migrate current canonical records transactionally**
   - Update `public.vendors.category_slug` from an approved alias to its canonical slug.
   - Recheck the category-aware duplicate guard before finalising; any collision becomes an Ops review item, never an automatic merge of two businesses.
   - Retain the old category row as an alias target until compatibility redirects and normalisation are verified. Do not delete historical evidence or audit events.

4. **Preserve public routes and UI**
   - Permanently redirect `/categories/jewelry` and eligible `/[suburb]/jewelry` routes to their canonical equivalents.
   - Canonicalise legacy `?category=jewelry` requests to `?category=jeweller`.
   - Exclude alias labels from public selectors while allowing recognised legacy links to resolve.
   - Update homepage and directory service pickers to show the corrected canonical labels only.

5. **Verification and release**
   - Add policy tests for alias normalisation, submission/candidate validation, duplicate handling, canonical metadata, redirects, sitemap output and public query results.
   - Run the full repository policy suite, lint, production build and Cloudflare secret scan.
   - Deploy through the normal `web` path and verify the served canonical/legacy routes plus one unaffected category route.

## Explicit non-goals

- No bulk reclassification from a business name, AI inference, source tag, ABN result, ownership status, payment, or popularity.
- No deletion of listings, categories, source evidence, private submissions, or audit history.
- No public ranking, trust, review, or verification change.
- No automatic decision on the Phase 3 candidates.

## Definition of done

The first mapping release is complete only when the approved alias resolves consistently in browse, search, submissions, candidate qualification, duplicate checks, taxonomy routes, sitemap/canonicals and the public picker; the legacy URL redirects; the affected listings retain their identity and state; and the checks plus live verification pass.
