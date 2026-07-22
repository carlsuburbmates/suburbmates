-- The Stage 1 and 2 functions return a column named message_type. Using the
-- column-list form of ON CONFLICT makes that output variable ambiguous in
-- PL/pgSQL, so target the existing unique constraint by name instead.

CREATE OR REPLACE FUNCTION public.prepare_stage1_status_communication(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  communication_delivery_id UUID,
  message_type TEXT,
  recipient_email TEXT,
  request_status TEXT,
  business_name TEXT,
  template_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_type TEXT := lower(trim(coalesce(p_entity_type, '')));
  v_email TEXT;
  v_status TEXT;
  v_business_name TEXT;
  v_message_type TEXT;
  v_delivery_id UUID;
  v_template TEXT := 'stage1-status-v1';
BEGIN
  IF v_type = 'claim_request' THEN
    SELECT claim.claimant_email, claim.claim_status, vendor.business_name
    INTO v_email, v_status, v_business_name
    FROM public.claim_requests AS claim JOIN public.vendors AS vendor ON vendor.id = claim.vendor_id
    WHERE claim.id = p_entity_id;
    v_message_type := 'claim_status';
  ELSIF v_type = 'profile_change' THEN
    SELECT lower(user_record.email), change_request.change_status, vendor.business_name
    INTO v_email, v_status, v_business_name
    FROM public.listing_change_requests AS change_request
    JOIN public.vendors AS vendor ON vendor.id = change_request.vendor_id
    JOIN auth.users AS user_record ON user_record.id = change_request.submitted_by
    WHERE change_request.id = p_entity_id;
    v_message_type := 'profile_change_status';
  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported communication entity.';
  END IF;
  IF v_email IS NULL OR v_status NOT IN ('needs_information', 'approved', 'rejected', 'revoked') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'This request does not have an approved Stage 1 status message.';
  END IF;
  INSERT INTO public.communication_deliveries (message_type, entity_type, entity_id, recipient_email, template_version)
  VALUES (v_message_type, v_type, p_entity_id::text, v_email, v_template)
  ON CONFLICT ON CONSTRAINT communication_deliveries_unique_message DO NOTHING
  RETURNING id INTO v_delivery_id;
  IF v_delivery_id IS NULL THEN
    SELECT delivery.id INTO v_delivery_id FROM public.communication_deliveries AS delivery
    WHERE delivery.message_type = v_message_type AND delivery.entity_type = v_type AND delivery.entity_id = p_entity_id::text AND delivery.recipient_email = v_email;
  END IF;
  RETURN QUERY SELECT v_delivery_id, v_message_type, v_email, v_status, v_business_name, v_template;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_stage2_outcome_communication(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS TABLE (
  communication_delivery_id UUID,
  message_type TEXT,
  recipient_email TEXT,
  request_status TEXT,
  business_name TEXT,
  template_version TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_type TEXT := lower(trim(coalesce(p_entity_type, '')));
  v_email TEXT;
  v_status TEXT;
  v_name TEXT;
  v_message_type TEXT;
  v_id UUID;
  v_template TEXT := 'stage2-outcome-v1';
BEGIN
  IF v_type = 'business_submission' THEN
    SELECT request.submitter_email, request.submission_status, vendor.business_name
    INTO v_email, v_status, v_name
    FROM public.business_submission_requests AS request JOIN public.vendors AS vendor ON vendor.id = request.vendor_id
    WHERE request.vendor_id = p_entity_id;
    v_message_type := 'submission_outcome';
    IF v_status NOT IN ('needs_information', 'approved', 'declined') THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'This submission has no approved outcome message.';
    END IF;
  ELSIF v_type = 'contact_request' THEN
    SELECT request.requester_email, request.contact_status, coalesce(request.business_name, 'SuburbMates request')
    INTO v_email, v_status, v_name
    FROM public.contact_requests AS request WHERE request.id = p_entity_id;
    v_message_type := 'contact_outcome';
    IF v_status <> 'resolved' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Only a resolved contact request has an approved outcome message.';
    END IF;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported communication entity.';
  END IF;
  INSERT INTO public.communication_deliveries (message_type, entity_type, entity_id, recipient_email, template_version)
  VALUES (v_message_type, v_type, p_entity_id::text, v_email, v_template)
  ON CONFLICT ON CONSTRAINT communication_deliveries_unique_message DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    SELECT delivery.id INTO v_id FROM public.communication_deliveries AS delivery
    WHERE delivery.message_type = v_message_type AND delivery.entity_type = v_type AND delivery.entity_id = p_entity_id::text AND delivery.recipient_email = v_email;
  END IF;
  RETURN QUERY SELECT v_id, v_message_type, v_email, v_status, v_name, v_template;
END;
$$;
