-- Automation retains every qualification result for audit, but routine
-- exclusions and repeated discoveries are not operator tasks. Only records
-- requiring judgment are exposed as action counts.

UPDATE public.automation_jobs AS job
SET status = 'cancelled',
    error_message = 'Safely superseded by a resumed candidate handoff attempt.',
    result = coalesce(job.result, '{}'::jsonb) || jsonb_build_object('recovered', true),
    completed_at = coalesce(job.completed_at, timezone('utc'::text, now()))
WHERE job.job_type = 'candidate_handoff'
  AND job.status = 'failed'
  AND job.error_message = 'Candidate handoff exceeded the processing window and was safely resumed.';

DROP FUNCTION IF EXISTS public.ops_action_overview();

CREATE OR REPLACE FUNCTION public.ops_action_overview()
RETURNS TABLE (
  candidate_manual_review_count BIGINT,
  catalogue_manual_review_count BIGINT,
  candidate_background_unique_count BIGINT,
  candidate_repeated_event_count BIGINT,
  catalogue_background_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();

  RETURN QUERY
  WITH latest_candidate_exception AS (
    SELECT DISTINCT ON (record.source_record_key)
      record.source_record_key, record.qualification_reasons
    FROM public.candidate_handoff_records AS record
    WHERE record.qualification_outcome = 'exception'
      AND record.exception_status = 'open'
    ORDER BY record.source_record_key, record.created_at DESC
  ),
  candidate_events AS (
    SELECT count(*)::BIGINT AS open_event_count
    FROM public.candidate_handoff_records AS record
    WHERE record.qualification_outcome = 'exception'
      AND record.exception_status = 'open'
  ),
  latest_requalification_run AS (
    SELECT run.id
    FROM public.existing_catalogue_requalification_runs AS run
    WHERE run.status = 'completed'
    ORDER BY run.completed_at DESC NULLS LAST, run.started_at DESC
    LIMIT 1
  ),
  catalogue_exception AS (
    SELECT record.qualification_reasons
    FROM public.existing_catalogue_requalification_records AS record
    JOIN latest_requalification_run AS run ON run.id = record.run_id
    WHERE record.qualification_outcome = 'exception'
      AND record.exception_status = 'open'
  ),
  candidate_counts AS (
    SELECT
      count(*) FILTER (WHERE qualification_reasons = '["possible_duplicate"]'::jsonb)::BIGINT AS manual_count,
      count(*) FILTER (WHERE qualification_reasons <> '["possible_duplicate"]'::jsonb)::BIGINT AS background_count,
      count(*)::BIGINT AS unique_count
    FROM latest_candidate_exception
  ),
  catalogue_counts AS (
    SELECT
      count(*) FILTER (WHERE qualification_reasons = '["possible_duplicate"]'::jsonb)::BIGINT AS manual_count,
      count(*) FILTER (WHERE qualification_reasons <> '["possible_duplicate"]'::jsonb)::BIGINT AS background_count
    FROM catalogue_exception
  )
  SELECT
    coalesce(candidate_counts.manual_count, 0),
    coalesce(catalogue_counts.manual_count, 0),
    coalesce(candidate_counts.background_count, 0),
    greatest(coalesce(candidate_events.open_event_count, 0) - coalesce(candidate_counts.unique_count, 0), 0),
    coalesce(catalogue_counts.background_count, 0)
  FROM candidate_counts
  CROSS JOIN candidate_events
  CROSS JOIN catalogue_counts;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_action_overview() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_action_overview() TO authenticated;

SELECT public.refresh_internal_operations_health();
