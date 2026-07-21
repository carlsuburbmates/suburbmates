-- Optional ABN is private review evidence only. It never controls publication,
-- ownership, ranking, commercial state, or any automatic verification.

CREATE OR REPLACE FUNCTION public.submit_business_listing(
  p_submitter_name TEXT, p_business_name TEXT, p_category_slug TEXT, p_suburb_slug TEXT,
  p_contact_email TEXT, p_phone TEXT, p_website TEXT, p_street_address TEXT,
  p_abn TEXT, p_turnstile_hostname TEXT, p_turnstile_action TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now()); v_vendor_id UUID := extensions.uuid_generate_v4();
  v_submitter_name TEXT := trim(coalesce(p_submitter_name, '')); v_business_name TEXT := trim(coalesce(p_business_name, ''));
  v_category_slug TEXT := lower(trim(coalesce(p_category_slug, ''))); v_suburb_slug TEXT := lower(trim(coalesce(p_suburb_slug, '')));
  v_email TEXT := nullif(lower(trim(coalesce(p_contact_email, ''))), ''); v_phone TEXT := nullif(trim(coalesce(p_phone, '')), '');
  v_website TEXT := nullif(trim(coalesce(p_website, '')), ''); v_address TEXT := nullif(trim(coalesce(p_street_address, '')), '');
  v_abn TEXT := nullif(regexp_replace(trim(coalesce(p_abn, '')), '[[:space:]]', '', 'g'), '');
BEGIN
  IF length(v_submitter_name) NOT BETWEEN 2 AND 120 OR length(v_business_name) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Enter valid names.'; END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Enter a valid business email.'; END IF;
  IF v_phone IS NOT NULL AND (length(v_phone) < 6 OR length(v_phone) > 40 OR v_phone !~ '^[+0-9 ()-]+$') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Enter a valid phone number.'; END IF;
  IF v_website IS NOT NULL AND (length(v_website) > 500 OR v_website !~* '^https://[^[:space:]]+$') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Website must be a valid HTTPS address.'; END IF;
  IF v_email IS NULL AND v_phone IS NULL AND v_website IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Provide a business email, phone, or HTTPS website.'; END IF;
  IF v_abn IS NOT NULL AND v_abn !~ '^[0-9]{11}$' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='ABN must contain 11 digits.'; END IF;
  IF v_address IS NOT NULL AND length(v_address) > 500 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Street address is too long.'; END IF;
  IF p_turnstile_action <> 'business_submission' OR length(coalesce(p_turnstile_hostname,'')) > 253 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Human verification was not valid.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories WHERE slug=v_category_slug) OR NOT EXISTS (SELECT 1 FROM public.suburbs WHERE slug=v_suburb_slug) THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Choose a supported category and location.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('business-submission:' || coalesce(v_email, v_phone, v_website), 0));
  IF EXISTS (SELECT 1 FROM public.vendors WHERE (v_email IS NOT NULL AND lower(contact_email)=v_email) OR (lower(business_name)=lower(v_business_name) AND category_slug=v_category_slug AND suburb_slug=v_suburb_slug)) THEN RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='A matching listing already exists.'; END IF;
  INSERT INTO public.vendors (id,business_name,category_slug,suburb_slug,contact_email,phone,website,street_address,source_key,listing_status,listing_source,ownership_status,is_published,is_claimed,tier,updated_at)
  VALUES (v_vendor_id,v_business_name,v_category_slug,v_suburb_slug,v_email,v_phone,v_website,v_address,'business-submission:'||v_vendor_id::text,'pending_review','business_submitted','unclaimed',false,false,'free',v_now);
  INSERT INTO public.listing_evidence (vendor_id,evidence_type,source_url,status,summary,evidence_data)
  VALUES (v_vendor_id,'business_submission',v_website,'pending','Submitted through the reviewed public business intake.',jsonb_build_object('submitter_name',v_submitter_name,'contact_email',v_email,'phone',v_phone,'website',v_website,'abn',v_abn,'abn_status',CASE WHEN v_abn IS NULL THEN 'not_provided' ELSE 'awaiting_check' END,'turnstile_hostname',p_turnstile_hostname));
  INSERT INTO public.audit_events (actor_type,action,entity_type,entity_id,reason,after_data) VALUES ('service','business_submission_received','vendor',v_vendor_id::text,'Turnstile-verified business submission entered review',jsonb_build_object('listing_status','pending_review','is_published',false));
  RETURN v_vendor_id;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_business_listing(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_business_listing(TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT) TO service_role;
