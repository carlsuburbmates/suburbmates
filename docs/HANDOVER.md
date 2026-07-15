# SuburbMates Handover

**Purpose:** canonical context for the next Codex or Antigravity session.

**Repository:** `/Users/carlg/Documents/AI-Coding/suburbmates`

**Current priority:** continue expanding the real-business catalogue for the City of Darebin, Northcote first, and maintain the verified public directory website. Do not create dummy businesses.

## Product objective

SuburbMates is a public local-business directory, not a lead-selling or quotation middleman. Every discoverable real business can have a public listing with:

- business name
- category
- suburb
- street address when publicly available
- public phone or email when available
- website and source provenance when available

Listings are public even when incomplete. A visitor can search or browse a listing and open its directory-style minisite. A business owner can claim a matching listing by email and enrich it. A business does not need its own website to appear.

## Post-launch operating model

Once launched, SuburbMates is intended to operate as an autonomous directory pipeline rather than a manually curated staff workflow. The system can acquire real public business records, normalize and deduplicate them, publish complete or incomplete listings, generate the directory minisite from the stored record, and support owner-initiated claiming and enrichment.

Autonomous operation does not mean that secrets, destructive database changes, legal or policy decisions, abuse handling, or paid-product changes should be made unattended. The default automation boundary is: discover, audit, deduplicate, upsert, publish, render, and accept owner claims; do not silently delete, invent, or materially alter a business record.

## Current source of truth

The repository code, migrations, data files, and hosted Supabase database are authoritative. Old Antigravity plans, screenshots, transcripts, and audit reports are not authoritative and were removed or are being removed from the active project context.

Current hosted database snapshot, reverified on 15 July 2026:

- 1,621 vendor rows total.
- 1,600 rows published publicly.
- 16 rows sourced from the Northcote Rise association directory.
- 21 rows are not currently published; inspect their state before changing publication behavior.

The prior 1,582-row merged CSV is a source baseline, not a guarantee that it exactly equals the current hosted database. The hosted count must be rechecked after each catalogue import.

## Production website status

The full Next.js directory is deployed to the existing Cloudflare Worker and publicly served at `https://suburbmates.com.au`. The 15 July 2026 release was verified against live Supabase data across the homepage, business browse page, Northcote page, categories, suburb/category results, claim/login path, locations, sitemap, and a real vendor minisite. `www.suburbmates.com.au` permanently redirects to the canonical apex domain.

The Cloudflare OpenNext adapter uses the Next.js Node.js runtime. Do not add `export const runtime = 'edge'` to pages or route handlers; that configuration produced HTTP 500 responses in the packaged Worker. Build and preview the Cloudflare bundle before deployment with `npm run cf:build` and `npm run cf:preview` from `web/`.

## Architecture

- `web/`: Next.js App Router public directory and authenticated owner flows.
- `web/src/app/(directory)/businesses/`: searchable public browse page.
- `web/src/app/(directory)/[suburb]/`: suburb directory pages.
- `web/src/app/(directory)/[suburb]/[service]/`: suburb/category pages.
- `web/src/app/vendor/[slug]/`: directory minisites.
- `web/src/app/(directory)/claim/`: email-matched self-service claims.
- `web/src/app/(directory)/dashboard/`: owner profile enrichment.
- `supabase/migrations/`: schema, RLS, claim RPCs, provenance, and owner profile update history.
- `scripts/`: acquisition, audit, merge, import, reporting, and tests.
- `data/`: source-specific candidate files and catchment manifest.

The public UI intentionally filters to `is_published = true`. New catalogue imports are published immediately by `scripts/seed.ts`; owner claiming does not require staff approval and does not hide the listing.

## Vendor workflow

1. Acquire a real source record.
2. Normalize and audit the source file.
3. Compare name, address, phone, website, and source identity against the full hosted catalogue.
4. Upsert the record without overwriting owner-entered values with blanks.
5. Publish the new listing immediately.
6. Allow the owner to sign in using the matching contact email and claim it.
7. Allow the owner to edit business name, address, email, phone, website, and description.

Same-name businesses at different addresses remain separate. Do not merge by name alone.

## Monetisation strategy

The baseline directory is free to businesses: real listings are discoverable, including listings with incomplete public information, and owners can claim and enrich their listing without needing to buy a website. Monetisation is an optional layer on top of that public utility, not a gate on catalogue inclusion.

The current direction is to test paid owner upgrades such as enhanced minisite presentation, featured placement, richer contact or media sections, and subscription-based business tools after the free directory demonstrates traffic and claim demand. Featured placement must be clearly labelled and must not remove ordinary businesses from relevant search or suburb results.

