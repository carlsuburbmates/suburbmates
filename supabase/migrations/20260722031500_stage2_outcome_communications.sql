ALTER TABLE public.communication_deliveries DROP CONSTRAINT IF EXISTS communication_deliveries_message_type_check;
ALTER TABLE public.communication_deliveries ADD CONSTRAINT communication_deliveries_message_type_check CHECK (message_type IN ('contact_receipt','operator_contact_alert','operator_stripe_exception','operator_abn_exception','claim_status','profile_change_status','submission_outcome','contact_outcome'));

CREATE OR REPLACE FUNCTION public.prepare_stage2_outcome_communication(p_entity_type TEXT,p_entity_id UUID)
RETURNS TABLE (communication_delivery_id UUID,message_type TEXT,recipient_email TEXT,request_status TEXT,business_name TEXT,template_version TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_type TEXT:=lower(trim(coalesce(p_entity_type,''))); v_email TEXT; v_status TEXT; v_name TEXT; v_message_type TEXT; v_id UUID; v_template TEXT:='stage2-outcome-v1';
BEGIN
  IF v_type='business_submission' THEN
    SELECT request.submitter_email,request.submission_status,vendor.business_name INTO v_email,v_status,v_name FROM public.business_submission_requests request JOIN public.vendors vendor ON vendor.id=request.vendor_id WHERE request.vendor_id=p_entity_id;
    v_message_type:='submission_outcome';
    IF v_status NOT IN ('needs_information','approved','declined') THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='This submission has no approved outcome message.'; END IF;
  ELSIF v_type='contact_request' THEN
    SELECT request.requester_email,request.contact_status,coalesce(request.business_name,'SuburbMates request') INTO v_email,v_status,v_name FROM public.contact_requests request WHERE request.id=p_entity_id;
    v_message_type:='contact_outcome';
    IF v_status<>'resolved' THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Only a resolved contact request has an approved outcome message.'; END IF;
  ELSE RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Unsupported communication entity.'; END IF;
  INSERT INTO public.communication_deliveries(message_type,entity_type,entity_id,recipient_email,template_version) VALUES(v_message_type,v_type,p_entity_id::text,v_email,v_template) ON CONFLICT(message_type,entity_type,entity_id,recipient_email) DO NOTHING RETURNING id INTO v_id;
  IF v_id IS NULL THEN SELECT id INTO v_id FROM public.communication_deliveries WHERE message_type=v_message_type AND entity_type=v_type AND entity_id=p_entity_id::text AND recipient_email=v_email; END IF;
  RETURN QUERY SELECT v_id,v_message_type,v_email,v_status,v_name,v_template;
END; $$;
REVOKE ALL ON FUNCTION public.prepare_stage2_outcome_communication(TEXT,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_stage2_outcome_communication(TEXT,UUID) TO service_role;
