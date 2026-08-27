-- Keep recognised service intent precise. The prior reader remains the
-- fallback for unknown names and misspellings; recognised intent is answered
-- directly from the safe public projection so a business such as "Peter's"
-- does not appear for a search for "pets".
ALTER FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  RENAME TO search_published_vendors_literal_fallback;

CREATE FUNCTION public.search_published_vendors(
  p_query TEXT,
  p_suburb_slug TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 24,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, slug TEXT, business_name TEXT, description TEXT, contact_email TEXT,
  phone TEXT, website TEXT, is_claimed BOOLEAN, street_address TEXT,
  suburb_slug TEXT, category_slug TEXT, total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH search_input AS (
    SELECT regexp_replace(lower(trim(coalesce(p_query, ''))), '[^[:alnum:]]+', ' ', 'g') AS normalized_value
  ),
  intent_aliases(alias, target_category_slug) AS (
    VALUES
      ('pet', 'pet'), ('pets', 'pet'), ('pet shop', 'pet'), ('petshop', 'pet'), ('animal', 'pet'), ('animals', 'pet'), ('dog', 'pet'), ('dogs', 'pet'), ('cat', 'pet'), ('cats', 'pet'),
      ('pet grooming', 'pet-grooming'), ('groomer', 'pet-grooming'), ('vet', 'veterinary'), ('vets', 'veterinary'), ('veterinarian', 'veterinary'), ('veterinary', 'veterinary'),
      ('coffee', 'cafe'), ('cafe', 'cafe'), ('cafes', 'cafe'), ('brunch', 'cafe'), ('restaurant', 'restaurant'), ('restaurants', 'restaurant'), ('dining', 'restaurant'), ('thai', 'restaurant'), ('pizza', 'restaurant'),
      ('bakery', 'bakery'), ('bakeries', 'bakery'), ('bread', 'bakery'), ('pastry', 'pastry'), ('bar', 'bar'), ('bars', 'bar'), ('pub', 'pub'), ('pubs', 'pub'), ('wine', 'wine'), ('bottle shop', 'alcohol'), ('liquor', 'alcohol'),
      ('antique', 'antiques'), ('antiques', 'antiques'), ('collectibles', 'antiques'), ('hair', 'hairdresser'), ('hairdresser', 'hairdresser'), ('hair salon', 'hairdresser'), ('barber', 'barber'),
      ('electrician', 'electrician'), ('electrical', 'electrician'), ('plumber', 'plumber'), ('plumbing', 'plumber'), ('accountant', 'accountant'), ('accounting', 'accountant'), ('tax', 'tax-advisor'), ('lawyer', 'lawyer'), ('legal', 'lawyer'),
      ('doctor', 'doctors'), ('doctors', 'doctors'), ('dentist', 'dentist'), ('dentists', 'dentist'), ('pharmacy', 'pharmacy'), ('chemist', 'chemist')
  ),
  resolved_categories AS (
    SELECT DISTINCT aliases.target_category_slug
    FROM intent_aliases AS aliases CROSS JOIN search_input
    WHERE (' ' || search_input.normalized_value || ' ') LIKE '% ' || aliases.alias || ' %'
  ),
  intent_matches AS (
    SELECT vendor.id, vendor.slug, vendor.business_name, vendor.description,
      vendor.contact_email, vendor.phone, vendor.website, vendor.is_claimed,
      vendor.street_address, vendor.suburb_slug, vendor.category_slug
    FROM public.published_vendors AS vendor
    WHERE vendor.category_slug IN (SELECT target_category_slug FROM resolved_categories)
      AND (p_suburb_slug IS NULL OR vendor.suburb_slug = p_suburb_slug)
      AND (p_category_slug IS NULL OR vendor.category_slug = p_category_slug)
  ),
  fallback_matches AS (
    SELECT id, slug, business_name, description, contact_email, phone, website,
      is_claimed, street_address, suburb_slug, category_slug
    FROM public.search_published_vendors_literal_fallback(p_query, p_suburb_slug, p_category_slug, 100, 0)
    WHERE NOT EXISTS (SELECT 1 FROM resolved_categories)
  ),
  matches AS (
    SELECT * FROM intent_matches UNION ALL SELECT * FROM fallback_matches
  )
  SELECT id, slug, business_name, description, contact_email, phone, website,
    is_claimed, street_address, suburb_slug, category_slug, count(*) OVER () AS total_count
  FROM matches
  ORDER BY business_name ASC, id ASC
  LIMIT least(greatest(coalesce(p_limit, 24), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_published_vendors_literal_fallback(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_published_vendors_literal_fallback(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER) IS
  'Searches the safe public projection. Recognised local service intent resolves precisely before the private-free literal and typo fallback.';
