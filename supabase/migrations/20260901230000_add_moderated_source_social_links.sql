-- D-018: a narrow, direct social-profile link can be useful local contact
-- evidence when an approved source supplies it. These are links only: this
-- migration never crawls, embeds, stores, or displays third-party content.
-- Owners retain the same review-first correction path as every other public
-- profile field.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT;

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_facebook_url_check,
  DROP CONSTRAINT IF EXISTS vendors_instagram_url_check;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_facebook_url_check
    CHECK (facebook_url IS NULL OR facebook_url ~* '^https://(www\\.|m\\.)?facebook\\.com/[^[:space:]]+$'),
  ADD CONSTRAINT vendors_instagram_url_check
    CHECK (instagram_url IS NULL OR instagram_url ~* '^https://(www\\.)?instagram\\.com/[^[:space:]]+$');

ALTER TABLE public.listing_field_evidence
  DROP CONSTRAINT IF EXISTS listing_field_evidence_field_name_check;
ALTER TABLE public.listing_field_evidence
  ADD CONSTRAINT listing_field_evidence_field_name_check
  CHECK (field_name IN ('business_name', 'category_slug', 'suburb_slug', 'street_address', 'contact_email', 'phone', 'website', 'facebook_url', 'instagram_url', 'description', 'trading_hours'));

ALTER TABLE public.catalogue_field_conflicts
  DROP CONSTRAINT IF EXISTS catalogue_field_conflicts_field_name_check;
ALTER TABLE public.catalogue_field_conflicts
  ADD CONSTRAINT catalogue_field_conflicts_field_name_check
  CHECK (field_name IN ('business_name', 'category_slug', 'suburb_slug', 'street_address', 'contact_email', 'phone', 'website', 'facebook_url', 'instagram_url', 'description', 'trading_hours'));

UPDATE public.catalogue_sources
SET contract_version = 'openstreetmap-candidate-v2',
    updated_at = timezone('utc'::text, now())
WHERE source_key = 'openstreetmap';

CREATE OR REPLACE VIEW public.published_vendors
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  vendor.id,
  vendor.slug,
  vendor.business_name,
  vendor.category_slug,
  vendor.suburb_slug,
  vendor.contact_email,
  vendor.phone,
  vendor.website,
  vendor.facebook_url,
  vendor.instagram_url,
  vendor.description,
  vendor.tier,
  vendor.is_claimed,
  vendor.street_address,
  vendor.created_at,
  vendor.is_published,
  EXISTS (
    SELECT 1
    FROM public.listing_evidence AS evidence
    WHERE evidence.vendor_id = vendor.id
      AND evidence.evidence_type = 'abn_lookup'
      AND evidence.status = 'passed'
      AND evidence.evidence_data ->> 'abn_status' = 'active'
      AND evidence.checked_at >= timezone('utc'::text, now()) - interval '90 days'
      AND evidence.id = (
        SELECT latest.id
        FROM public.listing_evidence AS latest
        WHERE latest.vendor_id = vendor.id AND latest.evidence_type = 'abn_lookup'
        ORDER BY latest.checked_at DESC NULLS LAST, latest.created_at DESC
        LIMIT 1
      )
  ) AS abn_checked,
  vendor.trading_hours
FROM public.vendors AS vendor
WHERE vendor.is_published = true;

REVOKE ALL ON TABLE public.published_vendors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.published_vendors TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_current_owner_vendors_with_hours()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  business_name TEXT,
  suburb_slug TEXT,
  category_slug TEXT,
  tier TEXT,
  is_published BOOLEAN,
  street_address TEXT,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  facebook_url TEXT,
  instagram_url TEXT,
  description TEXT,
  trading_hours TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    vendor.id, vendor.slug, vendor.business_name, vendor.suburb_slug,
    vendor.category_slug, vendor.tier, vendor.is_published,
    vendor.street_address, vendor.contact_email, vendor.phone, vendor.website,
    vendor.facebook_url, vendor.instagram_url, vendor.description,
    vendor.trading_hours
  FROM public.vendors AS vendor
  WHERE vendor.owner_id = auth.uid()
  ORDER BY vendor.business_name, vendor.id;
$$;

