-- Operator-only action counts for the Ops home page. This is deliberately a
-- summary: detailed candidate, contact and owner data remain in their queues.

CREATE OR REPLACE FUNCTION public.ops_action_overview()
RETURNS TABLE (
  candidate_exception_count BIGINT,
  catalogue_exception_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();

  RETURN QUERY
  WITH latest_requalification_run AS (
    SELECT run.id
    FROM public.existing_catalogue_requalification_runs AS run
    WHERE run.status = 'completed'
    ORDER BY run.completed_at DESC NULLS LAST, run.started_at DESC
    LIMIT 1
  )
  SELECT
    (SELECT count(*)
      FROM public.candidate_handoff_records AS record
      WHERE record.qualification_outcome = 'exception'
        AND record.exception_status = 'open'),
    (SELECT count(*)
      FROM public.existing_catalogue_requalification_records AS record
      JOIN latest_requalification_run AS run ON run.id = record.run_id
      WHERE record.qualification_outcome = 'exception'
        AND record.exception_status = 'open');
END;
$$;

REVOKE ALL ON FUNCTION public.ops_action_overview() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_action_overview() TO authenticated;

COMMENT ON FUNCTION public.ops_action_overview() IS
  'Active-operator-only counts for the real private queues that need an action.';
