-- Candidate handoff failures remain in the private audit history, but their
-- current health is authoritative in integration_health. Counting every old
-- per-candidate failure here left Ops permanently red after an idempotent
-- recovery had completed successfully.

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
  SELECT count(*) FILTER (WHERE job.status = 'failed' AND job.job_type <> 'candidate_handoff'),
         count(*) FILTER (WHERE job.status = 'pending' AND coalesce(job.scheduled_at, job.created_at) < v_now - interval '1 hour')
  INTO v_failed_jobs, v_overdue_jobs
  FROM public.automation_jobs AS job;

  SELECT count(*) INTO v_review_listings FROM public.vendors AS vendor
  WHERE vendor.listing_status IS NULL OR vendor.listing_status IN ('draft', 'pending_review');
  SELECT count(*) INTO v_pending_claims FROM public.claim_requests AS claim
  WHERE claim.claim_status IN ('pending', 'needs_information');
  SELECT count(*) INTO v_pending_profile_changes FROM public.listing_change_requests AS change
  WHERE change.change_status = 'pending';

  INSERT INTO public.integration_health (integration_name, status, last_success_at, next_expected_sync_at, metadata, updated_at)
  VALUES
    ('supabase_database', 'healthy', v_now, v_now + interval '1 hour', jsonb_build_object('monitor', 'database_internal', 'read_write_check', 'passed'), v_now),
    ('automation_queue', CASE WHEN v_failed_jobs > 0 THEN 'failed' WHEN v_overdue_jobs > 0 THEN 'degraded' ELSE 'healthy' END, CASE WHEN v_failed_jobs = 0 AND v_overdue_jobs = 0 THEN v_now ELSE NULL END, v_now + interval '1 hour', jsonb_build_object('failed_jobs', v_failed_jobs, 'overdue_jobs', v_overdue_jobs, 'candidate_handoff_health', 'reported separately'), v_now),
    ('operator_queues', 'healthy', v_now, v_now + interval '1 hour', jsonb_build_object('listings_needing_review', v_review_listings, 'pending_claims', v_pending_claims, 'pending_profile_changes', v_pending_profile_changes), v_now),
    ('scheduled_health_monitor', 'healthy', v_now, v_now + interval '1 hour', jsonb_build_object('schedule', '5 * * * *', 'mode', 'observe_only'), v_now)
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
  SELECT count(*) FILTER (WHERE health.status = 'failed'), count(*) FILTER (WHERE health.status = 'degraded'), count(*) FILTER (WHERE health.next_expected_sync_at IS NOT NULL AND health.next_expected_sync_at < timezone('utc'::text, now())), (SELECT count(*) FROM public.automation_jobs AS job WHERE job.status = 'failed' AND job.job_type <> 'candidate_handoff')
  FROM public.integration_health AS health;
END;
$$;

SELECT public.refresh_internal_operations_health();