CREATE OR REPLACE FUNCTION public.submit_vendor_profile_change_with_channels(
  p_vendor_id UUID,
  p_business_name TEXT,
  p_street_address TEXT,
  p_contact_email TEXT,
  p_phone TEXT,
  p_website TEXT,
  p_facebook_url TEXT,
  p_instagram_url TEXT,
  p_description TEXT,
  p_trading_hours TEXT,
  p_submitter_note TEXT DEFAULT NULL
)
RETURNS TABLE (change_request_id UUID, change_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vendor public.vendors%ROWTYPE;
  v_change public.listing_change_requests%ROWTYPE;
  v_name TEXT := trim(coalesce(p_business_name, ''));
  v_address TEXT := nullif(trim(coalesce(p_street_address, '')), '');
  v_email TEXT := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_phone TEXT := nullif(trim(coalesce(p_phone, '')), '');
  v_website TEXT := nullif(trim(coalesce(p_website, '')), '');
  v_facebook_url TEXT := nullif(trim(coalesce(p_facebook_url, '')), '');
  v_instagram_url TEXT := nullif(trim(coalesce(p_instagram_url, '')), '');
  v_description TEXT := nullif(trim(coalesce(p_description, '')), '');
  v_hours TEXT := nullif(regexp_replace(trim(coalesce(p_trading_hours, '')), '[[:space:]]+', ' ', 'g'), '');
  v_note TEXT := nullif(trim(coalesce(p_submitter_note, '')), '');
  v_base JSONB;
  v_proposed JSONB;
  v_changed_fields JSONB;
  v_correlation_id UUID := extensions.uuid_generate_v4();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required.';
  END IF;

  SELECT * INTO v_vendor FROM public.vendors AS vendor WHERE vendor.id = p_vendor_id FOR UPDATE;
  IF NOT FOUND OR v_vendor.owner_id IS DISTINCT FROM v_user_id
    OR NOT v_vendor.is_claimed OR v_vendor.ownership_status NOT IN ('claimed', 'owner_verified') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the approved owner can propose changes to this listing.';
  END IF;

  IF length(v_name) < 2 OR length(v_name) > 200
    OR length(coalesce(v_address, '')) > 500 OR length(coalesce(v_email, '')) > 320
    OR length(coalesce(v_phone, '')) > 80 OR length(coalesce(v_website, '')) > 1000
    OR length(coalesce(v_facebook_url, '')) > 1000 OR length(coalesce(v_instagram_url, '')) > 1000
    OR length(coalesce(v_description, '')) > 5000 OR length(coalesce(v_hours, '')) > 300
    OR length(coalesce(v_note, '')) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'One or more profile fields exceed the allowed length.';
  END IF;
  IF v_email IS NOT NULL AND v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a valid contact email address.';
  END IF;
  IF v_website IS NOT NULL AND v_website !~* '^https?://[^[:space:]]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Website must begin with http:// or https://.';
  END IF;
  IF v_facebook_url IS NOT NULL AND v_facebook_url !~* '^https://(www\\.|m\\.)?facebook\\.com/[^[:space:]]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Facebook must be a full https://facebook.com profile URL.';
  END IF;
  IF v_instagram_url IS NOT NULL AND v_instagram_url !~* '^https://(www\\.)?instagram\\.com/[^[:space:]]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Instagram must be a full https://instagram.com profile URL.';
  END IF;

  v_base := jsonb_build_object(
    'business_name', v_vendor.business_name, 'street_address', v_vendor.street_address,
    'contact_email', v_vendor.contact_email, 'phone', v_vendor.phone,
    'website', v_vendor.website, 'facebook_url', v_vendor.facebook_url,
    'instagram_url', v_vendor.instagram_url, 'description', v_vendor.description,
    'trading_hours', v_vendor.trading_hours
  );
  v_proposed := jsonb_build_object(
    'business_name', v_name, 'street_address', v_address, 'contact_email', v_email,
    'phone', v_phone, 'website', v_website, 'facebook_url', v_facebook_url,
    'instagram_url', v_instagram_url, 'description', v_description, 'trading_hours', v_hours
  );
  IF v_proposed = v_base THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'No profile changes were provided.';
  END IF;
  SELECT coalesce(jsonb_agg(proposed.key ORDER BY proposed.key), '[]'::jsonb) INTO v_changed_fields
  FROM jsonb_each(v_proposed) AS proposed JOIN jsonb_each(v_base) AS base ON base.key = proposed.key
  WHERE proposed.value IS DISTINCT FROM base.value;

  INSERT INTO public.listing_change_requests (vendor_id, submitted_by, base_values, proposed_changes, submitter_note)
  VALUES (p_vendor_id, v_user_id, v_base, v_proposed, v_note) RETURNING * INTO v_change;
  INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id)
  VALUES
    ('owner', v_user_id, 'listing_change_submitted', 'listing_change_request', v_change.id::text, v_note,
      jsonb_build_object('vendor_id', p_vendor_id, 'change_status', NULL, 'base_values', v_base),
      jsonb_build_object('vendor_id', p_vendor_id, 'change_status', 'pending', 'changed_fields', v_changed_fields, 'proposed_changes', v_proposed, 'publication_unchanged', v_vendor.is_published), v_correlation_id),
    ('owner', v_user_id, 'owner_public_change_requested', 'vendor', p_vendor_id::text, v_note,
      v_base || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      v_proposed || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status, 'change_request_id', v_change.id), v_correlation_id);
  RETURN QUERY SELECT v_change.id, v_change.change_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_profile_changes(
  p_status TEXT DEFAULT NULL, p_change_request_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  change_request_id UUID, vendor_id UUID, business_name TEXT, suburb_slug TEXT, category_slug TEXT, ownership_status TEXT,
  is_published BOOLEAN, submitted_by UUID, change_status TEXT, base_values JSONB, proposed_changes JSONB, submitter_note TEXT,
  operator_note TEXT, decided_by UUID, decided_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, current_values JSONB
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'rejected', 'withdrawn') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid profile-change status filter.';
  END IF;
  IF p_limit < 1 OR p_limit > 200 OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid pagination values.';
  END IF;
  RETURN QUERY SELECT
    change.id, change.vendor_id, vendor.business_name, vendor.suburb_slug, vendor.category_slug, vendor.ownership_status,
    vendor.is_published, change.submitted_by, change.change_status, change.base_values, change.proposed_changes,
    change.submitter_note, change.operator_note, change.decided_by, change.decided_at, change.created_at, change.updated_at,
    jsonb_build_object('business_name', vendor.business_name, 'street_address', vendor.street_address,
      'contact_email', vendor.contact_email, 'phone', vendor.phone, 'website', vendor.website,
      'facebook_url', vendor.facebook_url, 'instagram_url', vendor.instagram_url,
      'description', vendor.description, 'trading_hours', vendor.trading_hours)
  FROM public.listing_change_requests AS change JOIN public.vendors AS vendor ON vendor.id = change.vendor_id
  WHERE (p_status IS NULL OR change.change_status = p_status)
    AND (p_change_request_id IS NULL OR change.id = p_change_request_id)
  ORDER BY change.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_decide_profile_change(p_change_request_id UUID, p_action TEXT, p_reason TEXT)
