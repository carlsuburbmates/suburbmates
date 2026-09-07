-- Production row-level acceptance of the first linked-fact promotion cohort
-- found two pre-existing parser/planner quality failures: a multi-location
-- page supplied several branch contacts to one Preston listing, and an
-- hours-only summary added no useful profile meaning. Reverse only the exact
-- unchanged generated values, retain the original evidence and add immutable
-- correction events. Valid source-reported hours remain published.

DO $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_run_id UUID;
  v_changed INTEGER;
  v_correlation UUID := extensions.uuid_generate_v4();
BEGIN
  SELECT * INTO v_vendor
  FROM public.vendors
  WHERE id = '85ae2a09-69f5-421d-ae6b-f37e504412a0'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT evidence.enrichment_run_id INTO STRICT v_run_id
  FROM public.listing_field_evidence AS evidence
  WHERE evidence.vendor_id = v_vendor.id
    AND evidence.source_key = 'official_business_site'
    AND evidence.field_name = 'contact_email'
    AND evidence.value_text = 'oakleigh@rentabomb.com.au'
    AND evidence.application_state = 'applied';

  IF v_vendor.is_claimed IS TRUE OR v_vendor.ownership_status <> 'unclaimed'
     OR v_vendor.contact_email IS DISTINCT FROM 'oakleigh@rentabomb.com.au'
     OR v_vendor.phone IS DISTINCT FROM '03 9563 3363' THEN
    RAISE EXCEPTION 'Rent A Bomb correction stopped because the listing changed after acceptance.';
  END IF;

  UPDATE public.vendors
  SET contact_email = NULL, phone = NULL,
      source_checked_on = (
        SELECT max(evidence.applied_at)::DATE
        FROM public.listing_field_evidence AS evidence
        WHERE evidence.vendor_id = v_vendor.id
          AND evidence.enrichment_run_id IS DISTINCT FROM v_run_id
          AND evidence.source_key = 'official_business_site'
          AND evidence.application_state = 'applied'
          AND evidence.evidence_state = 'active'
      ),
      updated_at = timezone('utc'::TEXT, now())
  WHERE id = v_vendor.id;

  UPDATE public.listing_field_evidence
  SET evidence_state = 'superseded', application_state = 'superseded', applied_at = NULL
  WHERE vendor_id = v_vendor.id
    AND enrichment_run_id = v_run_id
    AND application_state = 'applied';
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 11 THEN
    RAISE EXCEPTION 'Rent A Bomb correction expected 11 applied evidence rows, found %.', v_changed;
  END IF;

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'service', 'official_website_enrichment_acceptance_rejected', 'vendor', v_vendor.id::TEXT,
    'Production acceptance rejected ambiguous multi-location phone and email values from one official website page.',
    jsonb_build_object('contact_email', v_vendor.contact_email, 'phone', v_vendor.phone, 'enrichment_run_id', v_run_id),
    jsonb_build_object(
      'contact_email', NULL, 'phone', NULL, 'enrichment_run_id', v_run_id,
      'evidence_retained_as_superseded', true, 'ownership_unchanged', true,
      'publication_unchanged', true
    ),
    v_correlation
  );
END;
$$;

DO $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_run_id UUID;
  v_changed INTEGER;
  v_correlation UUID := extensions.uuid_generate_v4();
BEGIN
  SELECT * INTO v_vendor
  FROM public.vendors
  WHERE id = 'da37e896-da49-43ce-a7d8-b64fa8b12a12'
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT evidence.enrichment_run_id INTO STRICT v_run_id
  FROM public.listing_field_evidence AS evidence
  WHERE evidence.vendor_id = v_vendor.id
    AND evidence.source_key = 'official_business_site'
    AND evidence.field_name = 'description'
    AND evidence.value_text = 'Source-reported hours: Mo-Su 09:00-21:00.'
    AND evidence.application_state = 'applied';

  IF v_vendor.is_claimed IS TRUE OR v_vendor.ownership_status <> 'unclaimed'
     OR v_vendor.description IS DISTINCT FROM 'Source-reported hours: Mo-Su 09:00-21:00.'
     OR v_vendor.trading_hours IS DISTINCT FROM 'Mo-Su 09:00-21:00' THEN
    RAISE EXCEPTION 'Souvlaki GR correction stopped because the listing changed after acceptance.';
  END IF;

  UPDATE public.vendors
  SET description = NULL,
      updated_at = timezone('utc'::TEXT, now())
  WHERE id = v_vendor.id;

  UPDATE public.listing_field_evidence
  SET evidence_state = 'superseded', application_state = 'superseded', applied_at = NULL
  WHERE vendor_id = v_vendor.id
    AND enrichment_run_id = v_run_id
    AND field_name = 'description'
    AND value_text = 'Source-reported hours: Mo-Su 09:00-21:00.'
    AND application_state = 'applied';
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 1 THEN
    RAISE EXCEPTION 'Souvlaki GR correction expected one description evidence row, found %.', v_changed;
  END IF;

  UPDATE public.listing_field_evidence
  SET evidence_state = 'rejected', application_state = 'superseded', applied_at = NULL
  WHERE vendor_id = v_vendor.id
    AND enrichment_run_id = v_run_id
    AND field_name = 'phone'
    AND value_text = '123-456-7890';
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 1 THEN
    RAISE EXCEPTION 'Souvlaki GR correction expected one placeholder-phone evidence row, found %.', v_changed;
  END IF;

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'service', 'official_website_enrichment_acceptance_rejected', 'vendor', v_vendor.id::TEXT,
    'Production acceptance removed an hours-only generated description and rejected an obvious placeholder phone while retaining valid source-reported hours.',
    jsonb_build_object('description', v_vendor.description, 'trading_hours', v_vendor.trading_hours, 'enrichment_run_id', v_run_id),
    jsonb_build_object(
      'description', NULL, 'trading_hours', v_vendor.trading_hours,
      'enrichment_run_id', v_run_id, 'valid_hours_retained', true,
      'evidence_retained', true, 'ownership_unchanged', true,
      'publication_unchanged', true
    ),
    v_correlation
  );
END;
$$;
