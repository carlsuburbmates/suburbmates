-- Turnstile-verified business submissions enter the existing private listing
-- review queue. They never publish, assign ownership, or alter an existing row.

CREATE OR REPLACE FUNCTION public.submit_business_listing(
  p_submitter_name TEXT,
  p_business_name TEXT,
  p_category_slug TEXT,
  p_suburb_slug TEXT,
  p_contact_email TEXT,
  p_phone TEXT,
  p_website TEXT,
  p_street_address TEXT,
  p_turnstile_hostname TEXT,
  p_turnstile_action TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_vendor_id UUID := extensions.uuid_generate_v4();
  v_submitter_name TEXT := trim(coalesce(p_submitter_name, ''));
  v_business_name TEXT := trim(coalesce(p_business_name, ''));
  v_category_slug TEXT := lower(trim(coalesce(p_category_slug, '')));
  v_suburb_slug TEXT := lower(trim(coalesce(p_suburb_slug, '')));
  v_email TEXT := lower(trim(coalesce(p_contact_email, '')));
  v_phone TEXT := nullif(trim(coalesce(p_phone, '')), '');
  v_website TEXT := nullif(trim(coalesce(p_website, '')), '');
  v_address TEXT := nullif(trim(coalesce(p_street_address, '')), '');
BEGIN
  IF length(v_submitter_name) < 2 OR length(v_submitter_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter your name.';
  END IF;
  IF length(v_business_name) < 2 OR length(v_business_name) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a valid business name.';
  END IF;
  IF length(v_email) > 254 OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a valid business contact email.';
  END IF;
  IF v_phone IS NOT NULL AND (length(v_phone) < 6 OR length(v_phone) > 40 OR v_phone !~ '^[+0-9 ()-]+$') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a valid phone number.';
  END IF;
  IF v_website IS NOT NULL AND (length(v_website) > 500 OR v_website !~* '^https://[^[:space:]]+$') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Website must be a valid HTTPS address.';
  END IF;
  IF v_address IS NOT NULL AND length(v_address) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Street address is too long.';
  END IF;
  IF p_turnstile_action <> 'business_submission' OR length(coalesce(p_turnstile_hostname, '')) > 253 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Human verification was not valid.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories AS category WHERE category.slug = v_category_slug) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose a supported business category.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.suburbs AS suburb WHERE suburb.slug = v_suburb_slug) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose a supported location.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('business-submission:' || v_email, 0));
  IF EXISTS (SELECT 1 FROM public.vendors AS vendor WHERE lower(vendor.contact_email) = v_email) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'A matching listing already exists. Search for it and use the claim process.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.vendors AS vendor
    WHERE lower(vendor.business_name) = lower(v_business_name)
      AND vendor.category_slug = v_category_slug
      AND vendor.suburb_slug = v_suburb_slug
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'A matching listing already exists. Search for it and use the claim process.';
  END IF;
  IF (
    SELECT count(*) FROM public.vendors AS vendor
    WHERE vendor.listing_source = 'business_submitted'
      AND lower(vendor.contact_email) = v_email
      AND vendor.created_at >= v_now - interval '1 day'
  ) >= 3 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Too many recent submissions. Try again later.';
  END IF;

  INSERT INTO public.vendors (
    id, business_name, category_slug, suburb_slug, contact_email, phone, website,
    street_address, source_key, listing_status, listing_source, ownership_status,
    is_published, is_claimed, tier, updated_at
  ) VALUES (
    v_vendor_id, v_business_name, v_category_slug, v_suburb_slug, v_email, v_phone, v_website,
    v_address, 'business-submission:' || v_vendor_id::text, 'pending_review', 'business_submitted',
    'unclaimed', false, false, 'free', v_now
  );

  INSERT INTO public.listing_evidence (
    vendor_id, evidence_type, source_url, status, summary, evidence_data
  ) VALUES (
    v_vendor_id, 'business_submission', v_website, 'pending',
    'Submitted through the reviewed public business intake.',
    jsonb_build_object(
      'submitter_name', v_submitter_name,
      'business_name', v_business_name,
      'category_slug', v_category_slug,
      'suburb_slug', v_suburb_slug,
      'contact_email', v_email,
      'phone', v_phone,
      'website', v_website,
      'street_address', v_address,
      'turnstile_hostname', p_turnstile_hostname
    )
  );

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason, after_data
  ) VALUES (
    'service', 'business_submission_received', 'vendor', v_vendor_id::text,
    'Turnstile-verified business submission entered review',
    jsonb_build_object('listing_status', 'pending_review', 'listing_source', 'business_submitted', 'is_published', false)
  );

  RETURN v_vendor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_listing_evidence(p_vendor_id UUID)
RETURNS TABLE (
  evidence_id UUID,
  evidence_type TEXT,
  source_url TEXT,
  status TEXT,
  summary TEXT,
  evidence_data JSONB,
  checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  RETURN QUERY
  SELECT evidence.id, evidence.evidence_type, evidence.source_url, evidence.status,
    evidence.summary, evidence.evidence_data, evidence.checked_at, evidence.created_at
  FROM public.listing_evidence AS evidence
  WHERE evidence.vendor_id = p_vendor_id
  ORDER BY evidence.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_business_listing(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_business_listing(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;
REVOKE ALL ON FUNCTION public.ops_list_listing_evidence(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_list_listing_evidence(UUID) TO authenticated;

COMMENT ON FUNCTION public.submit_business_listing(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Service-only, Turnstile-prevalidated business intake. Creates an unpublished pending-review listing and immutable source evidence.';