RETURNS TABLE (change_request_id UUID, vendor_id UUID, change_status TEXT, is_published BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator(); v_action TEXT := lower(trim(coalesce(p_action, '')));
  v_reason TEXT := nullif(trim(coalesce(p_reason, '')), ''); v_change public.listing_change_requests%ROWTYPE;
  v_vendor public.vendors%ROWTYPE; v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_correlation_id UUID := extensions.uuid_generate_v4(); v_new_status TEXT; v_current_values JSONB; v_comparable_values JSONB;
BEGIN
  IF v_action NOT IN ('approve', 'reject') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid profile-change decision.'; END IF;
  IF v_reason IS NULL OR length(v_reason) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason between 1 and 2,000 characters is required.'; END IF;
  SELECT * INTO v_change FROM public.listing_change_requests AS change WHERE change.id = p_change_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Profile change request not found.'; END IF;
  IF v_change.change_status <> 'pending' THEN RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'This profile change already has a terminal decision.'; END IF;
  SELECT * INTO v_vendor FROM public.vendors AS vendor WHERE vendor.id = v_change.vendor_id FOR UPDATE;
  IF NOT FOUND OR v_vendor.owner_id IS DISTINCT FROM v_change.submitted_by OR NOT v_vendor.is_claimed OR v_vendor.ownership_status NOT IN ('claimed', 'owner_verified') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'The listing owner no longer matches this request.';
  END IF;
  v_current_values := jsonb_build_object('business_name', v_vendor.business_name, 'street_address', v_vendor.street_address,
    'contact_email', v_vendor.contact_email, 'phone', v_vendor.phone, 'website', v_vendor.website,
    'facebook_url', v_vendor.facebook_url, 'instagram_url', v_vendor.instagram_url,
    'description', v_vendor.description, 'trading_hours', v_vendor.trading_hours);
  v_comparable_values := v_current_values;
  IF NOT (v_change.base_values ? 'trading_hours') THEN v_comparable_values := v_comparable_values - 'trading_hours'; END IF;
  IF NOT (v_change.base_values ? 'facebook_url') THEN v_comparable_values := v_comparable_values - 'facebook_url'; END IF;
  IF NOT (v_change.base_values ? 'instagram_url') THEN v_comparable_values := v_comparable_values - 'instagram_url'; END IF;
  IF v_action = 'approve' AND v_comparable_values IS DISTINCT FROM v_change.base_values THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'The public profile changed after this request was submitted. Review a fresh request instead.';
  END IF;
  v_new_status := CASE WHEN v_action = 'approve' THEN 'approved' ELSE 'rejected' END;
  UPDATE public.listing_change_requests AS change SET change_status = v_new_status, operator_note = v_reason, decided_by = v_operator_id, decided_at = v_now, updated_at = v_now WHERE change.id = v_change.id;
  IF v_action = 'approve' THEN
    UPDATE public.vendors AS vendor SET business_name = v_change.proposed_changes ->> 'business_name', street_address = nullif(v_change.proposed_changes ->> 'street_address', ''),
      contact_email = nullif(v_change.proposed_changes ->> 'contact_email', ''), phone = nullif(v_change.proposed_changes ->> 'phone', ''),
      website = nullif(v_change.proposed_changes ->> 'website', ''),
      facebook_url = CASE WHEN v_change.proposed_changes ? 'facebook_url' THEN nullif(v_change.proposed_changes ->> 'facebook_url', '') ELSE vendor.facebook_url END,
      instagram_url = CASE WHEN v_change.proposed_changes ? 'instagram_url' THEN nullif(v_change.proposed_changes ->> 'instagram_url', '') ELSE vendor.instagram_url END,
      description = nullif(v_change.proposed_changes ->> 'description', ''),
      trading_hours = CASE WHEN v_change.proposed_changes ? 'trading_hours' THEN nullif(v_change.proposed_changes ->> 'trading_hours', '') ELSE vendor.trading_hours END,
      updated_at = v_now WHERE vendor.id = v_change.vendor_id;
  END IF;
  INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id)
  VALUES ('operator', v_operator_id, CASE WHEN v_action = 'approve' THEN 'listing_change_approved' ELSE 'listing_change_rejected' END,
    'listing_change_request', v_change.id::text, v_reason, jsonb_build_object('change_status', v_change.change_status, 'vendor_id', v_change.vendor_id),
    jsonb_build_object('change_status', v_new_status, 'vendor_id', v_change.vendor_id, 'publication_unchanged', v_vendor.is_published), v_correlation_id);
  IF v_action = 'approve' THEN
    INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id)
    VALUES ('operator', v_operator_id, 'listing_profile_updated', 'vendor', v_change.vendor_id::text, v_reason,
      v_current_values || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      v_change.proposed_changes || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status), v_correlation_id);
  ELSE
    INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id)
    VALUES ('operator', v_operator_id, 'owner_public_fields_rejected', 'vendor', v_change.vendor_id::text, v_reason,
      v_current_values || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status),
      v_current_values || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status, 'rejected_change_request_id', v_change.id), v_correlation_id);
  END IF;
  RETURN QUERY SELECT decided.id, decided.vendor_id, decided.change_status, vendor.is_published
  FROM public.listing_change_requests AS decided JOIN public.vendors AS vendor ON vendor.id = decided.vendor_id WHERE decided.id = v_change.id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_vendor_profile_change_with_channels(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_current_owner_vendors_with_hours() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_vendor_profile_change_with_channels(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