Stripe is intentionally deferred. No paid plan, checkout, billing entitlement, or Stripe-dependent workflow should be treated as launch-critical. The monetisation model is open to recommendation and discussion at any point; any recommendation must preserve free public discovery, transparent ranking, and the owner-claim model.

## Current acquisition sources

- OpenStreetMap commercial features across the Darebin catchment: `scripts/acquire-openstreetmap.ts`.
- Curated real records: `data/vendor-candidates.csv`.
- Northcote Rise association directory: `data/vendor-candidates-northcote-rise.csv`.
- Darebin’s official association page is the local source index. Preston Central and Fairfield Village expose larger directories and are the next acquisition targets. Reservoir currently has no equivalent public directory linked from Council.

The acquisition rules are in [`vendor-acquisition-strategy.md`](vendor-acquisition-strategy.md). Do not scrape closed directories such as Yellow Pages, White Pages, Google Places, Foursquare, or Facebook without an explicit licence permitting persistent directory storage and display.

## Import commands

From the repository root:

```bash
npm run check
npm run audit -- data/vendor-candidates-merged.csv
npm run seed -- --dry-run data/vendor-candidates-merged.csv
npm run seed -- data/vendor-candidates-merged.csv
npm run audit -- data/vendor-candidates-northcote-rise.csv
npm run seed -- --dry-run data/vendor-candidates-northcote-rise.csv
npm run seed -- data/vendor-candidates-northcote-rise.csv
npm run catalogue:report -- data/vendor-candidates-merged.csv
```

`scripts/seed.ts` now paginates existing Supabase vendors in 1,000-row pages before reconciliation. This is required because Supabase responses otherwise stop at the first 1,000 rows.

## Tests and verification

Root checks:

```bash
npm run check
npm run audit:test
npm run catalogue:merge:test
npm run acquire:osm:test
npm run claim:test
npm run seed:test
npm run verify:db
```

Web checks:

```bash
cd web
npm run build
```

The production build passes. The generic `npm run lint` command currently scans generated OpenNext output when that output exists and reports pre-existing generated-code and source `any` issues; use focused ESLint scopes while that cleanup is handled. The live Supabase claim test creates temporary users and a vendor, verifies claim isolation and profile enrichment, then removes all test rows.

## Integrated accounts and access references

These are the current project integrations. This list contains identifiers for reference only, never credentials. Secrets remain in the local environment and connected account settings.

| Service | Current project/account reference | Use | Status |
| --- | --- | --- | --- |
| GitHub | `carlsuburbmates/suburbmates` | Source repository and change history | Current source repository |
| Supabase | Remote project `lqxohgpignkqqfkkbzsn` (`lqxohgpignkqqfkkbzsn.supabase.co`) | Hosted PostgreSQL, Auth, RLS, vendor catalogue, claims, and remote MCP access | Preferred and remote-only |
| Cloudflare | Worker/service `suburbmates` | Production edge delivery and deployment target | Connected; domain/infrastructure work remains separate from catalogue work |
| Domain registrar | VentraIP domain account for `suburbmates.com.au` | Registrar and nameserver control | Cloudflare is the DNS authority; do not move DNS back to Vercel |
| Resend | Sending domain `info.suburbmates.com.au` | Transactional email for claims and owner workflows | Connected; verify DNS/domain status before relying on email |
| Stripe | Existing connected Stripe configuration | Future paid upgrades, featured placement, or subscriptions | Deferred; do not make it a prerequisite |
| Local MCP | Supabase MCP configured in `.mcp.json` | Controlled access to the remote Supabase project | Configured; never commit its access token |

Supabase must remain remote-integrated only. Do not start or add a local Supabase Docker stack, local database dump, or local replica for normal development; this avoids unnecessary local storage and prevents agents from mistaking a local database for the production source of truth. Use the hosted project through the configured environment and MCP connection, with read-only inspection preferred outside explicit import or claim tests.

## Known gaps and next work

1. Build a repeatable source adapter for Preston Central and Fairfield Village, with source-specific staging files and address-aware duplicate reports.
2. Investigate the 21 unpublished hosted rows and document why they are unpublished before changing the public policy.
3. Reconcile the hosted database against all canonical source files and report additions, enrichments, duplicates, and stale records.
4. Repeat the live route verification after website or catalogue releases.
5. Keep owner claims self-service and preserve public visibility for incomplete listings.
6. Defer paid monetization, Stripe behavior, and domain cutover unless explicitly brought back into scope.

## Cleanup boundary

This handover is the durable project context. Do not recreate raw session transcripts, screenshots, recordings, speculative architecture plans, or repeated audit batches in the repository. Put durable decisions in this document or update the focused operational document that owns the workflow.
