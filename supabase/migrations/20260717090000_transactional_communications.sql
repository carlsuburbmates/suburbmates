-- Transactional-only Resend delivery ledger. This records delivery attempts
-- without storing email bodies or creating an inbound-email channel.

CREATE TABLE public.communication_deliveries (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  message_type TEXT NOT NULL CHECK (message_type IN (
    'contact_receipt',
    'operator_contact_alert',
    'operator_stripe_exception',
    'operator_abn_exception'
  )),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'failed')),
  provider_message_id TEXT,
  provider_error TEXT,
  attempted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT communication_deliveries_unique_message UNIQUE (message_type, entity_type, entity_id, recipient_email)
);

ALTER TABLE public.communication_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.communication_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.communication_deliveries TO service_role;

CREATE INDEX communication_deliveries_status_created_at_idx
  ON public.communication_deliveries (delivery_status, created_at DESC);

-- Contact intake has always been server-verified. Restrict the existing
-- SECURITY DEFINER entry point to that server path rather than exposing it
-- through the Data API.
REVOKE ALL ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_contact_communications(p_contact_request_id UUID)
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
    ON CONFLICT (message_type, entity_type, entity_id, recipient_email) DO NOTHING
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

CREATE OR REPLACE FUNCTION public.record_communication_delivery(
  p_communication_delivery_id UUID,
  p_provider_message_id TEXT DEFAULT NULL,
  p_provider_error TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_delivery public.communication_deliveries%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_status TEXT;
BEGIN
  SELECT * INTO v_delivery
  FROM public.communication_deliveries AS delivery
  WHERE delivery.id = p_communication_delivery_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Communication delivery not found.';
  END IF;
  IF v_delivery.delivery_status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Communication delivery was already recorded.';
  END IF;
  IF nullif(trim(coalesce(p_provider_message_id, '')), '') IS NULL
    AND nullif(trim(coalesce(p_provider_error, '')), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A provider result is required.';
  END IF;

  v_status := CASE WHEN nullif(trim(coalesce(p_provider_error, '')), '') IS NULL THEN 'sent' ELSE 'failed' END;

  UPDATE public.communication_deliveries
  SET delivery_status = v_status,
      provider_message_id = nullif(trim(coalesce(p_provider_message_id, '')), ''),
      provider_error = nullif(left(trim(coalesce(p_provider_error, '')), 1000), ''),
      attempted_at = v_now,
      delivered_at = CASE WHEN v_status = 'sent' THEN v_now ELSE NULL END
  WHERE id = v_delivery.id;

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason, after_data
  ) VALUES (
    'service',
    CASE WHEN v_status = 'sent' THEN 'transactional_email_sent' ELSE 'transactional_email_failed' END,
    'communication_delivery',
    v_delivery.id::text,
    CASE WHEN v_status = 'sent' THEN 'Transactional email accepted by Resend.' ELSE 'Transactional email was not accepted by Resend.' END,
    jsonb_build_object('message_type', v_delivery.message_type, 'status', v_status)
  );

  INSERT INTO public.integration_health (
    integration_name, status, last_success_at, last_failure_at, last_error, metadata, updated_at
  ) VALUES (
    'resend_delivery',
    CASE WHEN v_status = 'sent' THEN 'healthy' ELSE 'failed' END,
    CASE WHEN v_status = 'sent' THEN v_now ELSE NULL END,
    CASE WHEN v_status = 'failed' THEN v_now ELSE NULL END,
    CASE WHEN v_status = 'failed' THEN left(trim(coalesce(p_provider_error, '')), 1000) ELSE NULL END,
    jsonb_build_object('mode', 'transactional_api', 'last_message_type', v_delivery.message_type),
    v_now
  )
  ON CONFLICT (integration_name) DO UPDATE
  SET status = EXCLUDED.status,
      last_success_at = CASE WHEN EXCLUDED.status = 'healthy' THEN EXCLUDED.last_success_at ELSE public.integration_health.last_success_at END,
      last_failure_at = CASE WHEN EXCLUDED.status = 'failed' THEN EXCLUDED.last_failure_at ELSE public.integration_health.last_failure_at END,
      last_error = EXCLUDED.last_error,
      metadata = EXCLUDED.metadata,
      updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_contact_communications(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_communication_delivery(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_contact_communications(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_communication_delivery(UUID, TEXT, TEXT) TO service_role;

COMMENT ON TABLE public.communication_deliveries IS
  'Transactional Resend attempt ledger. No email bodies are stored; failed rows are reviewed manually and never retried automatically.';
