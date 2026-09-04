-- D-021 owner-rich-profile foundation. These fields remain review-first: an
-- owner may propose them, but only an operator decision updates a public
-- profile. No website copy, images, HTML or automated publication is added.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS services TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS booking_url TEXT,
  ADD COLUMN IF NOT EXISTS menu_url TEXT,
  ADD COLUMN IF NOT EXISTS area_served TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS accessibility_features TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_services_count_check,
  DROP CONSTRAINT IF EXISTS vendors_area_served_count_check,
  DROP CONSTRAINT IF EXISTS vendors_accessibility_features_count_check,
  DROP CONSTRAINT IF EXISTS vendors_booking_url_check,
  DROP CONSTRAINT IF EXISTS vendors_menu_url_check;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_services_count_check CHECK (cardinality(services) <= 12),
  ADD CONSTRAINT vendors_area_served_count_check CHECK (cardinality(area_served) <= 12),
  ADD CONSTRAINT vendors_accessibility_features_count_check CHECK (cardinality(accessibility_features) <= 12),
  ADD CONSTRAINT vendors_booking_url_check CHECK (booking_url IS NULL OR booking_url ~* '^https://[^[:space:]]+$'),
  ADD CONSTRAINT vendors_menu_url_check CHECK (menu_url IS NULL OR menu_url ~* '^https://[^[:space:]]+$');

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
  vendor.trading_hours,
  vendor.facebook_url,
  vendor.instagram_url,
  vendor.services,
  vendor.booking_url,
  vendor.menu_url,
  vendor.area_served,
  vendor.accessibility_features
FROM public.vendors AS vendor
WHERE vendor.is_published = true;

REVOKE ALL ON TABLE public.published_vendors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.published_vendors TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.list_current_owner_vendors_with_channels();

