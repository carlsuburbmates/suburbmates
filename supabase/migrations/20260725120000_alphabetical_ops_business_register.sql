-- The protected Business register is an operator browse surface, not a review
-- queue. Keep review views prioritised, but make the explicit `all` view a
-- stable alphabetical register without adding tables, policies or new reads.

CREATE OR REPLACE FUNCTION public.ops_list_listings(
  p_status TEXT DEFAULT 'review',
  p_query TEXT DEFAULT NULL,
  p_vendor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  vendor_id UUID, business_name TEXT, category_slug TEXT, suburb_slug TEXT,
  street_address TEXT, contact_email TEXT, phone TEXT, website TEXT, description TEXT,
  listing_status TEXT, listing_source TEXT, ownership_status TEXT, is_published BOOLEAN,
  is_claimed BOOLEAN, tier TEXT, moderation_reason TEXT, reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ, rejected_at TIMESTAMPTZ, unpublished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, active_draft_id UUID,
  draft_base_values JSONB, draft_values JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT := lower(trim(coalesce(p_status, 'review')));
  v_query TEXT := nullif(trim(coalesce(p_query, '')), '');
BEGIN
  PERFORM private.require_active_operator();
  IF v_status NOT IN ('review', 'unclassified', 'draft', 'pending_review', 'published', 'rejected', 'unpublished', 'all') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid listing status filter.';
  END IF;
  IF p_limit < 1 OR p_limit > 200 OR p_offset < 0 OR length(coalesce(v_query, '')) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid listing search or pagination values.';
  END IF;

  RETURN QUERY
  SELECT vendor.id, vendor.business_name, vendor.category_slug, vendor.suburb_slug,
    vendor.street_address, vendor.contact_email, vendor.phone, vendor.website, vendor.description,
    vendor.listing_status, vendor.listing_source, vendor.ownership_status,
    vendor.is_published, vendor.is_claimed, vendor.tier, vendor.moderation_reason,
    vendor.reviewed_at, vendor.published_at, vendor.rejected_at, vendor.unpublished_at,
    vendor.created_at, vendor.updated_at, active_draft.id, active_draft.base_values, active_draft.draft_values
  FROM public.vendors AS vendor
  LEFT JOIN LATERAL (
    SELECT draft.id, draft.base_values, draft.draft_values
    FROM public.operator_listing_drafts AS draft
    WHERE draft.vendor_id = vendor.id AND draft.draft_status = 'active'
    LIMIT 1
  ) AS active_draft ON true
  WHERE (p_vendor_id IS NULL OR vendor.id = p_vendor_id)
    AND (v_query IS NULL OR vendor.business_name ILIKE '%' || replace(replace(replace(v_query, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%' ESCAPE '\\')
    AND (
      v_status = 'all'
      OR (v_status = 'review' AND (vendor.listing_status IS NULL OR vendor.listing_status IN ('draft', 'pending_review')))
      OR (v_status = 'unclassified' AND vendor.listing_status IS NULL)
      OR vendor.listing_status = v_status
    )
  ORDER BY
    CASE WHEN v_status = 'all' THEN 0 WHEN vendor.listing_status IS NULL OR vendor.listing_status IN ('draft', 'pending_review') THEN 0 ELSE 1 END,
    CASE WHEN v_status = 'all' THEN vendor.business_name END ASC NULLS LAST,
    CASE WHEN v_status <> 'all' THEN vendor.updated_at END DESC NULLS LAST,
    vendor.business_name
  LIMIT p_limit OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.ops_list_listings(TEXT, TEXT, UUID, INTEGER, INTEGER) IS
  'Operator-only listing reader. The all-businesses register is alphabetical; lifecycle review views preserve their existing review-first ordering.';
