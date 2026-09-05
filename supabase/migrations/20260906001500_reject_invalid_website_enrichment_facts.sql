-- Correct the exact invalid values exposed by production acceptance of the
-- second D-021 batch. Evidence is retained but rejected; only unchanged,
-- unclaimed values written by that batch are cleared.

DO $$
DECLARE
  v_correlation UUID := extensions.uuid_generate_v4();
BEGIN
  UPDATE public.vendors SET
    description = CASE WHEN description = 'Source-reported hours: , , , , , ,.' THEN NULL ELSE description END,
    trading_hours = CASE WHEN trading_hours = ', , , , , ,' THEN NULL ELSE trading_hours END,
    updated_at = timezone('utc'::text, now())
  WHERE slug = 'fish-on-high' AND is_claimed = false AND ownership_status = 'unclaimed';

  UPDATE public.vendors SET
    description = CASE WHEN description = 'Source-reported hours: Mo 11:30-10:00, Tu 11:30-10:00, We 11:30-10:00, Th 11:30-11:00, Fr 11:30-12:00, Sa 11:30-12:00, Su 12:00-09:00.' THEN NULL ELSE description END,
    trading_hours = CASE WHEN trading_hours = 'Mo 11:30-10:00, Tu 11:30-10:00, We 11:30-10:00, Th 11:30-11:00, Fr 11:30-12:00, Sa 11:30-12:00, Su 12:00-09:00' THEN NULL ELSE trading_hours END,
    updated_at = timezone('utc'::text, now())
  WHERE slug = 'samsam-chicken' AND is_claimed = false AND ownership_status = 'unclaimed';

  UPDATE public.vendors SET
    street_address = CASE WHEN street_address = 'Level 6, 100 William St, Woolloomooloo, NSW, 2011' THEN NULL ELSE street_address END,
    updated_at = timezone('utc'::text, now())
  WHERE slug = 'hungry-jacks' AND is_claimed = false AND ownership_status = 'unclaimed';

  UPDATE public.vendors SET
    contact_email = CASE WHEN contact_email = 'info@storehousethrift.com' THEN NULL ELSE contact_email END,
    description = CASE WHEN description = 'Source-reported hours: Mo 09:00-17:00, Tu 09:00-17:00, We 09:00-17:00, Th 09:00-17:00, Fr 09:00-17:00, ,.' THEN NULL ELSE description END,
    trading_hours = CASE WHEN trading_hours = 'Mo 09:00-17:00, Tu 09:00-17:00, We 09:00-17:00, Th 09:00-17:00, Fr 09:00-17:00, ,' THEN NULL ELSE trading_hours END,
    updated_at = timezone('utc'::text, now())
  WHERE slug = 'tc-thrift' AND is_claimed = false AND ownership_status = 'unclaimed';

  WITH rejected AS (
    UPDATE public.listing_field_evidence AS evidence
    SET evidence_state = 'rejected', application_state = 'superseded', applied_at = NULL
    FROM public.vendors AS vendor
    WHERE evidence.vendor_id = vendor.id AND evidence.source_key = 'official_business_site'
      AND (
        (vendor.slug IN ('tc-thrift', 'ingenico')) OR
        (vendor.slug IN ('fish-on-high', 'samsam-chicken') AND evidence.field_name IN ('description', 'trading_hours')) OR
        (vendor.slug = 'hungry-jacks' AND evidence.field_name = 'street_address')
      )
    RETURNING evidence.id
  )
  UPDATE public.catalogue_field_conflicts AS conflict
  SET conflict_status = 'ignored', resolution_note = 'Rejected by automated enrichment acceptance: website identity or locality mismatch.', resolved_at = timezone('utc'::text, now())
  WHERE conflict.incoming_evidence_id IN (SELECT id FROM rejected) AND conflict.conflict_status = 'open';

  INSERT INTO public.audit_events (actor_type, action, entity_type, entity_id, reason, after_data, correlation_id)
  SELECT 'service', 'official_website_enrichment_correction', 'vendor', vendor.id::text,
    'Production acceptance rejected an identity-, locality-, blank-hours- or ambiguous-hours value from the controlled official-website batch.',
    jsonb_build_object('invalid_website_facts_removed', true, 'evidence_retained_as_rejected', true, 'ownership_unchanged', true, 'publication_unchanged', true),
    v_correlation
  FROM public.vendors AS vendor
  WHERE vendor.slug IN ('fish-on-high', 'samsam-chicken', 'hungry-jacks', 'tc-thrift', 'ingenico');
END;
$$;
