-- The legacy cron silently changed commercial presentation state without an
-- operator decision or audit trail. Disable it before launch automation.
SELECT cron.unschedule(job.jobid)
FROM cron.job AS job
WHERE job.jobname = 'prune-inactive-free-vendors';

INSERT INTO public.integration_health (
  integration_name, status, last_success_at, metadata, updated_at
) VALUES (
  'legacy_inactivity_pruner',
  'disabled',
  timezone('utc'::text, now()),
  jsonb_build_object(
    'reason', 'Disabled because it changed tier without an audited operator decision',
    'replacement', 'exception-led operations monitoring'
  ),
  timezone('utc'::text, now())
)
ON CONFLICT (integration_name) DO UPDATE
SET status = EXCLUDED.status,
    last_success_at = EXCLUDED.last_success_at,
    metadata = EXCLUDED.metadata,
    updated_at = EXCLUDED.updated_at;

INSERT INTO public.audit_events (
  actor_type, action, entity_type, entity_id, reason, after_data
) VALUES (
  'system',
  'unsafe_automation_disabled',
  'integration',
  'legacy_inactivity_pruner',
  'Legacy cron changed vendor tier without review or audit',
  jsonb_build_object('status', 'disabled', 'vendor_rows_changed', 0)
);
