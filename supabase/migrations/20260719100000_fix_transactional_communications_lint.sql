-- Reconcile the already-applied Communications migration with source control
-- and remove its PL/pgSQL column-name ambiguity. This does not enable or send
-- transactional email.

+CREATE OR REPLACE FUNCTION public.prepare_contact_communications(p_contact_request_id UUID)
RETURNS TABLE (
  communication_delivery_id UUID,
  contact_request_id UUID,
  message_type TEXT,
  recipient_email TEXT,
  requester_name TEXT,
  contact_topic TEXT,
  business_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_request public.contact_requests%ROWTYPE;
  v_operator_email TEXT;
BEGIN
  SELECT * INTO v_request
  FROM public.contact_requests AS request
  WHERE request.id = p_contact_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Contact request not found.';
  END IF;

  SELECT lower(user_record.email) INTO v_operator_email
  FROM public.operator_users AS operator_user
  JOIN auth.users AS user_record ON user_record.id = operator_user.user_id
  WHERE operator_user.is_active = true
  ORDER BY operator_user.created_at ASC
  LIMIT 1;
  IF v_operator_email IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'No active operator email is available for communications.';
  END IF;

  RETURN QUERY
  WITH inserted AS (
    INSERT INTO public.communication_deliveries (
      message_type, entity_type, entity_id, recipient_email
    ) VALUES
      ('contact_receipt', 'contact_request', v_request.id::text, v_request.requester_email),
      ('operator_contact_alert', 'contact_request', v_request.id::text, v_operator_email)
    ON CONFLICT ON CONSTRAINT communication_deliveries_unique_message DO NOTHING
    RETURNING id, communication_deliveries.message_type, communication_deliveries.recipient_email
  )
  SELECT
    inserted.id,
    v_request.id,
    inserted.message_type,
    inserted.recipient_email,
    v_request.requester_name,
    v_request.topic,
    v_request.business_name
  FROM inserted;
END;
$$;
