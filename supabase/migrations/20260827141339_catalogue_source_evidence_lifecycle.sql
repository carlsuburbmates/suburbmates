-- D-018: replace the single-source catalogue contract with a private,
-- versioned source registry and field-level evidence lifecycle. These tables
-- are not public API surfaces. The public directory continues to read only
-- public.published_vendors.

CREATE TABLE public.catalogue_sources (
  source_key TEXT PRIMARY KEY CHECK (source_key ~ '^[a-z][a-z0-9_]{1,63}$'),
  display_name TEXT NOT NULL CHECK (length(trim(display_name)) BETWEEN 2 AND 160),
  source_kind TEXT NOT NULL CHECK (source_kind IN ('open_data', 'official_business_site', 'owner', 'operator', 'community')),
  licence_name TEXT NOT NULL CHECK (length(trim(licence_name)) BETWEEN 2 AND 240),
  licence_url TEXT,
  permitted_use TEXT NOT NULL CHECK (permitted_use IN ('store_and_display', 'evidence_only', 'private_submission')),
  contract_version TEXT NOT NULL CHECK (contract_version ~ '^[a-z0-9][a-z0-9._-]{0,127}$'),
  allowed_hosts TEXT[] NOT NULL DEFAULT '{}',
  refresh_interval_days INTEGER CHECK (refresh_interval_days IS NULL OR refresh_interval_days BETWEEN 1 AND 366),
  automated BOOLEAN NOT NULL DEFAULT false,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.catalogue_sources (
  source_key, display_name, source_kind, licence_name, licence_url,
  permitted_use, contract_version, allowed_hosts, refresh_interval_days, automated, enabled
) VALUES
  ('openstreetmap', 'OpenStreetMap', 'open_data', 'Open Database License (ODbL)', 'https://www.openstreetmap.org/copyright', 'store_and_display', 'openstreetmap-candidate-v1', ARRAY['www.openstreetmap.org'], 7, true, true),
  ('victorian_liquor_licences', 'Victorian liquor licences by location', 'open_data', 'Creative Commons Attribution 4.0 International', 'https://discover.data.vic.gov.au/dataset/victorian-liquor-licences-by-location', 'store_and_display', 'victorian-liquor-licences-v1', ARRAY['www.vic.gov.au', 'discover.data.vic.gov.au'], 31, true, true),
  ('legacy_import', 'Legacy approved catalogue import', 'operator', 'Legacy retained evidence', NULL, 'evidence_only', 'legacy-import-v1', ARRAY[]::TEXT[], NULL, false, false),
  ('operator', 'Authorised operator evidence', 'operator', 'Internal operator evidence', NULL, 'evidence_only', 'operator-v1', ARRAY[]::TEXT[], NULL, false, false),
  ('community', 'Private community submission', 'community', 'Private submitter-provided evidence', NULL, 'private_submission', 'community-v1', ARRAY[]::TEXT[], NULL, false, false)
ON CONFLICT (source_key) DO NOTHING;

ALTER TABLE public.candidate_handoff_runs
  ADD COLUMN IF NOT EXISTS source_contract_version TEXT;

UPDATE public.candidate_handoff_runs
SET source_contract_version = 'openstreetmap-candidate-v1'
WHERE source = 'openstreetmap' AND source_contract_version IS NULL;

ALTER TABLE public.candidate_handoff_runs
  DROP CONSTRAINT IF EXISTS candidate_handoff_runs_source_check;

ALTER TABLE public.candidate_handoff_runs
  ADD CONSTRAINT candidate_handoff_runs_source_fkey
  FOREIGN KEY (source) REFERENCES public.catalogue_sources(source_key) ON DELETE RESTRICT;

CREATE TABLE public.catalogue_enrichment_runs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  source_key TEXT NOT NULL REFERENCES public.catalogue_sources(source_key) ON DELETE RESTRICT,
  source_contract_version TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL CHECK (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_url TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed')),
  input_count INTEGER NOT NULL DEFAULT 0 CHECK (input_count >= 0),
  applied_count INTEGER NOT NULL DEFAULT 0 CHECK (applied_count >= 0),
  conflict_count INTEGER NOT NULL DEFAULT 0 CHECK (conflict_count >= 0),
  correlation_id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  UNIQUE (source_key, artifact_sha256)
);

CREATE TABLE public.listing_field_evidence (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  field_name TEXT NOT NULL CHECK (field_name IN ('business_name', 'category_slug', 'suburb_slug', 'street_address', 'contact_email', 'phone', 'website', 'description', 'trading_hours')),
  value_text TEXT NOT NULL CHECK (length(trim(value_text)) BETWEEN 1 AND 5000),
  source_key TEXT NOT NULL REFERENCES public.catalogue_sources(source_key) ON DELETE RESTRICT,
  source_record_key TEXT NOT NULL CHECK (length(trim(source_record_key)) BETWEEN 1 AND 500),
  source_url TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  freshness_due_at TIMESTAMPTZ,
  confidence SMALLINT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
  evidence_state TEXT NOT NULL DEFAULT 'active' CHECK (evidence_state IN ('active', 'superseded', 'conflict', 'rejected')),
  application_state TEXT NOT NULL DEFAULT 'observed' CHECK (application_state IN ('observed', 'applied', 'conflict', 'superseded')),
  applied_at TIMESTAMPTZ,
  enrichment_run_id UUID REFERENCES public.catalogue_enrichment_runs(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (vendor_id, field_name, source_key, source_record_key, value_text, observed_at)
);

CREATE TABLE public.catalogue_field_conflicts (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  field_name TEXT NOT NULL CHECK (field_name IN ('business_name', 'category_slug', 'suburb_slug', 'street_address', 'contact_email', 'phone', 'website', 'description', 'trading_hours')),
  incoming_evidence_id UUID NOT NULL REFERENCES public.listing_field_evidence(id) ON DELETE RESTRICT,
  current_value TEXT,
  conflict_status TEXT NOT NULL DEFAULT 'open' CHECK (conflict_status IN ('open', 'resolved', 'ignored')),
  resolution_note TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (incoming_evidence_id)
);

CREATE INDEX catalogue_enrichment_runs_source_received_idx
  ON public.catalogue_enrichment_runs (source_key, received_at DESC);
CREATE INDEX listing_field_evidence_vendor_field_active_idx
  ON public.listing_field_evidence (vendor_id, field_name, observed_at DESC)
  WHERE evidence_state = 'active';
CREATE INDEX listing_field_evidence_source_record_idx
  ON public.listing_field_evidence (source_key, source_record_key, observed_at DESC);
CREATE INDEX catalogue_field_conflicts_open_idx
  ON public.catalogue_field_conflicts (created_at DESC)
  WHERE conflict_status = 'open';

ALTER TABLE public.catalogue_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_enrichment_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_field_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogue_field_conflicts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.catalogue_sources, public.catalogue_enrichment_runs,
  public.listing_field_evidence, public.catalogue_field_conflicts
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.catalogue_sources, public.catalogue_enrichment_runs,
  public.listing_field_evidence, public.catalogue_field_conflicts TO service_role;

COMMENT ON TABLE public.catalogue_sources IS 'Private approved-source registry. Each entry records whether source facts may be stored and displayed.';
COMMENT ON TABLE public.listing_field_evidence IS 'Private, field-level provenance and freshness record. It never expands the public projection directly.';
COMMENT ON TABLE public.catalogue_field_conflicts IS 'Private contradictory source evidence. A conflict never overwrites a public listing automatically.';
