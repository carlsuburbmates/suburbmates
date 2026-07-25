-- The operator-run, one-listing-at-a-time ABN evidence path is implemented.
-- Only bulk/automatic ABN checks remain deliberately disabled. Correct the
-- historical readiness note without changing health status or any workflow.

UPDATE public.integration_health
SET metadata = jsonb_build_object(
  'reason', 'Bulk ABN checks are intentionally disabled. A one-listing-at-a-time operator evidence check is available.'
),
    updated_at = timezone('utc'::text, now())
WHERE integration_name = 'abr_lookup'
  AND status = 'disabled';
