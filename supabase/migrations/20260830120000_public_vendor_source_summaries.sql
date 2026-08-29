-- D-018: expose a deliberately narrow, public provenance summary for a
-- published profile. Raw evidence, source-record keys, values, conflicts and
-- private source contracts stay private; this reader can only report an
-- approved display-permitted source that has actually supported a public fact.

CREATE FUNCTION public.list_public_vendor_source_summaries(p_vendor_id UUID)
RETURNS TABLE (
  source_key TEXT,
  source_name TEXT,
  observed_on DATE,
  supported_fields TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    evidence.source_key,
    source.display_name AS source_name,
    MAX(evidence.observed_at)::DATE AS observed_on,
    array_agg(DISTINCT evidence.field_name ORDER BY evidence.field_name) AS supported_fields
  FROM public.published_vendors AS vendor
  JOIN public.listing_field_evidence AS evidence
    ON evidence.vendor_id = vendor.id
  JOIN public.catalogue_sources AS source
    ON source.source_key = evidence.source_key
  WHERE vendor.id = p_vendor_id
    AND evidence.evidence_state = 'active'
    AND evidence.application_state = 'applied'
    AND source.permitted_use = 'store_and_display'
    AND evidence.field_name IN (
      'business_name', 'category_slug', 'suburb_slug', 'street_address',
      'contact_email', 'phone', 'website', 'description', 'trading_hours'
    )
  GROUP BY evidence.source_key, source.display_name
  ORDER BY MAX(evidence.observed_at) DESC, source.display_name;
$$;

REVOKE ALL ON FUNCTION public.list_public_vendor_source_summaries(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_vendor_source_summaries(UUID) TO anon, authenticated;

COMMENT ON FUNCTION public.list_public_vendor_source_summaries(UUID) IS
  'Safe public provenance summary for applied display-permitted facts on a currently published vendor. It deliberately excludes raw evidence, source records, values, conflicts and private contracts.';

