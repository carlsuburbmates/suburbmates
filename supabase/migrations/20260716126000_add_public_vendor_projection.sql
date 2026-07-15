-- A narrow public projection prevents the directory API from exposing owner,
-- payment, source, moderation, or internal lifecycle fields.
CREATE OR REPLACE VIEW public.published_vendors
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  id,
  slug,
  business_name,
  category_slug,
  suburb_slug,
  contact_email,
  phone,
  website,
  description,
  tier,
  is_claimed,
  street_address,
  created_at,
  is_published
FROM public.vendors
WHERE is_published = true;

REVOKE ALL ON TABLE public.published_vendors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.published_vendors TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.list_current_owner_vendors()
RETURNS TABLE (
  id UUID,
  slug TEXT,
  business_name TEXT,
  suburb_slug TEXT,
  category_slug TEXT,
  tier TEXT,
  is_published BOOLEAN,
  street_address TEXT,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  description TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    vendor.id,
    vendor.slug,
    vendor.business_name,
    vendor.suburb_slug,
    vendor.category_slug,
    vendor.tier,
    vendor.is_published,
    vendor.street_address,
    vendor.contact_email,
    vendor.phone,
    vendor.website,
    vendor.description
  FROM public.vendors AS vendor
  WHERE vendor.owner_id = auth.uid()
  ORDER BY vendor.business_name, vendor.id;
$$;

REVOKE ALL ON FUNCTION public.list_current_owner_vendors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_current_owner_vendors() TO authenticated, service_role;

COMMENT ON VIEW public.published_vendors IS 'Safe public directory projection. Never add owner, payment, source, moderation, or lifecycle fields.';
