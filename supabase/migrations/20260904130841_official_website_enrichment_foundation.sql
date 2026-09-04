-- D-021 foundation. This creates private evidence capability only: it neither
-- enables website crawling nor changes a vendor, public projection, ownership,
-- ranking, publication, or media state. A separate controlled pilot release
-- must enable the source only after per-domain terms/robots review.

INSERT INTO public.catalogue_sources (
  source_key, display_name, source_kind, licence_name, licence_url,
  permitted_use, contract_version, allowed_hosts, refresh_interval_days, automated, enabled
) VALUES (
  'official_business_site',
  'Recorded official business website',
  'official_business_site',
  'D-021 factual pilot; per-domain terms and robots review required',
  NULL,
  'evidence_only',
  'official-business-site-pilot-v1',
  ARRAY[]::TEXT[],
  31,
  false,
  false
)
ON CONFLICT (source_key) DO UPDATE
SET display_name = EXCLUDED.display_name,
    licence_name = EXCLUDED.licence_name,
    licence_url = EXCLUDED.licence_url,
    permitted_use = EXCLUDED.permitted_use,
    contract_version = EXCLUDED.contract_version,
    allowed_hosts = EXCLUDED.allowed_hosts,
    refresh_interval_days = EXCLUDED.refresh_interval_days,
    automated = false,
    enabled = false,
    updated_at = timezone('utc'::text, now());

ALTER TABLE public.listing_field_evidence
  DROP CONSTRAINT IF EXISTS listing_field_evidence_field_name_check;
ALTER TABLE public.listing_field_evidence
  ADD CONSTRAINT listing_field_evidence_field_name_check
  CHECK (field_name IN (
    'business_name', 'category_slug', 'suburb_slug', 'street_address',
    'contact_email', 'phone', 'website', 'facebook_url', 'instagram_url',
    'description', 'trading_hours', 'service', 'booking_url', 'menu_url',
    'area_served', 'accessibility'
  ));

ALTER TABLE public.catalogue_field_conflicts
  DROP CONSTRAINT IF EXISTS catalogue_field_conflicts_field_name_check;
ALTER TABLE public.catalogue_field_conflicts
  ADD CONSTRAINT catalogue_field_conflicts_field_name_check
  CHECK (field_name IN (
    'business_name', 'category_slug', 'suburb_slug', 'street_address',
    'contact_email', 'phone', 'website', 'facebook_url', 'instagram_url',
    'description', 'trading_hours', 'service', 'booking_url', 'menu_url',
    'area_served', 'accessibility'
  ));

CREATE TABLE public.official_website_inspections (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  source_key TEXT NOT NULL DEFAULT 'official_business_site'
    REFERENCES public.catalogue_sources(source_key) ON DELETE RESTRICT,
  source_contract_version TEXT NOT NULL DEFAULT 'official-business-site-pilot-v1'
    CHECK (source_contract_version ~ '^[a-z0-9][a-z0-9._-]{0,127}$'),
  requested_url TEXT NOT NULL CHECK (requested_url ~ '^https://[^[:space:]]+$'),
  resolved_url TEXT,
  host_name TEXT NOT NULL CHECK (host_name ~ '^[a-z0-9.-]+$'),
  outcome TEXT NOT NULL CHECK (outcome IN ('eligible', 'blocked', 'unsupported')),
  reason_code TEXT NOT NULL CHECK (reason_code IN (
    'eligible', 'domain_mismatch', 'invalid_url', 'robots_disallowed',
    'robots_unavailable', 'robots_unsupported', 'redirect_outside_domain',
    'redirect_unsupported', 'site_unavailable', 'non_html', 'page_too_large',
    'unsupported_content', 'terms_pending', 'terms_blocked'
  )),
  robots_status TEXT NOT NULL CHECK (robots_status IN ('allowed', 'disallowed', 'unavailable', 'not_found', 'unsupported')),
  terms_review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (terms_review_status IN ('pending', 'approved', 'blocked')),
  content_fingerprint TEXT CHECK (content_fingerprint IS NULL OR content_fingerprint ~ '^[0-9a-f]{64}$'),
  extracted_fact_count INTEGER NOT NULL DEFAULT 0 CHECK (extracted_fact_count BETWEEN 0 AND 40),
  checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  freshness_due_at TIMESTAMPTZ,
  enrichment_run_id UUID REFERENCES public.catalogue_enrichment_runs(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX official_website_inspections_vendor_checked_idx
  ON public.official_website_inspections (vendor_id, checked_at DESC);
CREATE INDEX official_website_inspections_outcome_checked_idx
  ON public.official_website_inspections (outcome, checked_at DESC);

ALTER TABLE public.official_website_inspections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.official_website_inspections FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.official_website_inspections TO service_role;

COMMENT ON TABLE public.official_website_inspections IS
  'Private D-021 website pilot inspection ledger. It does not store HTML, page copy, imagery, credentials, analytics, visitor data, or public listing state.';
COMMENT ON COLUMN public.official_website_inspections.terms_review_status IS
  'Per-domain reuse review. A crawler allowance alone is insufficient to make website facts displayable.';
