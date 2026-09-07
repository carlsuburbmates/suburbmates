-- Row-level acceptance of the second explicit-HTML cohort found two URLs that
-- are not genuine booking destinations, one HTML-entity encoded destination,
-- one theme placeholder email and generic navigation/process headings. Correct
-- only those exact, unchanged observations. Claimed, ownership and publication
-- state remain unchanged and every affected vendor receives an immutable audit.

DO $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_changed INTEGER;
BEGIN
  FOR v_vendor IN
    SELECT * FROM public.vendors
    WHERE id IN (
      'ffdf0b7b-3200-473b-86b1-23b111b8726e'::UUID,
      'c2a08468-a06e-4394-bc52-2c15e2ceb82b'::UUID
    )
    FOR UPDATE
  LOOP
    IF v_vendor.is_claimed IS TRUE OR v_vendor.ownership_status <> 'unclaimed' THEN
      RAISE EXCEPTION 'Invalid booking correction stopped because % is no longer unclaimed.', v_vendor.business_name;
    END IF;

    IF (v_vendor.id = 'ffdf0b7b-3200-473b-86b1-23b111b8726e'::UUID
        AND v_vendor.booking_url IS DISTINCT FROM 'https://luxbrushpainting.com.au/')
       OR (v_vendor.id = 'c2a08468-a06e-4394-bc52-2c15e2ceb82b'::UUID
        AND v_vendor.booking_url IS DISTINCT FROM 'https://vicpainter.com/my-account/orders/') THEN
      RAISE EXCEPTION 'Invalid booking correction stopped because % changed after acceptance.', v_vendor.business_name;
    END IF;

    UPDATE public.vendors
    SET booking_url = NULL,
        source_checked_on = CASE WHEN v_vendor.id = 'ffdf0b7b-3200-473b-86b1-23b111b8726e'::UUID THEN (
          SELECT max(e.applied_at)::DATE
          FROM public.listing_field_evidence e
          WHERE e.vendor_id = v_vendor.id
            AND e.id <> 'dcc1c57a-c8a2-482e-9b1f-5886be3ca02d'::UUID
            AND e.application_state = 'applied'
            AND e.evidence_state = 'active'
        ) ELSE v_vendor.source_checked_on END,
        updated_at = timezone('utc'::TEXT, now())
    WHERE id = v_vendor.id;

    UPDATE public.listing_field_evidence
    SET evidence_state = 'rejected', application_state = 'superseded', applied_at = NULL
    WHERE id = CASE
      WHEN v_vendor.id = 'ffdf0b7b-3200-473b-86b1-23b111b8726e'::UUID THEN 'dcc1c57a-c8a2-482e-9b1f-5886be3ca02d'::UUID
      ELSE 'c4025d70-b12e-40cf-9d6a-423d4d555e57'::UUID
    END
      AND application_state = 'applied'
      AND evidence_state = 'active';
    GET DIAGNOSTICS v_changed = ROW_COUNT;
    IF v_changed <> 1 THEN
      RAISE EXCEPTION 'Invalid booking correction expected one evidence row for %, found %.', v_vendor.business_name, v_changed;
    END IF;

    INSERT INTO public.audit_events (
      actor_type, action, entity_type, entity_id, reason,
      before_data, after_data, correlation_id
    ) VALUES (
      'service', 'official_website_enrichment_acceptance_rejected', 'vendor', v_vendor.id::TEXT,
      'Production acceptance rejected a URL that was not a genuine customer booking destination.',
      jsonb_build_object('booking_url', v_vendor.booking_url),
      jsonb_build_object(
        'booking_url', NULL, 'evidence_retained_as_rejected', true,
        'ownership_unchanged', true, 'publication_unchanged', true
      ),
      extensions.uuid_generate_v4()
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  v_vendor public.vendors%ROWTYPE;
  v_changed INTEGER;
BEGIN
  SELECT * INTO v_vendor FROM public.vendors
  WHERE id = '10180d8e-8da7-40b2-bd21-25d6f8c7c4cd'::UUID
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  IF v_vendor.is_claimed IS TRUE OR v_vendor.ownership_status <> 'unclaimed'
     OR v_vendor.booking_url IS DISTINCT FROM 'https://www.quandoo.com.au/place/thai-station-restaurant-91086/widget?aid=146&amp;utm_source=quandoo-partner&amp;utm_medium=widget-link' THEN
    RAISE EXCEPTION 'Encoded booking correction stopped because Thai Station changed after acceptance.';
  END IF;

  UPDATE public.vendors
  SET booking_url = 'https://www.quandoo.com.au/place/thai-station-restaurant-91086/widget?aid=146&utm_source=quandoo-partner&utm_medium=widget-link',
      updated_at = timezone('utc'::TEXT, now())
  WHERE id = v_vendor.id;

  UPDATE public.listing_field_evidence
  SET value_text = 'https://www.quandoo.com.au/place/thai-station-restaurant-91086/widget?aid=146&utm_source=quandoo-partner&utm_medium=widget-link'
  WHERE id = '0e117f4d-1cf4-44b8-b70f-4f561ef3916d'::UUID
    AND value_text = 'https://www.quandoo.com.au/place/thai-station-restaurant-91086/widget?aid=146&amp;utm_source=quandoo-partner&amp;utm_medium=widget-link'
    AND application_state = 'applied';
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed <> 1 THEN
    RAISE EXCEPTION 'Encoded booking correction expected one evidence row, found %.', v_changed;
  END IF;

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'service', 'official_website_enrichment_acceptance_corrected', 'vendor', v_vendor.id::TEXT,
    'Production acceptance decoded an HTML entity in the exact source-reported booking destination.',
    jsonb_build_object('booking_url', v_vendor.booking_url),
    jsonb_build_object(
      'booking_url', 'https://www.quandoo.com.au/place/thai-station-restaurant-91086/widget?aid=146&utm_source=quandoo-partner&utm_medium=widget-link',
      'ownership_unchanged', true, 'publication_unchanged', true
    ),
    extensions.uuid_generate_v4()
  );
