-- Publication remains the public-visibility decision. This policy separately
-- qualifies only evidence-backed, useful taxonomy pages for search indexing.
ALTER TABLE public.suburbs
  ADD COLUMN location_kind TEXT NOT NULL DEFAULT 'suburb',
  ADD CONSTRAINT suburbs_location_kind_check
    CHECK (location_kind IN ('suburb', 'municipality_fallback', 'unreviewed'));

UPDATE public.suburbs
SET location_kind = 'municipality_fallback'
WHERE slug = 'darebin';

CREATE OR REPLACE VIEW public.taxonomy_page_eligibility
WITH (security_barrier = true, security_invoker = false)
AS
WITH eligible_listings AS (
  SELECT vendor.suburb_slug, vendor.category_slug
  FROM public.vendors AS vendor
  JOIN public.suburbs AS suburb ON suburb.slug = vendor.suburb_slug
  WHERE vendor.is_published = true
    AND vendor.listing_status = 'published'
    AND vendor.category_slug IS NOT NULL
    AND vendor.category_slug <> 'local-business'
    AND suburb.location_kind = 'suburb'
    AND vendor.source_url IS NOT NULL
    AND vendor.source_checked_on IS NOT NULL
    AND (
      vendor.street_address IS NOT NULL
      OR vendor.phone IS NOT NULL
      OR vendor.contact_email IS NOT NULL
      OR vendor.website IS NOT NULL
      OR vendor.description IS NOT NULL
    )
),
qualified_pairs AS (
  SELECT
    suburb_slug,
    category_slug,
    count(*)::INTEGER AS qualified_listing_count
  FROM eligible_listings
  GROUP BY suburb_slug, category_slug
  HAVING count(*) >= 3
),
qualified_suburbs AS (
  SELECT suburb_slug, count(*)::INTEGER AS qualified_listing_count
  FROM qualified_pairs
  GROUP BY suburb_slug
  HAVING count(*) >= 2
),
qualified_categories AS (
  SELECT category_slug, count(*)::INTEGER AS qualified_listing_count
  FROM qualified_pairs
  GROUP BY category_slug
  HAVING count(*) >= 2
)
SELECT
  'pair'::TEXT AS route_type,
  pair.suburb_slug,
  pair.category_slug,
  pair.qualified_listing_count,
  'taxonomy-v1'::TEXT AS policy_version
FROM qualified_pairs AS pair
UNION ALL
SELECT
  'suburb'::TEXT AS route_type,
  suburb.suburb_slug,
  NULL::TEXT AS category_slug,
  suburb.qualified_listing_count,
  'taxonomy-v1'::TEXT AS policy_version
FROM qualified_suburbs AS suburb
UNION ALL
SELECT
  'category'::TEXT AS route_type,
  NULL::TEXT AS suburb_slug,
  category.category_slug,
  category.qualified_listing_count,
  'taxonomy-v1'::TEXT AS policy_version
FROM qualified_categories AS category;

REVOKE ALL ON TABLE public.taxonomy_page_eligibility FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.taxonomy_page_eligibility TO anon, authenticated, service_role;

COMMENT ON COLUMN public.suburbs.location_kind IS 'Geographic meaning for taxonomy indexability. municipality_fallback is browseable but never indexable.';
COMMENT ON VIEW public.taxonomy_page_eligibility IS 'Public, aggregate-only taxonomy indexing policy. Published listings remain browseable even when no taxonomy row qualifies.';
