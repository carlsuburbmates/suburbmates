-- Add fail-closed operator claim review with atomic, audited decisions.
-- Publication, billing, ABN and public listing fields are deliberately untouched.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.require_active_operator()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Operator authentication is required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.operator_users AS operator_user
    WHERE operator_user.user_id = v_user_id
      AND operator_user.is_active = true
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Active operator access is required.';
  END IF;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION private.require_active_operator() FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_current_user_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.operator_users AS operator_user
      WHERE operator_user.user_id = auth.uid()
        AND operator_user.is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.ops_claim_overview()
RETURNS TABLE (
  pending_count BIGINT,
  needs_information_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  revoked_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();

  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE claim.claim_status = 'pending'),
    count(*) FILTER (WHERE claim.claim_status = 'needs_information'),
    count(*) FILTER (WHERE claim.claim_status = 'approved'),
    count(*) FILTER (WHERE claim.claim_status = 'rejected'),
    count(*) FILTER (WHERE claim.claim_status = 'revoked')
  FROM public.claim_requests AS claim;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_claim_requests(
  p_status TEXT DEFAULT NULL,
  p_claim_request_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  claim_request_id UUID,
  vendor_id UUID,
  business_name TEXT,
  suburb_slug TEXT,
  category_slug TEXT,
  listing_source TEXT,
  ownership_status TEXT,
  is_published BOOLEAN,
  claimant_user_id UUID,
  claimant_email TEXT,
  claim_status TEXT,
  evidence JSONB,
  claimant_note TEXT,
  operator_note TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();

  IF p_status IS NOT NULL AND p_status NOT IN (
    'pending', 'needs_information', 'approved', 'rejected', 'revoked', 'withdrawn'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid claim status filter.';
  END IF;

  IF p_limit < 1 OR p_limit > 200 OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid pagination values.';
  END IF;

  RETURN QUERY
  SELECT
    claim.id,
    claim.vendor_id,
    vendor.business_name,
    vendor.suburb_slug,
    vendor.category_slug,
    vendor.listing_source,
    vendor.ownership_status,
    vendor.is_published,
    claim.claimant_user_id,
    claim.claimant_email,
    claim.claim_status,
    claim.evidence,
    claim.claimant_note,
    claim.operator_note,
    claim.decided_by,
    claim.decided_at,
    claim.created_at,
    claim.updated_at
  FROM public.claim_requests AS claim
  JOIN public.vendors AS vendor ON vendor.id = claim.vendor_id
  WHERE (p_status IS NULL OR claim.claim_status = p_status)
    AND (p_claim_request_id IS NULL OR claim.id = p_claim_request_id)
  ORDER BY claim.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_decide_claim(
  p_claim_request_id UUID,
  p_action TEXT,
  p_reason TEXT
)
RETURNS TABLE (
  claim_request_id UUID,
  vendor_id UUID,
  claim_status TEXT,
  ownership_status TEXT,
  owner_id UUID,
  is_published BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_reason TEXT := nullif(trim(coalesce(p_reason, '')), '');
  v_action TEXT := lower(trim(coalesce(p_action, '')));
  v_claim public.claim_requests%ROWTYPE;
  v_vendor public.vendors%ROWTYPE;
  v_new_status TEXT;
  v_correlation_id UUID := extensions.uuid_generate_v4();
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF v_reason IS NULL OR length(v_reason) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason between 1 and 2,000 characters is required.';
  END IF;

  IF v_action NOT IN ('needs_information', 'approve', 'reject', 'revoke') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid claim decision.';
  END IF;

  SELECT * INTO v_claim
  FROM public.claim_requests AS claim
  WHERE claim.id = p_claim_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Claim request not found.';
  END IF;

  SELECT * INTO v_vendor
  FROM public.vendors AS vendor
  WHERE vendor.id = v_claim.vendor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Claim listing not found.';
  END IF;

  IF v_action IN ('needs_information', 'approve', 'reject')
    AND v_claim.claim_status NOT IN ('pending', 'needs_information') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'This claim has already received a terminal decision.';
  END IF;

  IF v_action = 'revoke' AND v_claim.claim_status <> 'approved' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Only an approved claim can be revoked.';
  END IF;

  IF v_action = 'needs_information' THEN
    IF v_vendor.owner_id IS NOT NULL OR v_vendor.is_claimed OR v_vendor.ownership_status <> 'claim_pending' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Listing ownership no longer matches a pending claim.';
    END IF;
    v_new_status := 'needs_information';

    UPDATE public.claim_requests AS claim
    SET claim_status = v_new_status,
        operator_note = v_reason,
        decided_by = v_operator_id,
        decided_at = v_now,
        updated_at = v_now
    WHERE claim.id = v_claim.id;

    INSERT INTO public.audit_events (
      actor_type, actor_user_id, action, entity_type, entity_id, reason,
      before_data, after_data, correlation_id
    ) VALUES (
      'operator', v_operator_id, 'claim_information_requested', 'claim_request', v_claim.id::text, v_reason,
      jsonb_build_object('claim_status', v_claim.claim_status, 'vendor_id', v_claim.vendor_id),
      jsonb_build_object('claim_status', v_new_status, 'vendor_id', v_claim.vendor_id, 'publication_unchanged', v_vendor.is_published),
      v_correlation_id
    );

  ELSIF v_action = 'approve' THEN
    IF v_vendor.owner_id IS NOT NULL OR v_vendor.is_claimed OR v_vendor.ownership_status <> 'claim_pending' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Listing ownership no longer matches a pending claim.';
    END IF;
    v_new_status := 'approved';

    UPDATE public.claim_requests AS claim
    SET claim_status = v_new_status,
        operator_note = v_reason,
        decided_by = v_operator_id,
        decided_at = v_now,
        updated_at = v_now
    WHERE claim.id = v_claim.id;

    UPDATE public.vendors AS vendor
    SET owner_id = v_claim.claimant_user_id,
        is_claimed = true,
        ownership_status = 'claimed',
        updated_at = v_now
    WHERE vendor.id = v_claim.vendor_id;

    INSERT INTO public.audit_events (
      actor_type, actor_user_id, action, entity_type, entity_id, reason,
      before_data, after_data, correlation_id
    ) VALUES
    (
      'operator', v_operator_id, 'claim_approved', 'claim_request', v_claim.id::text, v_reason,
      jsonb_build_object('claim_status', v_claim.claim_status, 'vendor_id', v_claim.vendor_id),
      jsonb_build_object('claim_status', v_new_status, 'vendor_id', v_claim.vendor_id, 'publication_unchanged', v_vendor.is_published),
      v_correlation_id
    ),
    (
      'operator', v_operator_id, 'ownership_assigned', 'vendor', v_claim.vendor_id::text, v_reason,
      jsonb_build_object('owner_id', v_vendor.owner_id, 'is_claimed', v_vendor.is_claimed, 'ownership_status', v_vendor.ownership_status, 'is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      jsonb_build_object('owner_id', v_claim.claimant_user_id, 'is_claimed', true, 'ownership_status', 'claimed', 'is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      v_correlation_id
    );

  ELSIF v_action = 'reject' THEN
    IF v_vendor.owner_id IS NOT NULL OR v_vendor.is_claimed THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'The listing already has an owner.';
    END IF;
    v_new_status := 'rejected';

    UPDATE public.claim_requests AS claim
    SET claim_status = v_new_status,
        operator_note = v_reason,
        decided_by = v_operator_id,
        decided_at = v_now,
        updated_at = v_now
    WHERE claim.id = v_claim.id;

    UPDATE public.vendors AS vendor
    SET ownership_status = 'unclaimed',
        updated_at = v_now
    WHERE vendor.id = v_claim.vendor_id;

    INSERT INTO public.audit_events (
      actor_type, actor_user_id, action, entity_type, entity_id, reason,
      before_data, after_data, correlation_id
    ) VALUES
    (
      'operator', v_operator_id, 'claim_rejected', 'claim_request', v_claim.id::text, v_reason,
      jsonb_build_object('claim_status', v_claim.claim_status, 'vendor_id', v_claim.vendor_id),
      jsonb_build_object('claim_status', v_new_status, 'vendor_id', v_claim.vendor_id, 'publication_unchanged', v_vendor.is_published),
      v_correlation_id
    ),
    (
      'operator', v_operator_id, 'claim_released', 'vendor', v_claim.vendor_id::text, v_reason,
      jsonb_build_object('ownership_status', v_vendor.ownership_status, 'is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      jsonb_build_object('ownership_status', 'unclaimed', 'is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      v_correlation_id
    );

  ELSE
    IF v_vendor.owner_id IS DISTINCT FROM v_claim.claimant_user_id
      OR NOT v_vendor.is_claimed
      OR v_vendor.ownership_status <> 'claimed' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Listing ownership no longer matches this approved claim.';
    END IF;
    v_new_status := 'revoked';

    UPDATE public.claim_requests AS claim
    SET claim_status = v_new_status,
        operator_note = v_reason,
        decided_by = v_operator_id,
        decided_at = v_now,
        updated_at = v_now
    WHERE claim.id = v_claim.id;

    UPDATE public.vendors AS vendor
    SET owner_id = NULL,
        is_claimed = false,
        ownership_status = 'unclaimed',
        updated_at = v_now
    WHERE vendor.id = v_claim.vendor_id;

    INSERT INTO public.audit_events (
      actor_type, actor_user_id, action, entity_type, entity_id, reason,
      before_data, after_data, correlation_id
    ) VALUES
    (
      'operator', v_operator_id, 'claim_revoked', 'claim_request', v_claim.id::text, v_reason,
      jsonb_build_object('claim_status', v_claim.claim_status, 'vendor_id', v_claim.vendor_id),
      jsonb_build_object('claim_status', v_new_status, 'vendor_id', v_claim.vendor_id, 'publication_unchanged', v_vendor.is_published),
      v_correlation_id
    ),
    (
      'operator', v_operator_id, 'ownership_revoked', 'vendor', v_claim.vendor_id::text, v_reason,
      jsonb_build_object('owner_id', v_vendor.owner_id, 'is_claimed', v_vendor.is_claimed, 'ownership_status', v_vendor.ownership_status, 'is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      jsonb_build_object('owner_id', NULL, 'is_claimed', false, 'ownership_status', 'unclaimed', 'is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      v_correlation_id
    );
  END IF;

  RETURN QUERY
  SELECT
    updated_claim.id,
    updated_claim.vendor_id,
    updated_claim.claim_status,
    updated_vendor.ownership_status,
    updated_vendor.owner_id,
    updated_vendor.is_published
  FROM public.claim_requests AS updated_claim
  JOIN public.vendors AS updated_vendor ON updated_vendor.id = updated_claim.vendor_id
  WHERE updated_claim.id = v_claim.id;
END;
$$;

-- Approved owners must not bypass moderation by writing directly to public fields.
-- A reviewed change-request workflow will replace this legacy mutation path.
REVOKE ALL ON FUNCTION public.update_vendor_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.is_current_user_operator() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_claim_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_list_claim_requests(TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ops_decide_claim(UUID, TEXT, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_current_user_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_claim_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_claim_requests(TEXT, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_decide_claim(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.ops_decide_claim(UUID, TEXT, TEXT) IS
  'Operator-only atomic claim review. All decisions preserve listing publication and public fields.';
