-- D-018: a tax-agent query should reach the existing public Accountant
-- category as well as the narrower Tax Advisor category. This is a grounded
-- synonym map, not an inferred profession, external lookup or retained query.
CREATE OR REPLACE FUNCTION public.search_published_vendors(
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
  inferred_location AS (
    SELECT suburb.slug,
      regexp_replace(lower(suburb.name), '[^[:alnum:]]+', ' ', 'g') AS normalized_name
    FROM public.suburbs AS suburb CROSS JOIN search_input
    WHERE nullif(trim(coalesce(p_suburb_slug, '')), '') IS NULL
      AND suburb.slug <> 'darebin'
      AND (' ' || search_input.normalized_value || ' ') LIKE
        '% ' || regexp_replace(lower(suburb.name), '[^[:alnum:]]+', ' ', 'g') || ' %'
    ORDER BY length(suburb.name) DESC, suburb.name ASC
    LIMIT 1
  ),
  effective_search AS (
    SELECT trim(regexp_replace(
      regexp_replace(
        search_input.normalized_value,
        '(^| )' || coalesce(inferred_location.normalized_name, '') || '( |$)',
        ' ',
        'g'
      ),
      '(^| )(in|near|around|at|within)( |$)',
      ' ',
      'g'
    )) AS normalized_value
    FROM search_input LEFT JOIN inferred_location ON true
  ),
  effective_filters AS (
    SELECT coalesce(
      nullif(trim(coalesce(p_suburb_slug, '')), ''),
      (SELECT slug FROM inferred_location)
    ) AS suburb_slug
  ),
  intent_aliases(alias, target_category_slug) AS (
    VALUES
      ('cafe', 'cafe'), ('cafes', 'cafe'), ('coffee', 'cafe'), ('coffee', 'coffee'), ('coffee shop', 'cafe'), ('brunch', 'cafe'),
      ('restaurant', 'restaurant'), ('restaurants', 'restaurant'), ('dining', 'restaurant'), ('thai', 'restaurant'), ('sushi', 'restaurant'), ('italian', 'restaurant'),
      ('pizza', 'restaurant'), ('pizzeria', 'restaurant'), ('noodles', 'restaurant'), ('takeaway', 'fast-food'), ('take away', 'fast-food'), ('fast food', 'fast-food'), ('burger', 'fast-food'),
      ('bakery', 'bakery'), ('bakeries', 'bakery'), ('baker', 'bakery'), ('bakers', 'bakery'), ('bread', 'bakery'), ('pastry', 'pastry'),
      ('dessert', 'dessert'), ('desserts', 'dessert'), ('sweets', 'confectionery'), ('confectionery', 'confectionery'), ('ice cream', 'ice-cream'),
      ('deli', 'deli'), ('delicatessen', 'deli'), ('butcher', 'butcher'), ('butchers', 'butcher'), ('seafood', 'seafood'), ('fish shop', 'seafood'),
      ('greengrocer', 'greengrocer'), ('fruit and veg', 'greengrocer'), ('fruit shop', 'greengrocer'), ('supermarket', 'supermarket'), ('grocery', 'supermarket'), ('grocery', 'convenience'), ('groceries', 'supermarket'), ('groceries', 'convenience'),
      ('convenience store', 'convenience'), ('corner store', 'convenience'), ('milk bar', 'convenience'),
      ('bar', 'bar'), ('bars', 'bar'), ('pub', 'pub'), ('pubs', 'pub'), ('beer', 'pub'), ('beer', 'bar'), ('beer', 'brewery'), ('brewery', 'brewery'), ('wine', 'wine'), ('bottle shop', 'alcohol'), ('liquor', 'alcohol'),
      ('accommodation', 'accommodation'), ('hotel', 'accommodation'), ('hotels', 'accommodation'), ('motel', 'accommodation'), ('motels', 'accommodation'), ('guest house', 'accommodation'),
      ('doctor', 'doctors'), ('doctors', 'doctors'), ('medical clinic', 'clinic'), ('clinic', 'clinic'), ('health clinic', 'clinic'),
      ('dentist', 'dentist'), ('dentists', 'dentist'), ('dental', 'dentist'), ('pharmacy', 'pharmacy'), ('pharmacy', 'chemist'), ('chemist', 'chemist'), ('chemist', 'pharmacy'), ('optometrist', 'optician'), ('optical', 'optician'),
      ('massage', 'massage'), ('beauty', 'beauty'), ('beauty salon', 'beauty'), ('nails', 'beauty'), ('nail salon', 'beauty'), ('cosmetics', 'cosmetics'),
      ('gym', 'fitness'), ('gymnasium', 'fitness'), ('fitness', 'fitness'), ('fitness centre', 'fitness'), ('yoga', 'fitness'), ('pilates', 'fitness'),
      ('dance', 'dance-studio'), ('dance studio', 'dance-studio'), ('dance class', 'dance-studio'), ('ballet', 'dance-studio'),
      ('hair', 'hairdresser'), ('hair', 'barber'), ('hairdresser', 'hairdresser'), ('hair salon', 'hairdresser'), ('haircut', 'hairdresser'), ('haircut', 'barber'), ('barber', 'barber'), ('barbershop', 'barber'), ('tattoo', 'tattoo'),
      ('pet', 'pet'), ('pets', 'pet'), ('pet shop', 'pet'), ('petshop', 'pet'), ('animal', 'pet'), ('animals', 'pet'), ('dog', 'pet'), ('dogs', 'pet'), ('cat', 'pet'), ('cats', 'pet'),
      ('pet grooming', 'pet-grooming'), ('dog grooming', 'pet-grooming'), ('dog groomer', 'pet-grooming'), ('groomer', 'pet-grooming'), ('vet', 'veterinary'), ('vets', 'veterinary'), ('veterinarian', 'veterinary'), ('veterinary', 'veterinary'),
      ('electrician', 'electrician'), ('electricians', 'electrician'), ('electrical', 'electrician'), ('plumber', 'plumber'), ('plumbers', 'plumber'), ('plumbing', 'plumber'),
      ('carpenter', 'carpenter'), ('carpentry', 'carpenter'), ('builder', 'builder'), ('building', 'builder'), ('painter', 'painter'), ('painters', 'painter'), ('painting', 'paint'),
      ('landscaper', 'landscaper'), ('landscaping', 'landscaper'), ('gardener', 'gardener'), ('garden centre', 'garden-centre'), ('nursery', 'garden-centre'),
      ('cleaner', 'cleaner'), ('cleaners', 'cleaner'), ('cleaning', 'cleaning'), ('dry cleaner', 'dry-cleaning'), ('laundry', 'laundry'),
      ('locksmith', 'locksmith'), ('hardware', 'hardware'), ('diy', 'doityourself'), ('home improvement', 'doityourself'),
      ('mechanic', 'car-repair'), ('mechanics', 'car-repair'), ('car repair', 'car-repair'), ('auto repair', 'car-repair'), ('car wash', 'car-wash'),
      ('tyres', 'tyres'), ('tires', 'tyres'), ('car parts', 'car-parts'), ('car rental', 'car-rental'), ('motorcycle', 'motorcycle'),
      ('clothes', 'clothes'), ('clothing', 'clothes'), ('fashion', 'fashion'), ('tailor', 'tailor'), ('shoes', 'shoes'), ('shoemaker', 'shoemaker'),
      ('furniture', 'furniture'), ('homewares', 'homewares'), ('homewares', 'houseware'), ('housewares', 'houseware'), ('housewares', 'homewares'), ('interior design', 'interior-decoration'), ('kitchen', 'kitchen'),
      ('books', 'books'), ('bookshop', 'books'), ('toys', 'toys'), ('gift', 'gift'), ('gifts', 'gift'), ('florist', 'florist'), ('flowers', 'florist'),
      ('antique', 'antiques'), ('antiques', 'antiques'), ('collectibles', 'antiques'), ('vintage', 'second-hand'), ('second hand', 'second-hand'), ('thrift', 'thrift-store'),
      ('computer', 'computer'), ('computers', 'computer'), ('computer repair', 'electronics-repair'), ('electronics repair', 'electronics-repair'), ('phone repair', 'electronics-repair'),
      ('mobile phone', 'mobile-phone'), ('tech support', 'it'), ('it support', 'it'), ('hi fi', 'hifi'), ('audio', 'hifi'),
      ('accountant', 'accountant'), ('accounting', 'accountant'), ('bookkeeping', 'accountant'),
      ('tax', 'tax-advisor'), ('tax', 'accountant'), ('tax agent', 'tax-advisor'), ('tax agent', 'accountant'), ('tax advice', 'tax-advisor'), ('tax advice', 'accountant'),
      ('lawyer', 'lawyer'), ('lawyers', 'lawyer'), ('legal', 'lawyer'), ('estate agent', 'estate-agent'), ('real estate', 'estate-agent'), ('property management', 'property-management'),
      ('financial adviser', 'financial-advisor'), ('financial advisor', 'financial-advisor'), ('insurance', 'insurance'), ('travel agent', 'travel-agency'), ('employment', 'employment-agency')
  ),
  matched_intents AS (
    SELECT aliases.target_category_slug,
      cardinality(string_to_array(aliases.alias, ' ')) AS specificity
    FROM intent_aliases AS aliases CROSS JOIN effective_search
    WHERE (' ' || effective_search.normalized_value || ' ') LIKE '% ' || aliases.alias || ' %'
  ),
  resolved_categories AS (
    SELECT DISTINCT target_category_slug
    FROM matched_intents
    WHERE specificity = (SELECT max(specificity) FROM matched_intents)
  ),
  intent_matches AS (
    SELECT vendor.id, vendor.slug, vendor.business_name, vendor.description,
      vendor.contact_email, vendor.phone, vendor.website, vendor.is_claimed,
      vendor.street_address, vendor.suburb_slug, vendor.category_slug
    FROM public.published_vendors AS vendor CROSS JOIN effective_filters
    WHERE vendor.category_slug IN (SELECT target_category_slug FROM resolved_categories)
      AND (effective_filters.suburb_slug IS NULL OR vendor.suburb_slug = effective_filters.suburb_slug)
      AND (p_category_slug IS NULL OR vendor.category_slug = p_category_slug)
  ),
  fallback_matches AS (
    SELECT id, slug, business_name, description, contact_email, phone, website,
      is_claimed, street_address, suburb_slug, category_slug
    FROM public.search_published_vendors_literal_fallback(
      (SELECT normalized_value FROM effective_search),
      (SELECT suburb_slug FROM effective_filters),
      p_category_slug,
      100,
      0
    )
    WHERE NOT EXISTS (SELECT 1 FROM resolved_categories)
      AND (SELECT normalized_value FROM effective_search) <> ''
  ),
  location_only_matches AS (
    SELECT vendor.id, vendor.slug, vendor.business_name, vendor.description,
      vendor.contact_email, vendor.phone, vendor.website, vendor.is_claimed,
      vendor.street_address, vendor.suburb_slug, vendor.category_slug
    FROM public.published_vendors AS vendor CROSS JOIN effective_filters
    WHERE (SELECT normalized_value FROM effective_search) = ''
      AND effective_filters.suburb_slug IS NOT NULL
      AND vendor.suburb_slug = effective_filters.suburb_slug
      AND (p_category_slug IS NULL OR vendor.category_slug = p_category_slug)
  ),
  matches AS (
    SELECT * FROM intent_matches
    UNION ALL SELECT * FROM fallback_matches
    UNION ALL SELECT * FROM location_only_matches
  )
  SELECT id, slug, business_name, description, contact_email, phone, website,
    is_claimed, street_address, suburb_slug, category_slug, count(*) OVER () AS total_count
  FROM matches
  ORDER BY business_name ASC, id ASC
  LIMIT least(greatest(coalesce(p_limit, 24), 1), 100)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.search_published_vendors(TEXT, TEXT, TEXT, INTEGER, INTEGER) IS
  'Searches the safe public projection with grounded resident-language intent, literal matching and bounded typo tolerance. Query text is never retained.';
