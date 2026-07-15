-- Replace immediate email-match ownership with an evidence-backed request.
-- Email matching identifies a plausible listing but does not approve ownership.

ALTER TABLE public.claim_requests
  DROP CONSTRAINT IF EXISTS claim_requests_claim_status_check;
ALTER TABLE public.claim_requests
  ADD CONSTRAINT claim_requests_claim_status_check
  CHECK (claim_status IN ('pending', 'needs_information', 'approved', 'rejected', 'revoked', 'withdrawn'));

CREATE UNIQUE INDEX IF NOT EXISTS claim_requests_one_active_per_vendor_idx
  ON public.claim_requests (vendor_id)
  WHERE claim_status IN ('pending', 'needs_information', 'approved');

CREATE OR REPLACE FUNCTION public.list_claimable_vendors_for_current_email()
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  suburb_slug TEXT,
  category_slug TEXT,
  street_address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
BEGIN
  IF auth.uid() IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Authentication with an email address is required.';
  END IF;

  RETURN QUERY
  SELECT v.id, v.business_name, v.suburb_slug, v.category_slug, v.street_address
  FROM public.vendors AS v
  WHERE v.owner_id IS NULL
    AND v.is_claimed = false
    AND v.ownership_status = 'unclaimed'
    AND lower(v.contact_email) = v_email
    AND NOT EXISTS (
      SELECT 1 FROM public.claim_requests AS cr
      WHERE cr.vendor_id = v.id
        AND cr.claim_status IN ('pending', 'needs_information', 'approved')
    )
  ORDER BY v.business_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_claim_for_current_email(
  p_vendor_id UUID,
  p_claimant_note TEXT DEFAULT NULL
)
RETURNS TABLE (
  claim_request_id UUID,
  vendor_id UUID,
  claim_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_vendor public.vendors%ROWTYPE;
  v_claim public.claim_requests%ROWTYPE;
  v_correlation_id UUID := uuid_generate_v4();
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Authentication with an email address is required.';
  END IF;

  SELECT * INTO v_vendor
  FROM public.vendors AS v
  WHERE v.id = p_vendor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found.';
  END IF;
  IF v_vendor.owner_id IS NOT NULL OR v_vendor.is_claimed OR v_vendor.ownership_status <> 'unclaimed' THEN
    RAISE EXCEPTION 'This listing already has an owner or an active claim.';
  END IF;
  IF lower(coalesce(v_vendor.contact_email, '')) <> v_email THEN
    RAISE EXCEPTION 'Sign in using the email address shown on this business listing.';
  END IF;

  INSERT INTO public.claim_requests (
    vendor_id,
    claimant_user_id,
    claimant_email,
    evidence,
    claimant_note
  ) VALUES (
    p_vendor_id,
    v_user_id,
    v_email,
    jsonb_build_object('email_match', true, 'matched_at', timezone('utc'::text, now())),
    nullif(trim(coalesce(p_claimant_note, '')), '')
  )
  RETURNING * INTO v_claim;

  UPDATE public.vendors AS v
  SET ownership_status = 'claim_pending',
      updated_at = timezone('utc'::text, now())
  WHERE v.id = p_vendor_id;

  INSERT INTO public.audit_events (
    actor_type,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    reason,
    before_data,
    after_data,
    correlation_id
  ) VALUES (
    'owner',
    v_user_id,
    'claim_submitted',
    'vendor',
    p_vendor_id::text,
    nullif(trim(coalesce(p_claimant_note, '')), ''),
    jsonb_build_object('ownership_status', v_vendor.ownership_status, 'owner_id', v_vendor.owner_id, 'is_claimed', v_vendor.is_claimed),
    jsonb_build_object('ownership_status', 'claim_pending', 'claim_request_id', v_claim.id, 'publication_unchanged', v_vendor.is_published),
    v_correlation_id
  );

  RETURN QUERY SELECT v_claim.id, v_claim.vendor_id, v_claim.claim_status;
END;
$$;

REVOKE ALL ON FUNCTION public.list_claimable_vendors_for_current_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_vendor_for_current_email(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_claim_for_current_email(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_claimable_vendors_for_current_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_claim_for_current_email(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.submit_claim_for_current_email(UUID, TEXT) IS
  'Creates a pending claim using an authenticated email match as evidence; never assigns ownership or changes publication.';
