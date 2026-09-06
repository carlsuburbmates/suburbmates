-- Commit one website-enrichment result as a single database transaction.
-- The service may inspect a website outside the database, but evidence,
-- conflicts, public empty-field fills and the immutable audit event must
-- either all succeed or all roll back.

CREATE OR REPLACE FUNCTION public.apply_official_website_enrichment_atomic(
  p_vendor_id UUID,
  p_enrichment_run_id UUID,
  p_evidence JSONB,
  p_updates JSONB,
  p_checked_at TIMESTAMPTZ,
  p_correlation_id UUID,
  p_audit_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(applied_count INTEGER, conflict_count INTEGER, evidence_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_run public.catalogue_enrichment_runs%ROWTYPE;
  v_item JSONB;
  v_evidence_id UUID;
  v_field TEXT;
  v_current TEXT;
  v_before JSONB;
  v_after JSONB;
  v_applied INTEGER := 0;
  v_conflicts INTEGER := 0;
  v_evidence INTEGER := 0;
  v_allowed_fields CONSTANT TEXT[] := ARRAY[
    'contact_email', 'phone', 'street_address', 'trading_hours',
    'service', 'booking_url', 'menu_url', 'area_served',
    'accessibility', 'description'
  ];
  v_allowed_updates CONSTANT TEXT[] := ARRAY[
    'contact_email', 'phone', 'street_address', 'trading_hours',
    'services', 'booking_url', 'menu_url', 'area_served',
    'accessibility_features', 'description'
  ];
BEGIN
  IF jsonb_typeof(coalesce(p_evidence, '[]'::JSONB)) <> 'array'
     OR jsonb_typeof(coalesce(p_updates, '{}'::JSONB)) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Website enrichment payload is malformed.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_object_keys(coalesce(p_updates, '{}'::JSONB)) AS key
    WHERE NOT (key = ANY(v_allowed_updates))
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Website enrichment contains an unsupported public field.';
  END IF;

  SELECT * INTO v_run FROM public.catalogue_enrichment_runs
  WHERE id = p_enrichment_run_id FOR UPDATE;
  IF NOT FOUND OR v_run.source_key <> 'official_business_site'
     OR v_run.source_contract_version <> 'official-business-site-application-v3'
     OR v_run.status <> 'processing' OR v_run.correlation_id <> p_correlation_id THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Website enrichment run is not eligible for application.';
  END IF;

  SELECT * INTO v_vendor FROM public.vendors WHERE id = p_vendor_id FOR UPDATE;
  IF NOT FOUND OR v_vendor.is_published IS NOT TRUE OR v_vendor.is_claimed IS TRUE
     OR v_vendor.ownership_status <> 'unclaimed' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Only an unchanged published unclaimed listing may be enriched.';
  END IF;

  -- Public facts may fill gaps, never overwrite a value that appeared since
  -- the service planned this transaction.
  IF (p_updates ? 'contact_email' AND nullif(trim(coalesce(v_vendor.contact_email, '')), '') IS NOT NULL)
     OR (p_updates ? 'phone' AND nullif(trim(coalesce(v_vendor.phone, '')), '') IS NOT NULL)
     OR (p_updates ? 'street_address' AND nullif(trim(coalesce(v_vendor.street_address, '')), '') IS NOT NULL)
     OR (p_updates ? 'trading_hours' AND nullif(trim(coalesce(v_vendor.trading_hours, '')), '') IS NOT NULL)
     OR (p_updates ? 'description' AND nullif(trim(coalesce(v_vendor.description, '')), '') IS NOT NULL)
     OR (p_updates ? 'booking_url' AND nullif(trim(coalesce(v_vendor.booking_url, '')), '') IS NOT NULL)
     OR (p_updates ? 'menu_url' AND nullif(trim(coalesce(v_vendor.menu_url, '')), '') IS NOT NULL)
     OR (p_updates ? 'services' AND cardinality(v_vendor.services) > 0)
     OR (p_updates ? 'area_served' AND cardinality(v_vendor.area_served) > 0)
     OR (p_updates ? 'accessibility_features' AND cardinality(v_vendor.accessibility_features) > 0) THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Listing changed before enrichment could be committed; no enrichment was applied.';
  END IF;

  v_before := jsonb_build_object(
    'contact_email', v_vendor.contact_email, 'phone', v_vendor.phone,
    'street_address', v_vendor.street_address, 'trading_hours', v_vendor.trading_hours,
    'description', v_vendor.description, 'services', to_jsonb(v_vendor.services),
    'booking_url', v_vendor.booking_url, 'menu_url', v_vendor.menu_url,
    'area_served', to_jsonb(v_vendor.area_served),
    'accessibility_features', to_jsonb(v_vendor.accessibility_features)
  );

  FOR v_item IN SELECT value FROM jsonb_array_elements(coalesce(p_evidence, '[]'::JSONB)) LOOP
    v_field := v_item ->> 'field_name';
    IF NOT (v_field = ANY(v_allowed_fields))
       OR length(trim(coalesce(v_item ->> 'value_text', ''))) NOT BETWEEN 1 AND 5000
       OR coalesce(v_item ->> 'source_key', '') <> 'official_business_site'
       OR nullif(trim(coalesce(v_item ->> 'source_record_key', '')), '') IS NULL
       OR coalesce(v_item ->> 'application_state', '') NOT IN ('observed', 'applied', 'conflict')
       OR coalesce(v_item ->> 'evidence_state', '') NOT IN ('active', 'conflict')
       OR coalesce((v_item ->> 'enrichment_run_id')::UUID, p_enrichment_run_id) <> p_enrichment_run_id THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Website enrichment evidence is invalid.';
    END IF;

    INSERT INTO public.listing_field_evidence (
      vendor_id, field_name, value_text, source_key, source_record_key,
      source_url, observed_at, freshness_due_at, confidence, evidence_state,
      application_state, applied_at, enrichment_run_id
    ) VALUES (
      p_vendor_id, v_field, v_item ->> 'value_text', 'official_business_site',
      v_item ->> 'source_record_key', v_item ->> 'source_url',
      (v_item ->> 'observed_at')::TIMESTAMPTZ,
      nullif(v_item ->> 'freshness_due_at', '')::TIMESTAMPTZ,
      (v_item ->> 'confidence')::SMALLINT, v_item ->> 'evidence_state',
      v_item ->> 'application_state', nullif(v_item ->> 'applied_at', '')::TIMESTAMPTZ,
      p_enrichment_run_id
    )
    ON CONFLICT (vendor_id, field_name, source_key, source_record_key, value_text, observed_at)
    DO UPDATE SET source_url = EXCLUDED.source_url,
      freshness_due_at = EXCLUDED.freshness_due_at,
      confidence = EXCLUDED.confidence,
      evidence_state = EXCLUDED.evidence_state,
      application_state = EXCLUDED.application_state,
      applied_at = EXCLUDED.applied_at,
      enrichment_run_id = EXCLUDED.enrichment_run_id
    RETURNING id INTO v_evidence_id;
    v_evidence := v_evidence + 1;

    IF (v_item ->> 'application_state') = 'conflict' THEN
      v_current := CASE v_field
        WHEN 'service' THEN array_to_string(v_vendor.services, ', ')
        WHEN 'area_served' THEN array_to_string(v_vendor.area_served, ', ')
        WHEN 'accessibility' THEN array_to_string(v_vendor.accessibility_features, ', ')
        ELSE to_jsonb(v_vendor) ->> v_field
      END;
      INSERT INTO public.catalogue_field_conflicts
        (vendor_id, field_name, incoming_evidence_id, current_value)
      VALUES (p_vendor_id, v_field, v_evidence_id, v_current)
      ON CONFLICT (incoming_evidence_id) DO NOTHING;
      v_conflicts := v_conflicts + 1;
    END IF;
  END LOOP;

  UPDATE public.vendors AS vendor SET
    contact_email = CASE WHEN p_updates ? 'contact_email' THEN nullif(p_updates ->> 'contact_email', '') ELSE vendor.contact_email END,
    phone = CASE WHEN p_updates ? 'phone' THEN nullif(p_updates ->> 'phone', '') ELSE vendor.phone END,
    street_address = CASE WHEN p_updates ? 'street_address' THEN nullif(p_updates ->> 'street_address', '') ELSE vendor.street_address END,
    trading_hours = CASE WHEN p_updates ? 'trading_hours' THEN nullif(p_updates ->> 'trading_hours', '') ELSE vendor.trading_hours END,
    description = CASE WHEN p_updates ? 'description' THEN nullif(p_updates ->> 'description', '') ELSE vendor.description END,
    booking_url = CASE WHEN p_updates ? 'booking_url' THEN nullif(p_updates ->> 'booking_url', '') ELSE vendor.booking_url END,
    menu_url = CASE WHEN p_updates ? 'menu_url' THEN nullif(p_updates ->> 'menu_url', '') ELSE vendor.menu_url END,
    services = CASE WHEN p_updates ? 'services' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates -> 'services')) ELSE vendor.services END,
    area_served = CASE WHEN p_updates ? 'area_served' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates -> 'area_served')) ELSE vendor.area_served END,
    accessibility_features = CASE WHEN p_updates ? 'accessibility_features' THEN ARRAY(SELECT jsonb_array_elements_text(p_updates -> 'accessibility_features')) ELSE vendor.accessibility_features END,
    source_checked_on = p_checked_at::DATE,
    updated_at = p_checked_at
  WHERE vendor.id = p_vendor_id;

  GET DIAGNOSTICS v_applied = ROW_COUNT;
  v_applied := (SELECT count(*) FROM jsonb_object_keys(p_updates));
  SELECT jsonb_build_object(
    'contact_email', v.contact_email, 'phone', v.phone,
    'street_address', v.street_address, 'trading_hours', v.trading_hours,
    'description', v.description, 'services', to_jsonb(v.services),
    'booking_url', v.booking_url, 'menu_url', v.menu_url,
    'area_served', to_jsonb(v.area_served),
    'accessibility_features', to_jsonb(v.accessibility_features)
  ) INTO v_after
  FROM public.vendors AS v WHERE v.id = p_vendor_id;

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'service', 'official_website_factual_enrichment', 'vendor', p_vendor_id::TEXT,
    'Terms-aware, robots-aware structured factual inspection applied only empty unclaimed fields.',
    jsonb_build_object('public_values', v_before),
    jsonb_build_object(
      'public_values', v_after,
      'applied_fields', (SELECT coalesce(jsonb_agg(key), '[]'::JSONB) FROM jsonb_object_keys(p_updates) AS key),
      'conflict_count', v_conflicts,
      'owner_control_preserved', true,
      'publication_unchanged', true,
      'rollback_guard', 'only_if_current_values_match'
    ) || coalesce(p_audit_metadata, '{}'::JSONB),
    p_correlation_id
  );

  RETURN QUERY SELECT v_applied, v_conflicts, v_evidence;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_official_website_enrichment_atomic(UUID, UUID, JSONB, JSONB, TIMESTAMPTZ, UUID, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_official_website_enrichment_atomic(UUID, UUID, JSONB, JSONB, TIMESTAMPTZ, UUID, JSONB)
  TO service_role;

COMMENT ON FUNCTION public.apply_official_website_enrichment_atomic(UUID, UUID, JSONB, JSONB, TIMESTAMPTZ, UUID, JSONB) IS
  'Service-only atomic commit boundary for D-021 evidence, conflicts, empty-field application and immutable audit.';
