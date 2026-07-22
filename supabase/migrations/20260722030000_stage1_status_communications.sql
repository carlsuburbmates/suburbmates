-- Stage 1 prepares only the two approved owner-status message types. It does
-- not grant a sender, create a dispatcher, or send an email by itself.

ALTER TABLE public.communication_deliveries
  DROP CONSTRAINT IF EXISTS communication_deliveries_message_type_check;
ALTER TABLE public.communication_deliveries
  ADD CONSTRAINT communication_deliveries_message_type_check CHECK (message_type IN (
    'contact_receipt', 'operator_contact_alert', 'operator_stripe_exception', 'operator_abn_exception',
    'claim_status', 'profile_change_status'
  ));
ALTER TABLE public.communication_deliveries
  ADD COLUMN IF NOT EXISTS template_version TEXT;

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
    FROM public.claim_requests claim JOIN public.vendors vendor ON vendor.id = claim.vendor_id
    WHERE claim.id = p_entity_id;
    v_message_type := 'claim_status';
  ELSIF v_type = 'profile_change' THEN
    SELECT lower(user_record.email), change.change_status, vendor.business_name
    INTO v_email, v_status, v_business_name
    FROM public.listing_change_requests change
    JOIN public.vendors vendor ON vendor.id = change.vendor_id
    JOIN auth.users user_record ON user_record.id = change.submitted_by
    WHERE change.id = p_entity_id;
    v_message_type := 'profile_change_status';
  ELSE
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported communication entity.';
  END IF;
  IF v_email IS NULL OR v_status NOT IN ('needs_information', 'approved', 'rejected', 'revoked') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'This request does not have an approved Stage 1 status message.';
  END IF;
  INSERT INTO public.communication_deliveries (message_type, entity_type, entity_id, recipient_email, template_version)
  VALUES (v_message_type, v_type, p_entity_id::text, v_email, v_template)
  ON CONFLICT (message_type, entity_type, entity_id, recipient_email) DO NOTHING
  RETURNING id INTO v_delivery_id;
  IF v_delivery_id IS NULL THEN
    SELECT id INTO v_delivery_id FROM public.communication_deliveries
    WHERE message_type = v_message_type AND entity_type = v_type AND entity_id = p_entity_id::text AND recipient_email = v_email;
  END IF;
  RETURN QUERY SELECT v_delivery_id, v_message_type, v_email, v_status, v_business_name, v_template;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_stage1_status_communication(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_stage1_status_communication(TEXT, UUID) TO service_role;

COMMENT ON FUNCTION public.prepare_stage1_status_communication(TEXT, UUID) IS
  'Creates a private, idempotent Stage 1 status-delivery record. A separate explicitly enabled server path is required to send.';
