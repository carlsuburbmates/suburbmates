-- Keep legacy rows for traceability, but remove exact duplicates from the
-- unresolved review queue when one published catalogue peer is provable.

WITH exact_matches AS (
  SELECT
    legacy.id AS legacy_id,
    min(published.id::text)::uuid AS published_id,
    legacy.listing_status AS previous_listing_status,
    legacy.moderation_reason AS previous_moderation_reason
  FROM public.vendors AS legacy
  JOIN public.vendors AS published
    ON published.id <> legacy.id
   AND published.is_published = true
   AND published.source_key LIKE 'catalogue:%'
   AND lower(btrim(published.business_name)) = lower(btrim(legacy.business_name))
   AND published.suburb_slug = legacy.suburb_slug
   AND published.category_slug = legacy.category_slug
  WHERE legacy.is_published = false
    AND legacy.listing_source IS NULL
    AND legacy.source_key LIKE 'website:%'
  GROUP BY
    legacy.id,
    legacy.listing_status,
    legacy.moderation_reason
  HAVING count(published.id) = 1
), reconciled AS (
  UPDATE public.vendors AS legacy
  SET listing_status = 'rejected',
      moderation_reason = 'Legacy duplicate of published listing ' || exact_matches.published_id::text,
      rejected_at = COALESCE(legacy.rejected_at, timezone('utc'::text, now())),
      updated_at = timezone('utc'::text, now())
  FROM exact_matches
  WHERE legacy.id = exact_matches.legacy_id
    AND (
      legacy.listing_status IS DISTINCT FROM 'rejected'
      OR legacy.moderation_reason IS DISTINCT FROM 'Legacy duplicate of published listing ' || exact_matches.published_id::text
    )
  RETURNING
    legacy.id,
    exact_matches.published_id,
    exact_matches.previous_listing_status,
    exact_matches.previous_moderation_reason,
    legacy.listing_status,
    legacy.moderation_reason
)
INSERT INTO public.audit_events (
  actor_type, action, entity_type, entity_id, reason, before_data, after_data
)
SELECT
  'system',
  'legacy_duplicate_reconciled',
  'vendor',
  reconciled.id::text,
  'Exact unpublished legacy duplicate matched one published catalogue listing',
  jsonb_build_object(
    'listing_status', reconciled.previous_listing_status,
    'moderation_reason', reconciled.previous_moderation_reason,
    'is_published', false
  ),
  jsonb_build_object(
    'listing_status', reconciled.listing_status,
    'moderation_reason', reconciled.moderation_reason,
    'is_published', false,
    'duplicate_of_vendor_id', reconciled.published_id
  )
FROM reconciled;
