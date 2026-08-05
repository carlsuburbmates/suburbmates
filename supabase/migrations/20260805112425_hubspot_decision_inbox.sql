-- HubSpot is a one-way, low-detail Decision Inbox. This mapping contains only
-- the stable SuburbMates work identifier and the HubSpot task identifier; it
-- never stores request text, claimant data, contact details, ABNs or audit
-- notes. SuburbMates /ops remains the only decision-making surface.

CREATE TABLE public.hubspot_decision_inbox_items (
  work_item_id TEXT PRIMARY KEY,
  hubspot_task_id TEXT NOT NULL UNIQUE,
  work_kind TEXT NOT NULL CHECK (work_kind IN (
    'listing', 'claim', 'profile', 'contact', 'candidate', 'catalogue', 'system'
  )),
  task_state TEXT NOT NULL DEFAULT 'open' CHECK (task_state IN ('open', 'completed')),
  fingerprint TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.hubspot_decision_inbox_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.hubspot_decision_inbox_items FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.hubspot_decision_inbox_items TO service_role;

CREATE INDEX hubspot_decision_inbox_open_idx
  ON public.hubspot_decision_inbox_items (task_state, last_synced_at DESC)
  WHERE task_state = 'open';

COMMENT ON TABLE public.hubspot_decision_inbox_items IS
  'Service-only mapping for low-detail HubSpot Decision Inbox tasks. It contains no protected Ops evidence.';
