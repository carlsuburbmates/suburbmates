-- Preserve the established grounded search ranking while making one existing
-- public profile field available to result cards. The wrapped reader stores no
-- query and joins only public.published_vendors by the result identity.
CREATE FUNCTION public.search_published_vendors_with_hours(
  p_query TEXT,
  p_suburb_slug TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 24,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, slug TEXT, business_name TEXT, description TEXT, contact_email TEXT,
  phone TEXT, website TEXT, is_claimed BOOLEAN, street_address TEXT,
  trading_hours TEXT, suburb_slug TEXT, category_slug TEXT, total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT result.id, result.slug, result.business_name, result.description,
    result.contact_email, result.phone, result.website, result.is_claimed,
    result.street_address, vendor.trading_hours, result.suburb_slug,
    result.category_slug, result.total_count
  FROM public.search_published_vendors(
    p_query, p_suburb_slug, p_category_slug, p_limit, p_offset
  ) AS result
  JOIN public.published_vendors AS vendor ON vendor.id = result.id
  ORDER BY result.business_name ASC, result.id ASC;
$$;

REVOKE ALL ON FUNCTION public.search_published_vendors_with_hours(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_published_vendors_with_hours(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_published_vendors_with_hours(TEXT, TEXT, TEXT, INTEGER, INTEGER) IS
  'Adds existing public trading hours to the grounded public search reader without storing query text or exposing private fields.';
