-- Complete the existing protected Ops composition without adding a workflow
-- system: the Business register can filter fields it already reads, and a Work
-- row can open the exact private candidate evidence it represents.

DROP FUNCTION IF EXISTS public.ops_list_listings(TEXT, TEXT, UUID, INTEGER, INTEGER);

CREATE FUNCTION public.ops_list_listings(
  p_status TEXT DEFAULT 'review',
  p_query TEXT DEFAULT NULL,
  p_vendor_id UUID DEFAULT NULL,
  p_ownership_status TEXT DEFAULT NULL,
  p_listing_source TEXT DEFAULT NULL,
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
  v_ownership_status TEXT := nullif(lower(trim(coalesce(p_ownership_status, ''))), '');
  v_listing_source TEXT := nullif(lower(trim(coalesce(p_listing_source, ''))), '');
BEGIN
  PERFORM private.require_active_operator();
  IF v_status NOT IN ('review', 'unclassified', 'draft', 'pending_review', 'published', 'rejected', 'unpublished', 'all')
    OR v_ownership_status NOT IN ('unclaimed', 'claim_pending', 'claimed', 'owner_verified')
    OR v_listing_source NOT IN ('seeded_by_suburbmates', 'operator_added', 'business_submitted', 'claimed_existing_listing', 'approved_import') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid listing filter.';
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
    AND (v_ownership_status IS NULL OR vendor.ownership_status = v_ownership_status)
    AND (v_listing_source IS NULL OR vendor.listing_source = v_listing_source)
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

REVOKE ALL ON FUNCTION public.ops_list_listings(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_list_listings(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;

DROP FUNCTION IF EXISTS public.ops_list_candidate_handoff_records(TEXT, INTEGER, INTEGER);

CREATE FUNCTION public.ops_list_candidate_handoff_records(
  p_status TEXT DEFAULT 'open',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0,
  p_record_id UUID DEFAULT NULL
)
RETURNS TABLE (
  record_id UUID, run_id UUID, source TEXT, source_record_key TEXT,
  candidate_data JSONB, normalized_data JSONB, qualification_outcome TEXT,
  qualification_reasons JSONB, duplicate_vendor_id UUID, vendor_id UUID,
  exception_status TEXT, resolution_note TEXT, resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT := lower(trim(coalesce(p_status, 'open')));
BEGIN
  PERFORM private.require_active_operator();
  IF v_status NOT IN ('open', 'acknowledged', 'dismissed', 'all') OR p_limit < 1 OR p_limit > 200 OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid candidate handoff filter or pagination values.';
  END IF;
  RETURN QUERY
  SELECT record.id, run.id, run.source, record.source_record_key, record.candidate_data,
    record.normalized_data, record.qualification_outcome, record.qualification_reasons,
    record.duplicate_vendor_id, record.vendor_id, record.exception_status,
    record.resolution_note, record.resolved_at, record.created_at
  FROM public.candidate_handoff_records AS record
  JOIN public.candidate_handoff_runs AS run ON run.id = record.run_id
  WHERE record.qualification_outcome = 'exception'
    AND (p_record_id IS NULL OR record.id = p_record_id)
    AND (v_status = 'all' OR record.exception_status = v_status)
  ORDER BY record.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_candidate_handoff_records(TEXT, INTEGER, INTEGER, UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_list_candidate_handoff_records(TEXT, INTEGER, INTEGER, UUID) TO authenticated;

COMMENT ON FUNCTION public.ops_list_listings(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, INTEGER) IS
  'Operator-only listing reader with existing lifecycle, ownership and source filters.';
COMMENT ON FUNCTION public.ops_list_candidate_handoff_records(TEXT, INTEGER, INTEGER, UUID) IS
  'Operator-only candidate exception reader. An optional record ID supports a Work row opening its exact evidence.';
