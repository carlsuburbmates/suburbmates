-- D-021 autonomous factual enrichment v3. Public business facts may be
-- inspected only after the bounded crawler checks robots and any clearly
-- linked same-domain terms page. Possible restrictions remain held for an
-- operator; an existing operator block always wins.

ALTER TABLE public.official_website_inspections
  DROP CONSTRAINT IF EXISTS official_website_inspections_terms_review_status_check;
ALTER TABLE public.official_website_inspections
  ADD CONSTRAINT official_website_inspections_terms_review_status_check
  CHECK (terms_review_status IN ('pending', 'approved', 'blocked', 'automated_clear', 'manual_review'));

ALTER TABLE public.official_website_inspections
  ADD COLUMN terms_url TEXT CHECK (terms_url IS NULL OR terms_url ~ '^https://[^[:space:]]+$'),
  ADD COLUMN terms_fingerprint TEXT CHECK (terms_fingerprint IS NULL OR terms_fingerprint ~ '^[0-9a-f]{64}$'),
  ADD COLUMN terms_assessment_basis TEXT NOT NULL DEFAULT 'legacy_operator_gate'
    CHECK (terms_assessment_basis IN (
      'legacy_operator_gate', 'inspection_not_eligible', 'operator_approved',
      'no_linked_terms_restriction_found', 'linked_terms_checked_no_restriction_found',
      'possible_automation_restriction', 'linked_terms_disallowed_by_robots',
      'linked_terms_unavailable'
    ));

UPDATE public.catalogue_sources
SET contract_version = 'official-business-site-application-v3',
    licence_name = 'D-021 autonomous terms-aware factual extraction; robots and operator blocks enforced',
    automated = true,
    enabled = true,
    updated_at = timezone('utc'::text, now())
WHERE source_key = 'official_business_site';

COMMENT ON COLUMN public.official_website_inspections.terms_review_status IS
  'Deterministic linked-terms assessment or explicit operator decision. manual_review cannot apply facts.';
COMMENT ON COLUMN public.official_website_inspections.terms_fingerprint IS
  'SHA-256 of transiently inspected linked terms HTML; the terms content itself is never retained.';
COMMENT ON TABLE public.official_website_domain_reviews IS
  'Private D-021 operator override. A block always excludes a host; an approval may resolve a reviewed restriction. Domains without overrides still undergo deterministic linked-terms and robots assessment.';

CREATE OR REPLACE FUNCTION public.ops_get_official_website_pilot_summary()
RETURNS TABLE (
  source_enabled BOOLEAN, source_automated BOOLEAN, source_contract_version TEXT,
  inspection_count BIGINT, eligible_count BIGINT, blocked_count BIGINT,
  unsupported_count BIGINT, terms_pending_count BIGINT, last_checked_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  RETURN QUERY
  SELECT source.enabled, source.automated, source.contract_version,
    count(inspection.id),
    count(inspection.id) FILTER (WHERE inspection.outcome = 'eligible'),
    count(inspection.id) FILTER (WHERE inspection.outcome = 'blocked'),
    count(inspection.id) FILTER (WHERE inspection.outcome = 'unsupported'),
    count(inspection.id) FILTER (WHERE inspection.terms_review_status IN ('pending', 'manual_review')),
    max(inspection.checked_at)
  FROM public.catalogue_sources AS source
  LEFT JOIN public.official_website_inspections AS inspection ON inspection.source_key = source.source_key
  WHERE source.source_key = 'official_business_site'
  GROUP BY source.enabled, source.automated, source.contract_version;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_get_official_website_pilot_summary() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_get_official_website_pilot_summary() TO authenticated;
