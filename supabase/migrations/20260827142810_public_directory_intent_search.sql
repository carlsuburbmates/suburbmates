-- D-018: replace literal-name-only search with a bounded, local intent reader.
-- It reads only public.published_vendors, stores no query text, and never
-- treats an inferred category as a private fact about a visitor.
CREATE OR REPLACE FUNCTION public.search_published_vendors(
  p_query TEXT,
  p_suburb_slug TEXT DEFAULT NULL,
  p_category_slug TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 24,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  slug TEXT,
  business_name TEXT,
  description TEXT,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  is_claimed BOOLEAN,
  street_address TEXT,
  suburb_slug TEXT,
  category_slug TEXT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH search_input AS (
    SELECT
      trim(coalesce(p_query, '')) AS value,
      regexp_replace(lower(trim(coalesce(p_query, ''))), '[^[:alnum:]]+', ' ', 'g') AS normalized_value,
      replace(replace(replace(trim(coalesce(p_query, '')), E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') AS escaped_value
  ),
  intent_aliases(alias, target_category_slug) AS (
    VALUES
      ('pet', 'pet'), ('pets', 'pet'), ('pet shop', 'pet'), ('petshop', 'pet'), ('animal', 'pet'), ('animals', 'pet'),
      ('dog', 'pet'), ('dogs', 'pet'), ('cat', 'pet'), ('cats', 'pet'), ('pet grooming', 'pet-grooming'), ('groomer', 'pet-grooming'),
      ('vet', 'veterinary'), ('vets', 'veterinary'), ('veterinarian', 'veterinary'), ('veterinary', 'veterinary'),
      ('coffee', 'cafe'), ('cafe', 'cafe'), ('cafes', 'cafe'), ('brunch', 'cafe'),
      ('restaurant', 'restaurant'), ('restaurants', 'restaurant'), ('dining', 'restaurant'), ('thai', 'restaurant'), ('pizza', 'restaurant'),
      ('bakery', 'bakery'), ('bakeries', 'bakery'), ('bread', 'bakery'), ('pastry', 'pastry'),
      ('bar', 'bar'), ('bars', 'bar'), ('pub', 'pub'), ('pubs', 'pub'), ('wine', 'wine'), ('bottle shop', 'alcohol'), ('liquor', 'alcohol'),
      ('antique', 'antiques'), ('antiques', 'antiques'), ('collectibles', 'antiques'),
      ('hair', 'hairdresser'), ('hairdresser', 'hairdresser'), ('hair salon', 'hairdresser'), ('barber', 'barber'),
      ('electrician', 'electrician'), ('electrical', 'electrician'), ('plumber', 'plumber'), ('plumbing', 'plumber'),
      ('accountant', 'accountant'), ('accounting', 'accountant'), ('tax', 'tax-advisor'), ('lawyer', 'lawyer'), ('legal', 'lawyer'),
      ('doctor', 'doctors'), ('doctors', 'doctors'), ('dentist', 'dentist'), ('dentists', 'dentist'), ('pharmacy', 'pharmacy'), ('chemist', 'chemist')
  ),
  resolved_categories AS (
    SELECT DISTINCT aliases.target_category_slug
    FROM intent_aliases AS aliases
    CROSS JOIN search_input
    WHERE (' ' || search_input.normalized_value || ' ') LIKE '% ' || aliases.alias || ' %'
  ),
  matches AS (
    SELECT
      vendor.id, vendor.slug, vendor.business_name, vendor.description,
      vendor.contact_email, vendor.phone, vendor.website, vendor.is_claimed,
      vendor.street_address, vendor.suburb_slug, vendor.category_slug,
      CASE
        WHEN lower(vendor.business_name) = lower(search_input.value) THEN 0
        WHEN vendor.business_name ILIKE '%' || search_input.escaped_value || '%' ESCAPE E'\\' THEN 1
        WHEN vendor.category_slug IN (SELECT target_category_slug FROM resolved_categories) THEN 2
        WHEN replace(vendor.category_slug, '-', ' ') ILIKE '%' || search_input.escaped_value || '%' ESCAPE E'\\'
          OR coalesce(vendor.description, '') ILIKE '%' || search_input.escaped_value || '%' ESCAPE E'\\' THEN 3
        ELSE 4
      END AS match_priority,
      least(
        COALESCE((
          SELECT min(extensions.levenshtein_less_equal(lower(search_input.value), token.value, CASE WHEN length(search_input.value) <= 5 THEN 1 ELSE 2 END))
          FROM regexp_split_to_table(lower(vendor.business_name), E'[^[:alnum:]]+') AS token(value)
          WHERE length(token.value) >= 4
        ), 3),
        COALESCE((
          SELECT min(extensions.levenshtein_less_equal(lower(search_input.value), token.value, CASE WHEN length(search_input.value) <= 5 THEN 1 ELSE 2 END))
          FROM regexp_split_to_table(replace(lower(vendor.category_slug), '-', ' '), E'[^[:alnum:]]+') AS token(value)
          WHERE length(token.value) >= 4
        ), 3)
      ) AS match_distance
    FROM public.published_vendors AS vendor
    CROSS JOIN search_input
    WHERE length(search_input.value) BETWEEN 1 AND 100
      AND (p_suburb_slug IS NULL OR vendor.suburb_slug = p_suburb_slug)
      AND (p_category_slug IS NULL OR vendor.category_slug = p_category_slug)
      AND (
        vendor.business_name ILIKE '%' || search_input.escaped_value || '%' ESCAPE E'\\'
        OR vendor.category_slug IN (SELECT target_category_slug FROM resolved_categories)
        OR replace(vendor.category_slug, '-', ' ') ILIKE '%' || search_input.escaped_value || '%' ESCAPE E'\\'
        OR coalesce(vendor.description, '') ILIKE '%' || search_input.escaped_value || '%' ESCAPE E'\\'
        OR EXISTS (
          SELECT 1 FROM regexp_split_to_table(lower(vendor.business_name), E'[^[:alnum:]]+') AS token(value)
          WHERE length(token.value) >= 4
            AND extensions.levenshtein_less_equal(lower(search_input.value), token.value, CASE WHEN length(search_input.value) <= 5 THEN 1 ELSE 2 END)
              <= CASE WHEN length(search_input.value) <= 5 THEN 1 ELSE 2 END
        )
        OR EXISTS (
          SELECT 1 FROM regexp_split_to_table(replace(lower(vendor.category_slug), '-', ' '), E'[^[:alnum:]]+') AS token(value)
          WHERE length(token.value) >= 4
            AND extensions.levenshtein_less_equal(lower(search_input.value), token.value, CASE WHEN length(search_input.value) <= 5 THEN 1 ELSE 2 END)
              <= CASE WHEN length(search_input.value) <= 5 THEN 1 ELSE 2 END
        )
      )
  )
  SELECT id, slug, business_name, description, contact_email, phone, website,
    is_claimed, street_address, suburb_slug, category_slug, count(*) OVER () AS total_count
  FROM matches
  ORDER BY match_priority, match_distance ASC, business_name ASC, id ASC
  LIMIT least(greatest(coalesce(p_limit, 24), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER) IS
  'Searches the public directory projection with deterministic local intent aliases, literal matches and bounded typo tolerance. Query text is never retained.';
