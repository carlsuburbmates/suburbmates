-- A long, paced approved-source refresh is operating normally. Preserve that
-- distinction from a failed run so /ops/System does not ask the operator to
-- act while the automated handoff is truthfully still in progress.
ALTER TABLE public.integration_health
  DROP CONSTRAINT IF EXISTS integration_health_status_check;

ALTER TABLE public.integration_health
  ADD CONSTRAINT integration_health_status_check
  CHECK (status IN ('unknown', 'healthy', 'running', 'degraded', 'failed', 'disabled'));
