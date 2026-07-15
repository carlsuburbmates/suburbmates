-- Add independent states and the operational records required by the locked
-- Master Plan and Unified Operations Specification. Existing public visibility
-- remains governed by is_published during this additive migration.

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS listing_status TEXT,
  ADD COLUMN IF NOT EXISTS listing_source TEXT,
  ADD COLUMN IF NOT EXISTS ownership_status TEXT,
  ADD COLUMN IF NOT EXISTS moderation_reason TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS unpublished_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_listing_status_check' AND conrelid = 'public.vendors'::regclass) THEN
    ALTER TABLE public.vendors ADD CONSTRAINT vendors_listing_status_check
      CHECK (listing_status IS NULL OR listing_status IN ('draft', 'pending_review', 'published', 'rejected', 'unpublished'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_listing_source_check' AND conrelid = 'public.vendors'::regclass) THEN
    ALTER TABLE public.vendors ADD CONSTRAINT vendors_listing_source_check
      CHECK (listing_source IS NULL OR listing_source IN ('seeded', 'operator_added', 'business_submitted', 'imported', 'claimed_existing_listing'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_ownership_status_check' AND conrelid = 'public.vendors'::regclass) THEN
    ALTER TABLE public.vendors ADD CONSTRAINT vendors_ownership_status_check
      CHECK (ownership_status IN ('unclaimed', 'claim_pending', 'claimed', 'owner_verified'));
  END IF;
END $$;

-- Backfill only facts proven by hosted state. The 21 unpublished rows remain
-- unclassified because no rejection or unpublication history exists for them.
UPDATE public.vendors
SET listing_status = 'published', published_at = COALESCE(published_at, created_at)
WHERE is_published = true AND listing_status IS NULL;

UPDATE public.vendors
SET ownership_status = CASE WHEN owner_id IS NOT NULL OR is_claimed = true THEN 'claimed' ELSE 'unclaimed' END
WHERE ownership_status IS NULL;

ALTER TABLE public.vendors
  ALTER COLUMN listing_status SET DEFAULT 'draft',
  ALTER COLUMN ownership_status SET DEFAULT 'unclaimed',
  ALTER COLUMN ownership_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_publication_state_consistency_check' AND conrelid = 'public.vendors'::regclass) THEN
    ALTER TABLE public.vendors ADD CONSTRAINT vendors_publication_state_consistency_check
      CHECK (
        (is_published = true AND listing_status = 'published') OR
        (is_published = false AND (listing_status IS NULL OR listing_status <> 'published'))
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.operator_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.claim_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  claimant_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  claimant_email TEXT NOT NULL,
  claim_status TEXT NOT NULL DEFAULT 'pending' CHECK (claim_status IN ('pending', 'requesting_information', 'approved', 'rejected', 'revoked', 'withdrawn')),
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  claimant_note TEXT,
  operator_note TEXT,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('operator', 'owner', 'service', 'system')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  reason TEXT,
  before_data JSONB,
  after_data JSONB,
  correlation_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE FUNCTION public.prevent_audit_event_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_append_only ON public.audit_events;
CREATE TRIGGER audit_events_append_only BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_event_mutation();

CREATE TABLE IF NOT EXISTS public.automation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
  correlation_id UUID NOT NULL DEFAULT uuid_generate_v4(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB,
  error_message TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.integration_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'unknown' CHECK (status IN ('unknown', 'healthy', 'degraded', 'failed', 'disabled')),
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  next_expected_sync_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.listing_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  evidence_type TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'passed', 'warning', 'failed', 'not_provided')),
  summary TEXT,
  evidence_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.operator_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_evidence ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.operator_users, public.claim_requests, public.audit_events,
  public.automation_jobs, public.integration_health, public.listing_evidence FROM anon, authenticated;
GRANT ALL ON TABLE public.operator_users, public.claim_requests, public.audit_events,
  public.automation_jobs, public.integration_health, public.listing_evidence TO service_role;
REVOKE ALL ON FUNCTION public.prevent_audit_event_mutation() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS vendors_category_slug_idx ON public.vendors (category_slug);
CREATE INDEX IF NOT EXISTS vendors_suburb_slug_idx ON public.vendors (suburb_slug);
CREATE INDEX IF NOT EXISTS vendors_owner_id_idx ON public.vendors (owner_id);
CREATE INDEX IF NOT EXISTS vendors_listing_status_created_at_idx ON public.vendors (listing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS vendors_ownership_status_idx ON public.vendors (ownership_status);
CREATE INDEX IF NOT EXISTS emails_queue_vendor_id_idx ON public.emails_queue (vendor_id);
CREATE INDEX IF NOT EXISTS claim_requests_vendor_status_idx ON public.claim_requests (vendor_id, claim_status, created_at DESC);
CREATE INDEX IF NOT EXISTS claim_requests_claimant_idx ON public.claim_requests (claimant_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_entity_created_at_idx ON public.audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_events_correlation_id_idx ON public.audit_events (correlation_id);
CREATE INDEX IF NOT EXISTS automation_jobs_status_scheduled_at_idx ON public.automation_jobs (status, scheduled_at);
CREATE INDEX IF NOT EXISTS listing_evidence_vendor_type_idx ON public.listing_evidence (vendor_id, evidence_type, created_at DESC);

COMMENT ON COLUMN public.vendors.listing_status IS 'Moderation/publication lifecycle independent from ownership, ABN, payment, and tier.';
COMMENT ON COLUMN public.vendors.ownership_status IS 'Ownership lifecycle independent from listing publication.';
COMMENT ON TABLE public.audit_events IS 'Append-only record of privileged and material operational actions.';