END;
$$;

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH rejected AS (
    UPDATE public.listing_field_evidence e
    SET evidence_state = 'rejected', application_state = 'superseded', applied_at = NULL
    WHERE e.vendor_id = 'c2a08468-a06e-4394-bc52-2c15e2ceb82b'::UUID
      AND e.observed_at = '2026-09-07T17:07:43.368Z'::TIMESTAMPTZ
      AND e.application_state IN ('observed', 'conflict')
      AND (
        (e.field_name = 'contact_email' AND lower(e.value_text) = 'porto@portotheme.com')
        OR (e.field_name = 'service' AND e.value_text IN (
          'Contact Us', 'House Painting Quote Free', 'I. Our Complete Painting Services',
          'III. Our Painting Process', 'IV. Serving Melbourne Homes & Businesses',
          'Quick Information', 'V. Get a Free Painting Quote Today', 'Your Account'
        ))
      )
    RETURNING e.id
  ) SELECT count(*)::INTEGER INTO v_count FROM rejected;
  IF v_count <> 9 THEN
    RAISE EXCEPTION 'Noisy evidence correction expected nine rows, found %.', v_count;
  END IF;

  UPDATE public.catalogue_field_conflicts
  SET conflict_status = 'ignored',
      resolution_note = 'Rejected during production acceptance as a third-party theme placeholder email.',
      resolved_at = timezone('utc'::TEXT, now())
  WHERE incoming_evidence_id = 'aef62273-c6e2-47a4-b36a-6f64a32d2d5c'::UUID
    AND conflict_status = 'open';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Theme placeholder correction expected one open conflict, found %.', v_count;
  END IF;

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason, after_data, correlation_id
  ) VALUES (
    'service', 'official_website_evidence_quality_rejected', 'vendor',
    'c2a08468-a06e-4394-bc52-2c15e2ceb82b',
    'Production acceptance rejected one theme placeholder email and eight navigation, process or marketing headings; no additional public value changed.',
    jsonb_build_object(
      'rejected_evidence_count', 9, 'public_values_unchanged', true,
      'ownership_unchanged', true, 'publication_unchanged', true
    ),
    extensions.uuid_generate_v4()
  );
END;
$$;
