-- Give the solo operator a narrow, fail-closed recovery path for an atomic
-- official-website application. It never affects claimed listings and refuses
-- to overwrite any value changed after the enrichment event.

CREATE OR REPLACE FUNCTION private.website_enrichment_value_matches(
  p_vendor public.vendors,
  p_field TEXT,
  p_expected JSONB
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT CASE p_field
    WHEN 'contact_email' THEN to_jsonb(p_vendor.contact_email) IS NOT DISTINCT FROM p_expected -> 'contact_email'
    WHEN 'phone' THEN to_jsonb(p_vendor.phone) IS NOT DISTINCT FROM p_expected -> 'phone'
    WHEN 'street_address' THEN to_jsonb(p_vendor.street_address) IS NOT DISTINCT FROM p_expected -> 'street_address'
    WHEN 'trading_hours' THEN to_jsonb(p_vendor.trading_hours) IS NOT DISTINCT FROM p_expected -> 'trading_hours'
    WHEN 'description' THEN to_jsonb(p_vendor.description) IS NOT DISTINCT FROM p_expected -> 'description'
    WHEN 'booking_url' THEN to_jsonb(p_vendor.booking_url) IS NOT DISTINCT FROM p_expected -> 'booking_url'
    WHEN 'menu_url' THEN to_jsonb(p_vendor.menu_url) IS NOT DISTINCT FROM p_expected -> 'menu_url'
    WHEN 'service' THEN to_jsonb(p_vendor.services) IS NOT DISTINCT FROM p_expected -> 'services'
    WHEN 'area_served' THEN to_jsonb(p_vendor.area_served) IS NOT DISTINCT FROM p_expected -> 'area_served'
    WHEN 'accessibility' THEN to_jsonb(p_vendor.accessibility_features) IS NOT DISTINCT FROM p_expected -> 'accessibility_features'
    ELSE false
  END;
$$;

REVOKE ALL ON FUNCTION private.website_enrichment_value_matches(public.vendors, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.ops_list_rollbackable_website_enrichments(
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE(
  enrichment_run_id UUID,
  vendor_id UUID,
  business_name TEXT,
  applied_fields TEXT[],
  applied_at TIMESTAMPTZ,
  rollback_available BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_limit NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Limit must be between 1 and 50.';
  END IF;

  RETURN QUERY
  SELECT run.id, vendor.id, vendor.business_name,
    ARRAY(SELECT jsonb_array_elements_text(event.after_data -> 'applied_fields')),
    event.created_at,
    vendor.is_claimed IS FALSE
      AND vendor.ownership_status = 'unclaimed'
      AND EXISTS (
        SELECT 1 FROM public.listing_field_evidence AS evidence
        WHERE evidence.vendor_id = vendor.id
          AND evidence.enrichment_run_id = run.id
          AND evidence.application_state = 'applied'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(event.after_data -> 'applied_fields') AS field(value)
        WHERE NOT private.website_enrichment_value_matches(
          vendor, field.value, event.after_data -> 'public_values'
        )
      ) AS rollback_available
  FROM public.audit_events AS event
  JOIN public.catalogue_enrichment_runs AS run ON run.correlation_id = event.correlation_id
  JOIN public.vendors AS vendor ON vendor.id = event.entity_id::UUID
  WHERE event.action = 'official_website_factual_enrichment'
    AND event.entity_type = 'vendor'
    AND event.after_data ->> 'rollback_guard' = 'only_if_current_values_match'
    AND NOT EXISTS (
      SELECT 1 FROM public.audit_events AS rollback
      WHERE rollback.action = 'official_website_factual_enrichment_rolled_back'
        AND rollback.after_data ->> 'enrichment_run_id' = run.id::TEXT
        AND rollback.entity_id = vendor.id::TEXT
    )
  ORDER BY event.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_rollback_official_website_enrichment(
  p_enrichment_run_id UUID,
  p_vendor_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_vendor public.vendors%ROWTYPE;
  v_event public.audit_events%ROWTYPE;
  v_fields TEXT[];
  v_before JSONB;
  v_after JSONB;
  v_correlation UUID := extensions.uuid_generate_v4();
BEGIN
  IF length(trim(coalesce(p_reason, ''))) NOT BETWEEN 8 AND 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A specific rollback reason of 8 to 2000 characters is required.';
  END IF;

  SELECT event.* INTO v_event
  FROM public.audit_events AS event
  JOIN public.catalogue_enrichment_runs AS run
    ON run.correlation_id = event.correlation_id
  WHERE run.id = p_enrichment_run_id
    AND event.action = 'official_website_factual_enrichment'
    AND event.entity_type = 'vendor'
    AND event.entity_id = p_vendor_id::TEXT
    AND event.after_data ->> 'rollback_guard' = 'only_if_current_values_match'
  ORDER BY event.created_at DESC
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'No atomic enrichment application was found for this listing and run.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.audit_events AS rollback
    WHERE rollback.action = 'official_website_factual_enrichment_rolled_back'
      AND rollback.after_data ->> 'enrichment_run_id' = p_enrichment_run_id::TEXT
      AND rollback.entity_id = p_vendor_id::TEXT
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'This enrichment application was already rolled back.';
  END IF;

  SELECT * INTO v_vendor FROM public.vendors WHERE id = p_vendor_id FOR UPDATE;
  IF NOT FOUND OR v_vendor.is_claimed IS TRUE OR v_vendor.ownership_status <> 'unclaimed' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Rollback stopped because the listing is claimed or unavailable.';
  END IF;

  v_fields := ARRAY(SELECT jsonb_array_elements_text(v_event.after_data -> 'applied_fields'));
  IF cardinality(v_fields) = 0 OR EXISTS (
    SELECT 1 FROM unnest(v_fields) AS fields(field_name)
    WHERE NOT private.website_enrichment_value_matches(
      v_vendor, fields.field_name, v_event.after_data -> 'public_values'
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Rollback stopped because at least one enriched value has since changed.';
  END IF;

  v_before := v_event.before_data -> 'public_values';
  v_after := v_event.after_data -> 'public_values';
  UPDATE public.vendors AS vendor SET
    contact_email = CASE WHEN 'contact_email' = ANY(v_fields) THEN v_before ->> 'contact_email' ELSE vendor.contact_email END,
    phone = CASE WHEN 'phone' = ANY(v_fields) THEN v_before ->> 'phone' ELSE vendor.phone END,
    street_address = CASE WHEN 'street_address' = ANY(v_fields) THEN v_before ->> 'street_address' ELSE vendor.street_address END,
    trading_hours = CASE WHEN 'trading_hours' = ANY(v_fields) THEN v_before ->> 'trading_hours' ELSE vendor.trading_hours END,
    description = CASE WHEN 'description' = ANY(v_fields) THEN v_before ->> 'description' ELSE vendor.description END,
    booking_url = CASE WHEN 'booking_url' = ANY(v_fields) THEN v_before ->> 'booking_url' ELSE vendor.booking_url END,
    menu_url = CASE WHEN 'menu_url' = ANY(v_fields) THEN v_before ->> 'menu_url' ELSE vendor.menu_url END,
    services = CASE WHEN 'service' = ANY(v_fields) THEN ARRAY(SELECT jsonb_array_elements_text(v_before -> 'services')) ELSE vendor.services END,
    area_served = CASE WHEN 'area_served' = ANY(v_fields) THEN ARRAY(SELECT jsonb_array_elements_text(v_before -> 'area_served')) ELSE vendor.area_served END,
    accessibility_features = CASE WHEN 'accessibility' = ANY(v_fields) THEN ARRAY(SELECT jsonb_array_elements_text(v_before -> 'accessibility_features')) ELSE vendor.accessibility_features END,
    source_checked_on = (
      SELECT max(evidence.applied_at)::DATE
      FROM public.listing_field_evidence AS evidence
      WHERE evidence.vendor_id = p_vendor_id
        AND evidence.enrichment_run_id IS DISTINCT FROM p_enrichment_run_id
        AND evidence.source_key = 'official_business_site'
        AND evidence.application_state = 'applied'
        AND evidence.evidence_state = 'active'
    ),
    updated_at = timezone('utc'::TEXT, now())
  WHERE vendor.id = p_vendor_id;

  UPDATE public.listing_field_evidence
  SET evidence_state = 'superseded', application_state = 'superseded', applied_at = NULL
  WHERE vendor_id = p_vendor_id AND enrichment_run_id = p_enrichment_run_id
    AND application_state = 'applied';

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'operator', v_operator_id, 'official_website_factual_enrichment_rolled_back',
    'vendor', p_vendor_id::TEXT, trim(p_reason),
    jsonb_build_object('public_values', v_after, 'enrichment_run_id', p_enrichment_run_id),
    jsonb_build_object(
      'public_values', v_before, 'enrichment_run_id', p_enrichment_run_id,
      'rolled_back_fields', to_jsonb(v_fields), 'ownership_unchanged', true,
      'publication_unchanged', true, 'evidence_retained', true
    ),
    v_correlation
  );
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_rollbackable_website_enrichments(INTEGER)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_rollback_official_website_enrichment(UUID, UUID, TEXT)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_list_rollbackable_website_enrichments(INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_rollback_official_website_enrichment(UUID, UUID, TEXT)
  TO authenticated;

COMMENT ON FUNCTION public.ops_rollback_official_website_enrichment(UUID, UUID, TEXT) IS
  'Operator-only guarded rollback. Refuses claimed or subsequently edited listings and preserves immutable evidence.';
