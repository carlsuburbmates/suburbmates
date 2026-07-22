CREATE TABLE public.business_submission_requests (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  vendor_id UUID NOT NULL UNIQUE REFERENCES public.vendors(id) ON DELETE RESTRICT,
  submitter_email TEXT NOT NULL,
  submission_status TEXT NOT NULL DEFAULT 'received' CHECK (submission_status IN ('received', 'needs_information', 'approved', 'declined')),
  operator_message TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
ALTER TABLE public.business_submission_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.business_submission_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.business_submission_requests TO service_role;

CREATE FUNCTION public.submit_business_listing_with_status(
  p_submitter_name TEXT, p_submitter_email TEXT, p_business_name TEXT, p_category_slug TEXT, p_suburb_slug TEXT,
  p_contact_email TEXT, p_phone TEXT, p_website TEXT, p_street_address TEXT, p_abn TEXT, p_turnstile_hostname TEXT, p_turnstile_action TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_email TEXT := nullif(lower(trim(coalesce(p_submitter_email,''))), ''); v_vendor_id UUID;
BEGIN
  IF v_email IS NULL OR length(v_email)>254 OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Enter a valid email for private status.'; END IF;
  v_vendor_id := public.submit_business_listing(p_submitter_name,p_business_name,p_category_slug,p_suburb_slug,p_contact_email,p_phone,p_website,p_street_address,p_abn,p_turnstile_hostname,p_turnstile_action);
  INSERT INTO public.business_submission_requests (vendor_id,submitter_email) VALUES (v_vendor_id,v_email);
  RETURN v_vendor_id;
END;
$$;

CREATE FUNCTION public.list_current_business_submission_statuses()
RETURNS TABLE (business_name TEXT, submission_status TEXT, status_message TEXT, next_step TEXT, submitted_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_user_id UUID := auth.uid(); v_email TEXT := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
BEGIN
  IF v_user_id IS NULL OR v_email='' THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Authentication with an email address is required.'; END IF;
  RETURN QUERY SELECT vendor.business_name, request.submission_status,
    CASE request.submission_status WHEN 'received' THEN 'We received this business for private review.' WHEN 'needs_information' THEN coalesce(request.operator_message,'SuburbMates needs more information before making a decision.') WHEN 'approved' THEN coalesce(request.operator_message,'This submission has been approved. Public directory availability is controlled separately.') ELSE coalesce(request.operator_message,'This submission was not approved for the directory.') END,
    CASE request.submission_status WHEN 'received' THEN 'No action is needed while the submission is reviewed.' WHEN 'needs_information' THEN 'Use the private claim-help path if you can provide the requested information.' WHEN 'approved' THEN 'No action is needed. This does not create ownership of the listing.' ELSE 'You may submit a new request only if you have materially different information.' END,
    request.created_at,request.updated_at
  FROM public.business_submission_requests request JOIN public.vendors vendor ON vendor.id=request.vendor_id WHERE request.submitter_email=v_email ORDER BY request.created_at DESC;
END;
$$;

CREATE FUNCTION public.ops_get_business_submission_status(p_vendor_id UUID)
RETURNS TABLE (submission_status TEXT, operator_message TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$ BEGIN PERFORM private.require_active_operator(); RETURN QUERY SELECT request.submission_status,request.operator_message,request.updated_at FROM public.business_submission_requests request WHERE request.vendor_id=p_vendor_id; END; $$;

CREATE FUNCTION public.ops_set_business_submission_status(p_vendor_id UUID,p_status TEXT,p_message TEXT)
RETURNS TABLE (submission_status TEXT,updated_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_operator_id UUID := private.require_active_operator(); v_status TEXT := lower(trim(coalesce(p_status,''))); v_message TEXT := nullif(trim(coalesce(p_message,'')), ''); v_before public.business_submission_requests%ROWTYPE; v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF v_status NOT IN ('needs_information','approved','declined') OR v_message IS NULL OR length(v_message)>2000 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Choose a valid outcome and enter a plain-language message.'; END IF;
  SELECT * INTO v_before FROM public.business_submission_requests request WHERE request.vendor_id=p_vendor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='02000', MESSAGE='No private submission exists for this listing.'; END IF;
  IF v_before.submission_status IN ('approved','declined') THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='This submission already has a final outcome.'; END IF;
  UPDATE public.business_submission_requests SET submission_status=v_status,operator_message=v_message,updated_by=v_operator_id,updated_at=v_now WHERE vendor_id=p_vendor_id;
  INSERT INTO public.audit_events (actor_type,actor_user_id,action,entity_type,entity_id,reason,before_data,after_data) VALUES ('operator',v_operator_id,'business_submission_status_updated','business_submission_request',p_vendor_id::text,v_message,jsonb_build_object('submission_status',v_before.submission_status),jsonb_build_object('submission_status',v_status,'publication_unchanged',true));
  RETURN QUERY SELECT request.submission_status,request.updated_at FROM public.business_submission_requests request WHERE request.vendor_id=p_vendor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_business_listing_with_status(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_current_business_submission_statuses() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_get_business_submission_status(UUID) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_set_business_submission_status(UUID,TEXT,TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_business_listing_with_status(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.list_current_business_submission_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_get_business_submission_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_set_business_submission_status(UUID,TEXT,TEXT) TO authenticated;
