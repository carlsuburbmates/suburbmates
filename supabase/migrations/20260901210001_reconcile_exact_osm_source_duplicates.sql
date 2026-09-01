-- An exact OpenStreetMap node URL is a confirmed source identity, not a
-- similarity guess. Earlier imports created paired public rows before the
-- approved-source lifecycle existed. Retain every row and its evidence, but
-- remove only the provably redundant legacy row from public discovery.
--
-- This deliberately does not merge fields, transfer ownership, alter claims,
-- or touch any row with owner/operator activity. The qualified row remains
-- the canonical public profile and every change receives an immutable audit
-- event.

WITH paired_source_urls AS (
  SELECT source_url
  FROM public.vendors
  WHERE source_url LIKE 'https://www.openstreetmap.org/%'
  GROUP BY source_url
  HAVING count(*) = 2
), qualified_canonical_rows AS (
  SELECT
    vendor.source_url,
    min(record.vendor_id::text)::uuid AS canonical_vendor_id
  FROM public.vendors AS vendor
  JOIN paired_source_urls AS pair ON pair.source_url = vendor.source_url
  JOIN public.candidate_handoff_records AS record
    ON record.vendor_id = vendor.id
   AND record.qualification_outcome = 'qualified'
  GROUP BY vendor.source_url
  HAVING count(DISTINCT record.vendor_id) = 1
), safe_legacy_rows AS (
  SELECT
    legacy.id AS legacy_vendor_id,
    canonical.canonical_vendor_id,
    legacy.source_url,
    legacy.listing_status AS previous_listing_status,
    legacy.is_published AS previous_is_published,
    legacy.moderation_reason AS previous_moderation_reason
  FROM public.vendors AS legacy
  JOIN qualified_canonical_rows AS canonical ON canonical.source_url = legacy.source_url
  WHERE legacy.id <> canonical.canonical_vendor_id
    AND legacy.listing_status = 'published'
    AND legacy.is_published = true
    AND legacy.ownership_status = 'unclaimed'
    AND legacy.is_claimed = false
    AND legacy.owner_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.claim_requests AS claim WHERE claim.vendor_id = legacy.id)
    AND NOT EXISTS (SELECT 1 FROM public.listing_change_requests AS change_request WHERE change_request.vendor_id = legacy.id)
    AND NOT EXISTS (SELECT 1 FROM public.listing_media_proposals AS media WHERE media.vendor_id = legacy.id)
    AND NOT EXISTS (SELECT 1 FROM public.business_submission_requests AS submission WHERE submission.vendor_id = legacy.id)
    AND NOT EXISTS (SELECT 1 FROM public.operator_listing_drafts AS draft WHERE draft.vendor_id = legacy.id)
), reconciled AS (
  UPDATE public.vendors AS legacy
  SET
    listing_status = 'unpublished',
    is_published = false,
    moderation_reason = 'Confirmed exact OpenStreetMap source duplicate of ' || safe_legacy_rows.canonical_vendor_id::text,
    unpublished_at = timezone('utc'::text, now()),
    updated_at = timezone('utc'::text, now())
  FROM safe_legacy_rows
  WHERE legacy.id = safe_legacy_rows.legacy_vendor_id
  RETURNING
    legacy.id,
    safe_legacy_rows.canonical_vendor_id,
    safe_legacy_rows.source_url,
    safe_legacy_rows.previous_listing_status,
    safe_legacy_rows.previous_is_published,
    safe_legacy_rows.previous_moderation_reason,
    legacy.listing_status,
    legacy.is_published,
    legacy.moderation_reason
)
INSERT INTO public.audit_events (
  actor_type, action, entity_type, entity_id, reason, before_data, after_data
)
SELECT
  'system',
  'confirmed_exact_source_duplicate_unpublished',
  'vendor',
  reconciled.id::text,
  'An unclaimed legacy listing shared one exact OpenStreetMap source identity with one approved-source-qualified public listing.',
  jsonb_build_object(
    'listing_status', reconciled.previous_listing_status,
    'is_published', reconciled.previous_is_published,
    'moderation_reason', reconciled.previous_moderation_reason,
    'source_url', reconciled.source_url
  ),
  jsonb_build_object(
    'listing_status', reconciled.listing_status,
    'is_published', reconciled.is_published,
    'moderation_reason', reconciled.moderation_reason,
    'canonical_vendor_id', reconciled.canonical_vendor_id,
    'source_url', reconciled.source_url,
    'fields_merged', false,
    'history_retained', true
  )
FROM reconciled;
