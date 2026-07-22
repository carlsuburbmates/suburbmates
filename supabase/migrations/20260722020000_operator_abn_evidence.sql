-- Operator-run ABN evidence. This is supporting evidence only: it never
-- changes publication, ownership, ranking, tier, payment or claim state.

CREATE OR REPLACE FUNCTION public.ops_record_abn_check(
  p_vendor_id UUID,
  p_submitted_abn TEXT,
  p_abn_status TEXT,
  p_entity_status TEXT DEFAULT NULL,
  p_official_names JSONB DEFAULT '[]'::jsonb,
  p_checked_at TIMESTAMPTZ DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_abn TEXT := regexp_replace(trim(coalesce(p_submitted_abn, '')), '[[:space:]]', '', 'g');
  v_status TEXT := lower(trim(coalesce(p_abn_status, '')));
  v_entity_status TEXT := nullif(trim(coalesce(p_entity_status, '')), '');
  v_error TEXT := nullif(trim(coalesce(p_error_message, '')), '');
  v_checked_at TIMESTAMPTZ := coalesce(p_checked_at, timezone('utc'::text, now()));
  v_evidence_status TEXT;
  v_evidence_id UUID;
  v_vendor public.vendors%ROWTYPE;
BEGIN
  IF p_vendor_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.vendors WHERE id = p_vendor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose an existing listing.';
  END IF;
  IF v_abn !~ '^[0-9]{11}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ABN must contain 11 digits.';
  END IF;
  IF v_status NOT IN ('active', 'inactive', 'invalid', 'not_found', 'provider_failure') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ABN check status is invalid.';
  END IF;
  IF jsonb_typeof(coalesce(p_official_names, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ABN names must be a list.';
  END IF;
  IF length(coalesce(v_error, '')) > 500 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'ABN error is too long.';
  END IF;

  SELECT * INTO v_vendor FROM public.vendors WHERE id = p_vendor_id FOR UPDATE;
  v_evidence_status := CASE v_status WHEN 'active' THEN 'passed' WHEN 'provider_failure' THEN 'failed' ELSE 'warning' END;

  INSERT INTO public.listing_evidence (
    vendor_id, evidence_type, status, summary, evidence_data, checked_at
  ) VALUES (
    p_vendor_id,
    'abn_lookup',
    v_evidence_status,
    CASE v_status
      WHEN 'active' THEN 'ABN is active according to ABN Lookup.'
      WHEN 'inactive' THEN 'ABN Lookup returned an inactive ABN.'
      WHEN 'invalid' THEN 'The supplied ABN did not pass validation.'
      WHEN 'not_found' THEN 'ABN Lookup did not find this ABN.'
      ELSE 'ABN Lookup could not complete this check.'
    END,
    jsonb_build_object(
      'submitted_abn', v_abn,
      'abn_status', v_status,
      'entity_status', v_entity_status,
      'official_names', coalesce(p_official_names, '[]'::jsonb),
      'provider', 'ABN Lookup',
      'error_message', v_error
    ),
    v_checked_at
  ) RETURNING id INTO v_evidence_id;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data
  ) VALUES (
    'operator', v_operator_id, 'abn_check_recorded', 'vendor', p_vendor_id::text,
    'Operator-run ABN evidence check.',
    jsonb_build_object('listing_status', v_vendor.listing_status, 'is_published', v_vendor.is_published, 'ownership_status', v_vendor.ownership_status, 'tier', v_vendor.tier),
    jsonb_build_object('listing_status', v_vendor.listing_status, 'is_published', v_vendor.is_published, 'ownership_status', v_vendor.ownership_status, 'tier', v_vendor.tier, 'abn_status', v_status, 'evidence_id', v_evidence_id)
  );

  RETURN v_evidence_id;
END;
$$;

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
  ) AS abn_checked
FROM public.vendors AS vendor
WHERE vendor.is_published = true;

REVOKE ALL ON FUNCTION public.ops_record_abn_check(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_record_abn_check(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT) TO authenticated;
REVOKE ALL ON TABLE public.published_vendors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.published_vendors TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.ops_record_abn_check(UUID, TEXT, TEXT, TEXT, JSONB, TIMESTAMPTZ, TEXT) IS
  'Operator-only ABN Lookup evidence recorder. Preserves every listing lifecycle, ownership, payment and tier field.';
COMMENT ON VIEW public.published_vendors IS
  'Safe public directory projection. ABN checked is a current active-evidence signal only; it never exposes the ABN or a verified-owner claim.';