CREATE FUNCTION public.list_current_owner_vendors_with_channels()
RETURNS TABLE (
  id UUID, slug TEXT, business_name TEXT, suburb_slug TEXT, category_slug TEXT,
  tier TEXT, is_published BOOLEAN, street_address TEXT, contact_email TEXT,
  phone TEXT, website TEXT, description TEXT, trading_hours TEXT,
  facebook_url TEXT, instagram_url TEXT, services TEXT[], booking_url TEXT,
  menu_url TEXT, area_served TEXT[], accessibility_features TEXT[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT vendor.id, vendor.slug, vendor.business_name, vendor.suburb_slug,
    vendor.category_slug, vendor.tier, vendor.is_published,
    vendor.street_address, vendor.contact_email, vendor.phone, vendor.website,
    vendor.description, vendor.trading_hours, vendor.facebook_url, vendor.instagram_url,
    vendor.services, vendor.booking_url, vendor.menu_url, vendor.area_served,
    vendor.accessibility_features
  FROM public.vendors AS vendor
  WHERE vendor.owner_id = auth.uid()
  ORDER BY vendor.business_name, vendor.id;
$$;

DROP FUNCTION IF EXISTS public.submit_vendor_profile_change_with_channels(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT
);

CREATE FUNCTION public.submit_vendor_profile_change_with_channels(
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
  p_services TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_booking_url TEXT DEFAULT NULL,
  p_menu_url TEXT DEFAULT NULL,
  p_area_served TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_accessibility_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_submitter_note TEXT DEFAULT NULL
)
RETURNS TABLE (change_request_id UUID, change_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vendor public.vendors%ROWTYPE; v_change public.listing_change_requests%ROWTYPE;
  v_name TEXT := trim(coalesce(p_business_name, ''));
  v_address TEXT := nullif(trim(coalesce(p_street_address, '')), '');
  v_email TEXT := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_phone TEXT := nullif(trim(coalesce(p_phone, '')), '');
  v_website TEXT := nullif(trim(coalesce(p_website, '')), '');
  v_facebook_url TEXT := nullif(trim(coalesce(p_facebook_url, '')), '');
  v_instagram_url TEXT := nullif(trim(coalesce(p_instagram_url, '')), '');
  v_description TEXT := nullif(trim(coalesce(p_description, '')), '');
  v_hours TEXT := nullif(regexp_replace(trim(coalesce(p_trading_hours, '')), '[[:space:]]+', ' ', 'g'), '');
  v_booking_url TEXT := nullif(trim(coalesce(p_booking_url, '')), '');
  v_menu_url TEXT := nullif(trim(coalesce(p_menu_url, '')), '');
  v_note TEXT := nullif(trim(coalesce(p_submitter_note, '')), '');
  v_services TEXT[]; v_area_served TEXT[]; v_accessibility TEXT[];
  v_base JSONB; v_proposed JSONB; v_changed_fields JSONB;
  v_correlation_id UUID := extensions.uuid_generate_v4();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required.'; END IF;
  SELECT * INTO v_vendor FROM public.vendors AS vendor WHERE vendor.id = p_vendor_id FOR UPDATE;
  IF NOT FOUND OR v_vendor.owner_id IS DISTINCT FROM v_user_id
    OR NOT v_vendor.is_claimed OR v_vendor.ownership_status NOT IN ('claimed', 'owner_verified') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the approved owner can propose changes to this listing.';
  END IF;

  SELECT coalesce(array_agg(item ORDER BY item), ARRAY[]::TEXT[]) INTO v_services
  FROM (SELECT DISTINCT regexp_replace(trim(value), '[[:space:]]+', ' ', 'g') AS item FROM unnest(coalesce(p_services, ARRAY[]::TEXT[])) AS value WHERE length(trim(value)) BETWEEN 2 AND 120) AS cleaned;
  SELECT coalesce(array_agg(item ORDER BY item), ARRAY[]::TEXT[]) INTO v_area_served
  FROM (SELECT DISTINCT regexp_replace(trim(value), '[[:space:]]+', ' ', 'g') AS item FROM unnest(coalesce(p_area_served, ARRAY[]::TEXT[])) AS value WHERE length(trim(value)) BETWEEN 2 AND 120) AS cleaned;
  SELECT coalesce(array_agg(item ORDER BY item), ARRAY[]::TEXT[]) INTO v_accessibility
  FROM (SELECT DISTINCT regexp_replace(trim(value), '[[:space:]]+', ' ', 'g') AS item FROM unnest(coalesce(p_accessibility_features, ARRAY[]::TEXT[])) AS value WHERE length(trim(value)) BETWEEN 2 AND 120) AS cleaned;

  IF length(v_name) NOT BETWEEN 2 AND 200 OR length(coalesce(v_address, '')) > 500
    OR length(coalesce(v_email, '')) > 320 OR length(coalesce(v_phone, '')) > 80
    OR length(coalesce(v_website, '')) > 1000 OR length(coalesce(v_facebook_url, '')) > 1000
    OR length(coalesce(v_instagram_url, '')) > 1000 OR length(coalesce(v_description, '')) > 5000
    OR length(coalesce(v_hours, '')) > 300 OR length(coalesce(v_booking_url, '')) > 1000
    OR length(coalesce(v_menu_url, '')) > 1000 OR length(coalesce(v_note, '')) > 2000
    OR cardinality(v_services) > 12 OR cardinality(v_area_served) > 12 OR cardinality(v_accessibility) > 12 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'One or more profile fields exceed the allowed length.';
  END IF;
  IF v_email IS NOT NULL AND v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a valid contact email address.'; END IF;
  IF v_website IS NOT NULL AND v_website !~* '^https?://[^[:space:]]+$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Website must begin with http:// or https://.'; END IF;
  IF v_facebook_url IS NOT NULL AND v_facebook_url !~* '^https://(www\\.|m\\.)?facebook\\.com/[^[:space:]]+$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Facebook must be a full https://facebook.com profile URL.'; END IF;
  IF v_instagram_url IS NOT NULL AND v_instagram_url !~* '^https://(www\\.)?instagram\\.com/[^[:space:]]+$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Instagram must be a full https://instagram.com profile URL.'; END IF;
  IF v_booking_url IS NOT NULL AND v_booking_url !~* '^https://[^[:space:]]+$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Booking link must begin with https://.'; END IF;
  IF v_menu_url IS NOT NULL AND v_menu_url !~* '^https://[^[:space:]]+$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Menu link must begin with https://.'; END IF;

  v_base := jsonb_build_object('business_name', v_vendor.business_name, 'street_address', v_vendor.street_address, 'contact_email', v_vendor.contact_email, 'phone', v_vendor.phone, 'website', v_vendor.website, 'facebook_url', v_vendor.facebook_url, 'instagram_url', v_vendor.instagram_url, 'description', v_vendor.description, 'trading_hours', v_vendor.trading_hours, 'services', to_jsonb(v_vendor.services), 'booking_url', v_vendor.booking_url, 'menu_url', v_vendor.menu_url, 'area_served', to_jsonb(v_vendor.area_served), 'accessibility_features', to_jsonb(v_vendor.accessibility_features));
  v_proposed := jsonb_build_object('business_name', v_name, 'street_address', v_address, 'contact_email', v_email, 'phone', v_phone, 'website', v_website, 'facebook_url', v_facebook_url, 'instagram_url', v_instagram_url, 'description', v_description, 'trading_hours', v_hours, 'services', to_jsonb(v_services), 'booking_url', v_booking_url, 'menu_url', v_menu_url, 'area_served', to_jsonb(v_area_served), 'accessibility_features', to_jsonb(v_accessibility));
  IF v_proposed = v_base THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'No profile changes were provided.'; END IF;
  SELECT coalesce(jsonb_agg(proposed.key ORDER BY proposed.key), '[]'::jsonb) INTO v_changed_fields FROM jsonb_each(v_proposed) AS proposed JOIN jsonb_each(v_base) AS base ON base.key = proposed.key WHERE proposed.value IS DISTINCT FROM base.value;
  INSERT INTO public.listing_change_requests (vendor_id, submitted_by, base_values, proposed_changes, submitter_note) VALUES (p_vendor_id, v_user_id, v_base, v_proposed, v_note) RETURNING * INTO v_change;
  INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id) VALUES
    ('owner', v_user_id, 'listing_change_submitted', 'listing_change_request', v_change.id::text, v_note, jsonb_build_object('vendor_id', p_vendor_id, 'change_status', NULL, 'base_values', v_base), jsonb_build_object('vendor_id', p_vendor_id, 'change_status', 'pending', 'changed_fields', v_changed_fields, 'proposed_changes', v_proposed, 'publication_unchanged', v_vendor.is_published), v_correlation_id),
    ('owner', v_user_id, 'owner_public_change_requested', 'vendor', p_vendor_id::text, v_note, v_base || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status), v_proposed || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status, 'change_request_id', v_change.id), v_correlation_id);
  RETURN QUERY SELECT v_change.id, v_change.change_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_profile_changes(p_status TEXT DEFAULT NULL, p_change_request_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (change_request_id UUID, vendor_id UUID, business_name TEXT, suburb_slug TEXT, category_slug TEXT, ownership_status TEXT, is_published BOOLEAN, submitted_by UUID, change_status TEXT, base_values JSONB, proposed_changes JSONB, submitter_note TEXT, operator_note TEXT, decided_by UUID, decided_at TIMESTAMPTZ, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ, current_values JSONB)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'rejected', 'withdrawn') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid profile-change status filter.'; END IF;
  IF p_limit < 1 OR p_limit > 200 OR p_offset < 0 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid pagination values.'; END IF;
  RETURN QUERY SELECT change.id, change.vendor_id, vendor.business_name, vendor.suburb_slug, vendor.category_slug, vendor.ownership_status, vendor.is_published, change.submitted_by, change.change_status, change.base_values, change.proposed_changes, change.submitter_note, change.operator_note, change.decided_by, change.decided_at, change.created_at, change.updated_at,
    jsonb_build_object('business_name', vendor.business_name, 'street_address', vendor.street_address, 'contact_email', vendor.contact_email, 'phone', vendor.phone, 'website', vendor.website, 'facebook_url', vendor.facebook_url, 'instagram_url', vendor.instagram_url, 'description', vendor.description, 'trading_hours', vendor.trading_hours, 'services', to_jsonb(vendor.services), 'booking_url', vendor.booking_url, 'menu_url', vendor.menu_url, 'area_served', to_jsonb(vendor.area_served), 'accessibility_features', to_jsonb(vendor.accessibility_features))
  FROM public.listing_change_requests AS change JOIN public.vendors AS vendor ON vendor.id = change.vendor_id
  WHERE (p_status IS NULL OR change.change_status = p_status) AND (p_change_request_id IS NULL OR change.id = p_change_request_id)
  ORDER BY change.created_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_decide_profile_change(p_change_request_id UUID, p_action TEXT, p_reason TEXT)
