-- Keep actor UUIDs as immutable historical identifiers. A live-auth foreign
-- key with ON DELETE SET NULL conflicts with the append-only audit trigger and
-- prevents legitimate account deletion.

ALTER TABLE public.audit_events
  DROP CONSTRAINT IF EXISTS audit_events_actor_user_id_fkey;

CREATE INDEX IF NOT EXISTS audit_events_actor_user_created_at_idx
  ON public.audit_events (actor_user_id, created_at DESC)
  WHERE actor_user_id IS NOT NULL;

COMMENT ON COLUMN public.audit_events.actor_user_id IS
  'Immutable historical Supabase Auth subject UUID. Deliberately not a foreign key so deleting an auth account cannot rewrite audit history.';
