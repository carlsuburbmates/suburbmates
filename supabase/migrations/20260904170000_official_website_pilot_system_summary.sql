-- Quiet D-021 readiness only. This exposes aggregate pilot state to active
-- operators; it cannot start a crawl, create Work, or disclose a website URL.

CREATE FUNCTION public.ops_get_official_website_pilot_summary()
RETURNS TABLE (
  source_enabled BOOLEAN,
  source_automated BOOLEAN,
  source_contract_version TEXT,
  inspection_count BIGINT,
  eligible_count BIGINT,
  blocked_count BIGINT,
  unsupported_count BIGINT,
  terms_pending_count BIGINT,
  last_checked_at TIMESTAMPTZ
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
    count(inspection.id) FILTER (WHERE inspection.terms_review_status = 'pending'),
    max(inspection.checked_at)
  FROM public.catalogue_sources AS source
  LEFT JOIN public.official_website_inspections AS inspection
    ON inspection.source_key = source.source_key
  WHERE source.source_key = 'official_business_site'
  GROUP BY source.enabled, source.automated, source.contract_version;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_get_official_website_pilot_summary() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_get_official_website_pilot_summary() TO authenticated;

COMMENT ON FUNCTION public.ops_get_official_website_pilot_summary() IS
  'Operator-only aggregate D-021 readiness. It never returns vendor identity, URL, website facts, page content, or terms decision detail.';