RETURNS TABLE (change_request_id UUID, vendor_id UUID, change_status TEXT, is_published BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator(); v_action TEXT := lower(trim(coalesce(p_action, ''))); v_reason TEXT := nullif(trim(coalesce(p_reason, '')), '');
  v_change public.listing_change_requests%ROWTYPE; v_vendor public.vendors%ROWTYPE; v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_correlation_id UUID := extensions.uuid_generate_v4(); v_new_status TEXT; v_current_values JSONB; v_comparable_values JSONB;
BEGIN
  IF v_action NOT IN ('approve', 'reject') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid profile-change decision.'; END IF;
  IF v_reason IS NULL OR length(v_reason) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason between 1 and 2,000 characters is required.'; END IF;
  SELECT * INTO v_change FROM public.listing_change_requests AS change WHERE change.id = p_change_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Profile change request not found.'; END IF;
  IF v_change.change_status <> 'pending' THEN RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'This profile change already has a terminal decision.'; END IF;
  SELECT * INTO v_vendor FROM public.vendors AS vendor WHERE vendor.id = v_change.vendor_id FOR UPDATE;
  IF NOT FOUND OR v_vendor.owner_id IS DISTINCT FROM v_change.submitted_by OR NOT v_vendor.is_claimed OR v_vendor.ownership_status NOT IN ('claimed', 'owner_verified') THEN RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'The listing owner no longer matches this request.'; END IF;
  v_current_values := jsonb_build_object('business_name', v_vendor.business_name, 'street_address', v_vendor.street_address, 'contact_email', v_vendor.contact_email, 'phone', v_vendor.phone, 'website', v_vendor.website, 'facebook_url', v_vendor.facebook_url, 'instagram_url', v_vendor.instagram_url, 'description', v_vendor.description, 'trading_hours', v_vendor.trading_hours, 'services', to_jsonb(v_vendor.services), 'booking_url', v_vendor.booking_url, 'menu_url', v_vendor.menu_url, 'area_served', to_jsonb(v_vendor.area_served), 'accessibility_features', to_jsonb(v_vendor.accessibility_features));
  v_comparable_values := v_current_values;
  IF NOT (v_change.base_values ? 'trading_hours') THEN v_comparable_values := v_comparable_values - 'trading_hours'; END IF;
  IF NOT (v_change.base_values ? 'facebook_url') THEN v_comparable_values := v_comparable_values - 'facebook_url'; END IF;
  IF NOT (v_change.base_values ? 'instagram_url') THEN v_comparable_values := v_comparable_values - 'instagram_url'; END IF;
  IF NOT (v_change.base_values ? 'services') THEN v_comparable_values := v_comparable_values - 'services'; END IF;
  IF NOT (v_change.base_values ? 'booking_url') THEN v_comparable_values := v_comparable_values - 'booking_url'; END IF;
  IF NOT (v_change.base_values ? 'menu_url') THEN v_comparable_values := v_comparable_values - 'menu_url'; END IF;
  IF NOT (v_change.base_values ? 'area_served') THEN v_comparable_values := v_comparable_values - 'area_served'; END IF;
  IF NOT (v_change.base_values ? 'accessibility_features') THEN v_comparable_values := v_comparable_values - 'accessibility_features'; END IF;
  IF v_action = 'approve' AND v_comparable_values IS DISTINCT FROM v_change.base_values THEN RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'The public profile changed after this request was submitted. Review a fresh request instead.'; END IF;
  v_new_status := CASE WHEN v_action = 'approve' THEN 'approved' ELSE 'rejected' END;
  UPDATE public.listing_change_requests AS change SET change_status = v_new_status, operator_note = v_reason, decided_by = v_operator_id, decided_at = v_now, updated_at = v_now WHERE change.id = v_change.id;
  IF v_action = 'approve' THEN
    UPDATE public.vendors AS vendor SET business_name = v_change.proposed_changes ->> 'business_name', street_address = nullif(v_change.proposed_changes ->> 'street_address', ''), contact_email = nullif(v_change.proposed_changes ->> 'contact_email', ''), phone = nullif(v_change.proposed_changes ->> 'phone', ''), website = nullif(v_change.proposed_changes ->> 'website', ''), facebook_url = CASE WHEN v_change.proposed_changes ? 'facebook_url' THEN nullif(v_change.proposed_changes ->> 'facebook_url', '') ELSE vendor.facebook_url END, instagram_url = CASE WHEN v_change.proposed_changes ? 'instagram_url' THEN nullif(v_change.proposed_changes ->> 'instagram_url', '') ELSE vendor.instagram_url END, description = nullif(v_change.proposed_changes ->> 'description', ''), trading_hours = CASE WHEN v_change.proposed_changes ? 'trading_hours' THEN nullif(v_change.proposed_changes ->> 'trading_hours', '') ELSE vendor.trading_hours END, services = CASE WHEN v_change.proposed_changes ? 'services' THEN ARRAY(SELECT jsonb_array_elements_text(v_change.proposed_changes -> 'services')) ELSE vendor.services END, booking_url = CASE WHEN v_change.proposed_changes ? 'booking_url' THEN nullif(v_change.proposed_changes ->> 'booking_url', '') ELSE vendor.booking_url END, menu_url = CASE WHEN v_change.proposed_changes ? 'menu_url' THEN nullif(v_change.proposed_changes ->> 'menu_url', '') ELSE vendor.menu_url END, area_served = CASE WHEN v_change.proposed_changes ? 'area_served' THEN ARRAY(SELECT jsonb_array_elements_text(v_change.proposed_changes -> 'area_served')) ELSE vendor.area_served END, accessibility_features = CASE WHEN v_change.proposed_changes ? 'accessibility_features' THEN ARRAY(SELECT jsonb_array_elements_text(v_change.proposed_changes -> 'accessibility_features')) ELSE vendor.accessibility_features END, updated_at = v_now WHERE vendor.id = v_change.vendor_id;
  END IF;
  INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id) VALUES ('operator', v_operator_id, CASE WHEN v_action = 'approve' THEN 'listing_change_approved' ELSE 'listing_change_rejected' END, 'listing_change_request', v_change.id::text, v_reason, jsonb_build_object('change_status', v_change.change_status, 'vendor_id', v_change.vendor_id), jsonb_build_object('change_status', v_new_status, 'vendor_id', v_change.vendor_id, 'publication_unchanged', v_vendor.is_published), v_correlation_id);
  IF v_action = 'approve' THEN INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id) VALUES ('operator', v_operator_id, 'listing_profile_updated', 'vendor', v_change.vendor_id::text, v_reason, v_current_values || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status), v_change.proposed_changes || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status), v_correlation_id); ELSE INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id) VALUES ('operator', v_operator_id, 'owner_public_fields_rejected', 'vendor', v_change.vendor_id::text, v_reason, v_current_values || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status), v_current_values || jsonb_build_object('is_published', v_vendor.is_published, 'listing_status', v_vendor.listing_status, 'rejected_change_request_id', v_change.id), v_correlation_id); END IF;
  RETURN QUERY SELECT decided.id, decided.vendor_id, decided.change_status, vendor.is_published FROM public.listing_change_requests AS decided JOIN public.vendors AS vendor ON vendor.id = decided.vendor_id WHERE decided.id = v_change.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_vendor_source_summaries(p_vendor_id UUID)
