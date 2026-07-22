-- An authenticated business owner or authorised representative can submit a
-- missing business and a related claim together. Both remain private and
-- pending until an operator makes separate listing and claim decisions.

CREATE FUNCTION public.submit_owned_business_candidate_for_current_user(
  p_submitter_name TEXT,
  p_business_name TEXT,
  p_category_slug TEXT,
  p_suburb_slug TEXT,
  p_contact_email TEXT,
  p_phone TEXT,
  p_website TEXT,
  p_street_address TEXT,
  p_abn TEXT,
  p_relationship_explanation TEXT,
  p_turnstile_hostname TEXT,
  p_turnstile_action TEXT
)
RETURNS TABLE (vendor_id UUID, claim_request_id UUID, claim_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_note TEXT := nullif(trim(coalesce(p_relationship_explanation, '')), '');
  v_abn TEXT := nullif(regexp_replace(coalesce(p_abn, ''), '\\s', '', 'g'), '');
  v_vendor_id UUID;
  v_claim public.claim_requests%ROWTYPE;
BEGIN
  IF v_user_id IS NULL OR v_email = '' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication with an email address is required.';
  END IF;
  IF v_note IS NULL OR char_length(v_note) < 10 OR char_length(v_note) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Explain your connection to the business using 10 to 1,000 characters.';
  END IF;
  IF v_abn IS NOT NULL AND v_abn !~ '^\\d{11}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ABN must contain 11 digits when provided.';
  END IF;

  v_vendor_id := public.submit_business_listing_with_status(
    p_submitter_name, v_email, p_business_name, p_category_slug, p_suburb_slug,
    p_contact_email, p_phone, p_website, p_street_address, v_abn,
    p_turnstile_hostname, p_turnstile_action
  );

  INSERT INTO public.claim_requests (
    vendor_id, claimant_user_id, claimant_email, evidence, claimant_note
  ) VALUES (
    v_vendor_id,
    v_user_id,
    v_email,
    jsonb_build_object(
      'email_match', false,
      'owner_submitted_candidate', true,
      'relationship_explanation', v_note,
      'abn', v_abn,
      'abn_status', CASE WHEN v_abn IS NULL THEN 'not_provided' ELSE 'provided_unverified' END
    ),
    v_note
  ) RETURNING * INTO v_claim;

  UPDATE public.vendors
  SET ownership_status = 'claim_pending', updated_at = timezone('utc'::text, now())
  WHERE id = v_vendor_id;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason, after_data
  ) VALUES (
    'owner', v_user_id, 'owner_submitted_business_candidate', 'vendor', v_vendor_id::text, v_note,
    jsonb_build_object(
      'listing_status', 'pending_review',
      'ownership_status', 'claim_pending',
      'claim_request_id', v_claim.id,
      'publication_unchanged', true,
      'ownership_unchanged', true
    )
  );

  RETURN QUERY SELECT v_vendor_id, v_claim.id, v_claim.claim_status;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_owned_business_candidate_for_current_user(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_owned_business_candidate_for_current_user(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO authenticated;

COMMENT ON FUNCTION public.submit_owned_business_candidate_for_current_user(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) IS
  'Creates a private missing-business candidate and a pending ownership claim for the signed-in owner or representative. It never publishes a listing or grants ownership.';
