-- Give authorised operators a useful decision record without turning the audit
-- feed into a second copy of private request, contact, or profile data.

CREATE OR REPLACE FUNCTION private.redact_ops_audit_state(p_data JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(jsonb_object_agg(entry.key, entry.value), '{}'::jsonb)
  FROM jsonb_each(coalesce(p_data, '{}'::jsonb)) AS entry
  WHERE entry.key = ANY (ARRAY[
    'claim_status', 'change_status', 'listing_source', 'listing_status',
    'ownership_status', 'publication_unchanged', 'is_published', 'status',
    'changed_fields', 'vendor_rows_changed', 'deleted_count'
  ]);
$$;

REVOKE ALL ON FUNCTION private.redact_ops_audit_state(JSONB) FROM PUBLIC, anon, authenticated, service_role;

-- PostgreSQL cannot replace a function when its OUT-column row type changes.
-- This migration is intentionally safe to apply over the earlier audit feed.
DROP FUNCTION IF EXISTS public.ops_list_audit_events(INTEGER);

CREATE OR REPLACE FUNCTION public.ops_list_audit_events(p_limit INTEGER DEFAULT 50)
RETURNS TABLE (
  event_id UUID, actor_type TEXT, action TEXT, entity_type TEXT,
  reason TEXT, before_state JSONB, after_state JSONB,
  evidence_reference UUID, created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_limit < 1 OR p_limit > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid audit limit.';
  END IF;

  RETURN QUERY
  SELECT
    event.id,
    event.actor_type,
    event.action,
    event.entity_type,
    event.reason,
    private.redact_ops_audit_state(event.before_data),
    private.redact_ops_audit_state(event.after_data),
    event.correlation_id,
    event.created_at
  FROM public.audit_events AS event
  ORDER BY event.created_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_audit_events(INTEGER) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_list_audit_events(INTEGER) TO authenticated;

COMMENT ON FUNCTION public.ops_list_audit_events(INTEGER) IS
  'Operator-only audit feed with a fixed safe projection of state transitions and correlation evidence.';