RETURNS TABLE (source_key TEXT, source_name TEXT, observed_on DATE, supported_fields TEXT[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT evidence.source_key, source.display_name AS source_name, MAX(evidence.observed_at)::DATE AS observed_on, array_agg(DISTINCT evidence.field_name ORDER BY evidence.field_name) AS supported_fields
  FROM public.published_vendors AS vendor JOIN public.listing_field_evidence AS evidence ON evidence.vendor_id = vendor.id JOIN public.catalogue_sources AS source ON source.source_key = evidence.source_key
  WHERE vendor.id = p_vendor_id AND evidence.evidence_state = 'active' AND evidence.application_state = 'applied' AND source.permitted_use = 'store_and_display'
    AND evidence.field_name IN ('business_name', 'category_slug', 'suburb_slug', 'street_address', 'contact_email', 'phone', 'website', 'facebook_url', 'instagram_url', 'description', 'trading_hours', 'service', 'booking_url', 'menu_url', 'area_served', 'accessibility')
  GROUP BY evidence.source_key, source.display_name ORDER BY MAX(evidence.observed_at) DESC, source.display_name;
$$;

REVOKE ALL ON FUNCTION public.submit_vendor_profile_change_with_channels(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT[], TEXT[], TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_vendor_profile_change_with_channels(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT[], TEXT[], TEXT) TO authenticated;

COMMENT ON COLUMN public.vendors.services IS 'Owner-proposed or approved factual services. Never copied page prose.';
COMMENT ON COLUMN public.vendors.booking_url IS 'Owner-approved direct booking link, reviewed before publication.';
COMMENT ON COLUMN public.vendors.menu_url IS 'Owner-approved direct menu link, reviewed before publication.';
