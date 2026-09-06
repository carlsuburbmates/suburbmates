-- Production row-level acceptance of batch 34026113548 found a missing
-- weekday serialized as an empty comma segment. Remove only the exact values
-- written by that inspection, retain the source evidence as rejected, and
-- preserve ownership and publication state.

DO $$
DECLARE
  v_vendor_id UUID;
  v_correlation UUID := extensions.uuid_generate_v4();
BEGIN
  SELECT id INTO v_vendor_id
  FROM public.vendors
  WHERE slug = 'retropolis'
    AND is_claimed = false
    AND ownership_status = 'unclaimed';

  IF v_vendor_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.vendors
  SET description = CASE
        WHEN description = 'Source-reported hours: Mo 11:00-18:00, , We 11:00-18:00, Th 11:00-18:00, Fr 11:00-18:00, Sa 11:00-18:00, Su 11:00-17:00.' THEN NULL
        ELSE description
      END,
      trading_hours = CASE
        WHEN trading_hours = 'Mo 11:00-18:00, , We 11:00-18:00, Th 11:00-18:00, Fr 11:00-18:00, Sa 11:00-18:00, Su 11:00-17:00' THEN NULL
        ELSE trading_hours
      END,
      updated_at = timezone('utc'::text, now())
  WHERE id = v_vendor_id
    AND (
      description = 'Source-reported hours: Mo 11:00-18:00, , We 11:00-18:00, Th 11:00-18:00, Fr 11:00-18:00, Sa 11:00-18:00, Su 11:00-17:00.'
      OR trading_hours = 'Mo 11:00-18:00, , We 11:00-18:00, Th 11:00-18:00, Fr 11:00-18:00, Sa 11:00-18:00, Su 11:00-17:00'
    );

  UPDATE public.listing_field_evidence
  SET evidence_state = 'rejected',
      application_state = 'superseded',
      applied_at = NULL
  WHERE vendor_id = v_vendor_id
    AND source_key = 'official_business_site'
    AND (
      (field_name = 'description' AND value_text = 'Source-reported hours: Mo 11:00-18:00, , We 11:00-18:00, Th 11:00-18:00, Fr 11:00-18:00, Sa 11:00-18:00, Su 11:00-17:00.')
      OR
      (field_name = 'trading_hours' AND value_text = 'Mo 11:00-18:00, , We 11:00-18:00, Th 11:00-18:00, Fr 11:00-18:00, Sa 11:00-18:00, Su 11:00-17:00')
    );

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason, after_data, correlation_id
  ) VALUES (
    'service',
    'official_website_enrichment_correction',
    'vendor',
    v_vendor_id::text,
    'Production acceptance rejected malformed structured hours containing an empty weekday segment.',
    jsonb_build_object(
      'invalid_website_hours_removed', true,
      'evidence_retained_as_rejected', true,
      'ownership_unchanged', true,
      'publication_unchanged', true
    ),
    v_correlation
  );
END;
$$;
