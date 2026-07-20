-- Owners can see their own request references and withdraw only requests that
-- are still awaiting a decision. Withdrawal never changes publication or
-- grants/revokes ownership.

CREATE OR REPLACE FUNCTION public.list_current_owner_claim_requests()
RETURNS TABLE (
  claim_request_id UUID,
  business_name TEXT,
  claim_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required.';
  END IF;

  RETURN QUERY
  SELECT claim.id, vendor.business_name, claim.claim_status, claim.created_at
  FROM public.claim_requests AS claim
  JOIN public.vendors AS vendor ON vendor.id = claim.vendor_id
  WHERE claim.claimant_user_id = v_user_id
  ORDER BY claim.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_current_owner_claim(p_claim_request_id UUID)
RETURNS TABLE (claim_request_id UUID, claim_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_claim public.claim_requests%ROWTYPE;
  v_vendor public.vendors%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_correlation_id UUID := extensions.uuid_generate_v4();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required.';
  END IF;

  SELECT * INTO v_claim
  FROM public.claim_requests AS claim
  WHERE claim.id = p_claim_request_id
    AND claim.claimant_user_id = v_user_id
    AND claim.claim_status IN ('pending', 'needs_information')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'This claim can no longer be withdrawn.';
  END IF;

  SELECT * INTO v_vendor
  FROM public.vendors AS vendor
  WHERE vendor.id = v_claim.vendor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Listing not found.';
  END IF;

  UPDATE public.claim_requests AS claim
  SET claim_status = 'withdrawn',
      decided_at = v_now,
      updated_at = v_now
  WHERE claim.id = v_claim.id;

  UPDATE public.vendors AS vendor
  SET ownership_status = 'unclaimed',
      updated_at = v_now
  WHERE vendor.id = v_vendor.id
    AND vendor.owner_id IS NULL
    AND vendor.is_claimed = false
    AND vendor.ownership_status = 'claim_pending';

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'owner', v_user_id, 'claim_withdrawn', 'claim_request', v_claim.id::text, NULL,
    jsonb_build_object('claim_status', v_claim.claim_status, 'vendor_id', v_claim.vendor_id),
    jsonb_build_object('claim_status', 'withdrawn', 'vendor_id', v_claim.vendor_id, 'publication_unchanged', v_vendor.is_published),
    v_correlation_id
  );

  RETURN QUERY SELECT v_claim.id, 'withdrawn'::TEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_current_owner_profile_change(p_change_request_id UUID)
RETURNS TABLE (change_request_id UUID, change_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_change public.listing_change_requests%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_correlation_id UUID := extensions.uuid_generate_v4();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required.';
  END IF;

  SELECT * INTO v_change
  FROM public.listing_change_requests AS change
  WHERE change.id = p_change_request_id
    AND change.submitted_by = v_user_id
    AND change.change_status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'This profile-change request can no longer be withdrawn.';
  END IF;

  UPDATE public.listing_change_requests AS change
  SET change_status = 'withdrawn',
      decided_at = v_now,
      updated_at = v_now
  WHERE change.id = v_change.id;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'owner', v_user_id, 'profile_change_withdrawn', 'listing_change_request', v_change.id::text, NULL,
    jsonb_build_object('change_status', v_change.change_status, 'vendor_id', v_change.vendor_id),
    jsonb_build_object('change_status', 'withdrawn', 'vendor_id', v_change.vendor_id),
    v_correlation_id
  );

  RETURN QUERY SELECT v_change.id, 'withdrawn'::TEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.list_current_owner_claim_requests() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.withdraw_current_owner_claim(UUID) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.withdraw_current_owner_profile_change(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_current_owner_claim_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_current_owner_claim(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_current_owner_profile_change(UUID) TO authenticated;

COMMENT ON FUNCTION public.list_current_owner_claim_requests() IS
  'Owner-scoped claim references for dashboard presentation. It never exposes another requester or writes data.';
COMMENT ON FUNCTION public.withdraw_current_owner_claim(UUID) IS
  'Owner-scoped withdrawal of a pending claim. It never changes publication or grants ownership.';
COMMENT ON FUNCTION public.withdraw_current_owner_profile_change(UUID) IS
  'Owner-scoped withdrawal of a pending profile-change request. It never applies a public profile change.';
