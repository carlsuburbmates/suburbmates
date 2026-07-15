-- Remove private support-message content after its operational purpose ends.
-- Immutable audit records retain only the request ID and status history.

CREATE OR REPLACE FUNCTION private.apply_contact_retention()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_deleted_count INTEGER := 0;
BEGIN
  WITH deleted AS (
    DELETE FROM public.contact_requests AS request
    WHERE (
      request.contact_status = 'spam'
      AND request.updated_at < v_now - interval '30 days'
    ) OR (
      request.contact_status = 'resolved'
      AND request.updated_at < v_now - interval '12 months'
    )
    RETURNING request.id
  )
  SELECT count(*)::integer INTO v_deleted_count FROM deleted;

  IF v_deleted_count > 0 THEN
    INSERT INTO public.audit_events (
      actor_type, action, entity_type, entity_id, reason, after_data
    ) VALUES (
      'system',
      'contact_retention_applied',
      'contact_request',
      'retention_batch',
      'Deleted private contact content after the published retention period',
      jsonb_build_object('deleted_count', v_deleted_count)
    );
  END IF;

  INSERT INTO public.integration_health (
    integration_name, status, last_success_at, next_expected_sync_at, metadata, updated_at
  ) VALUES (
    'contact_retention',
    'healthy',
    v_now,
    v_now + interval '1 day',
    jsonb_build_object(
      'resolved_retention', '12 months',
      'spam_retention', '30 days',
      'last_deleted_count', v_deleted_count
    ),
    v_now
  )
  ON CONFLICT (integration_name) DO UPDATE
  SET status = EXCLUDED.status,
      last_success_at = EXCLUDED.last_success_at,
      next_expected_sync_at = EXCLUDED.next_expected_sync_at,
      last_error = NULL,
      metadata = EXCLUDED.metadata,
      updated_at = EXCLUDED.updated_at;

  RETURN v_deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION private.apply_contact_retention() FROM PUBLIC, anon, authenticated, service_role;

SELECT cron.unschedule(job.jobid)
FROM cron.job AS job
WHERE job.jobname = 'suburbmates-contact-retention';

SELECT cron.schedule(
  'suburbmates-contact-retention',
  '17 3 * * *',
  'SELECT private.apply_contact_retention();'
);

SELECT private.apply_contact_retention();

COMMENT ON FUNCTION private.apply_contact_retention() IS
  'Daily data-minimisation job for resolved and spam contact request content.';
