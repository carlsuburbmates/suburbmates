-- Give the one remaining original seed an explicit non-public lifecycle state
-- without implying that its facts have been reviewed or approved.

WITH queued AS (
  UPDATE public.vendors AS vendor
  SET listing_status = 'draft',
      moderation_reason = 'Original seeded listing awaiting evidence review',
      updated_at = timezone('utc'::text, now())
  WHERE vendor.id = '7068265c-e2a0-410b-916c-75251e776779'::uuid
    AND vendor.listing_source = 'seeded_by_suburbmates'
    AND vendor.is_published = false
    AND vendor.listing_status IS NULL
  RETURNING vendor.id
)
INSERT INTO public.audit_events (
  actor_type, action, entity_type, entity_id, reason, before_data, after_data
)
SELECT
  'system',
  'unreviewed_seed_queued',
  'vendor',
  queued.id::text,
  'Made the existing non-public review state explicit without approving business facts',
  jsonb_build_object('listing_status', NULL, 'is_published', false),
  jsonb_build_object('listing_status', 'draft', 'is_published', false)
FROM queued;
