-- Safe internal monitoring: observe and report exceptions without changing
-- listing, ownership, publication, billing or tier state.

CREATE OR REPLACE FUNCTION public.refresh_internal_operations_health()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_failed_jobs BIGINT;
  v_overdue_jobs BIGINT;
  v_review_listings BIGINT;
  v_pending_claims BIGINT;
  v_pending_profile_changes BIGINT;
BEGIN
  SELECT count(*) FILTER (WHERE job.status = 'failed'),
         count(*) FILTER (WHERE job.status = 'pending' AND coalesce(job.scheduled_at, job.created_at) < v_now - interval '1 hour')
  INTO v_failed_jobs, v_overdue_jobs
  FROM public.automation_jobs AS job;

  SELECT count(*) INTO v_review_listings
  FROM public.vendors AS vendor
  WHERE vendor.listing_status IS NULL OR vendor.listing_status IN ('draft', 'pending_review');

  SELECT count(*) INTO v_pending_claims
  FROM public.claim_requests AS claim
  WHERE claim.claim_status IN ('pending', 'needs_information');

  SELECT count(*) INTO v_pending_profile_changes
  FROM public.listing_change_requests AS change
  WHERE change.change_status = 'pending';

  INSERT INTO public.integration_health (
    integration_name, status, last_success_at, next_expected_sync_at, metadata, updated_at
  ) VALUES
  (
    'supabase_database', 'healthy', v_now, v_now + interval '1 hour',
    jsonb_build_object('monitor', 'database_internal', 'read_write_check', 'passed'), v_now
  ),
  (
    'automation_queue',
    CASE WHEN v_failed_jobs > 0 THEN 'failed' WHEN v_overdue_jobs > 0 THEN 'degraded' ELSE 'healthy' END,
    CASE WHEN v_failed_jobs = 0 AND v_overdue_jobs = 0 THEN v_now ELSE NULL END,
    v_now + interval '1 hour',
    jsonb_build_object('failed_jobs', v_failed_jobs, 'overdue_jobs', v_overdue_jobs), v_now
  ),
  (
    'operator_queues', 'healthy', v_now, v_now + interval '1 hour',
    jsonb_build_object(
      'listings_needing_review', v_review_listings,
      'pending_claims', v_pending_claims,
      'pending_profile_changes', v_pending_profile_changes
    ), v_now
  ),
  (
    'scheduled_health_monitor', 'healthy', v_now, v_now + interval '1 hour',
    jsonb_build_object('schedule', '5 * * * *', 'mode', 'observe_only'), v_now
  )
  ON CONFLICT (integration_name) DO UPDATE
  SET status = EXCLUDED.status,
      last_success_at = coalesce(EXCLUDED.last_success_at, public.integration_health.last_success_at),
      last_failure_at = CASE WHEN EXCLUDED.status IN ('failed', 'degraded') THEN v_now ELSE public.integration_health.last_failure_at END,
      next_expected_sync_at = EXCLUDED.next_expected_sync_at,
      last_error = CASE WHEN EXCLUDED.status = 'failed' THEN 'One or more automation jobs failed' WHEN EXCLUDED.status = 'degraded' THEN 'One or more automation jobs are overdue' ELSE NULL END,
      metadata = EXCLUDED.metadata,
      updated_at = EXCLUDED.updated_at;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_internal_operations_health() FROM PUBLIC, anon, authenticated, service_role;

SELECT cron.unschedule(job.jobid)
FROM cron.job AS job
WHERE job.jobname = 'suburbmates-operations-health';

SELECT cron.schedule(
  'suburbmates-operations-health',
  '5 * * * *',
  'SELECT public.refresh_internal_operations_health();'
);

INSERT INTO public.integration_health (integration_name, status, metadata)
VALUES
  ('cloudflare_deployment', 'unknown', jsonb_build_object('monitoring', 'manual_until_api_sync')),
  ('resend_delivery', 'unknown', jsonb_build_object('monitoring', 'manual_until_api_sync', 'domain', 'suburbmates.com.au')),
  ('stripe_billing', 'disabled', jsonb_build_object('reason', 'Production billing webhook is not configured')),
  ('abr_lookup', 'disabled', jsonb_build_object('reason', 'ABN fields and automated lookup workflow are not implemented'))
ON CONFLICT (integration_name) DO NOTHING;

SELECT public.refresh_internal_operations_health();

CREATE OR REPLACE FUNCTION public.ops_system_overview()
RETURNS TABLE (failed_count BIGINT, degraded_count BIGINT, stale_count BIGINT, failed_job_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE health.status = 'failed'),
    count(*) FILTER (WHERE health.status = 'degraded'),
    count(*) FILTER (WHERE health.next_expected_sync_at IS NOT NULL AND health.next_expected_sync_at < timezone('utc'::text, now())),
    (SELECT count(*) FROM public.automation_jobs AS job WHERE job.status = 'failed')
  FROM public.integration_health AS health;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_integration_health()
RETURNS TABLE (
  integration_name TEXT, status TEXT, last_success_at TIMESTAMPTZ, last_failure_at TIMESTAMPTZ,
  next_expected_sync_at TIMESTAMPTZ, last_error TEXT, metadata JSONB, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  RETURN QUERY SELECT health.integration_name, health.status, health.last_success_at, health.last_failure_at,
    health.next_expected_sync_at, health.last_error, health.metadata, health.updated_at
  FROM public.integration_health AS health
  ORDER BY CASE health.status WHEN 'failed' THEN 0 WHEN 'degraded' THEN 1 WHEN 'unknown' THEN 2 WHEN 'disabled' THEN 3 ELSE 4 END,
    health.integration_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_automation_jobs(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  job_id UUID, job_type TEXT, status TEXT, attempt_count INTEGER, max_attempts INTEGER,
  correlation_id UUID, error_message TEXT, scheduled_at TIMESTAMPTZ, started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_limit < 1 OR p_limit > 200 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid job limit.'; END IF;
  RETURN QUERY SELECT job.id, job.job_type, job.status, job.attempt_count, job.max_attempts,
    job.correlation_id, job.error_message, job.scheduled_at, job.started_at, job.completed_at, job.created_at
  FROM public.automation_jobs AS job ORDER BY job.created_at DESC LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_audit_events(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  event_id UUID, actor_type TEXT, actor_user_id UUID, action TEXT, entity_type TEXT,
  entity_id TEXT, reason TEXT, correlation_id UUID, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_limit < 1 OR p_limit > 200 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid audit limit.'; END IF;
  RETURN QUERY SELECT event.id, event.actor_type, event.actor_user_id, event.action, event.entity_type,
    event.entity_id, event.reason, event.correlation_id, event.created_at
  FROM public.audit_events AS event ORDER BY event.created_at DESC LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_system_overview() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_list_integration_health() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_list_automation_jobs(INTEGER) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_list_audit_events(INTEGER) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_system_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_integration_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_automation_jobs(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_audit_events(INTEGER) TO authenticated;
