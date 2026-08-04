-- Restore valid email acceptance for private owner submissions. The previous
-- expression used two backslashes before the dot, which matched a literal
-- backslash rather than a normal email address.

CREATE OR REPLACE FUNCTION public.submit_business_listing_with_status(
  p_submitter_name TEXT, p_submitter_email TEXT, p_business_name TEXT, p_category_slug TEXT, p_suburb_slug TEXT,
  p_contact_email TEXT, p_phone TEXT, p_website TEXT, p_street_address TEXT, p_abn TEXT, p_turnstile_hostname TEXT, p_turnstile_action TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_email TEXT := nullif(lower(trim(coalesce(p_submitter_email,''))), ''); v_vendor_id UUID;
BEGIN
  IF v_email IS NULL OR length(v_email)>254 OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Enter a valid email for private status.'; END IF;
  v_vendor_id := public.submit_business_listing(p_submitter_name,p_business_name,p_category_slug,p_suburb_slug,p_contact_email,p_phone,p_website,p_street_address,p_abn,p_turnstile_hostname,p_turnstile_action);
  INSERT INTO public.business_submission_requests (vendor_id,submitter_email) VALUES (v_vendor_id,v_email);
  RETURN v_vendor_id;
END;
$$;
