-- A claimed owner can complete or correct the public directory fields for
-- their own listing. Ownership and publication are never changed here.
DROP FUNCTION IF EXISTS public.update_vendor_profile(UUID, TEXT, TEXT, TEXT, TEXT);

CREATE FUNCTION public.update_vendor_profile(
  p_vendor_id UUID,
  p_business_name TEXT,
  p_street_address TEXT,
  p_contact_email TEXT,
  p_phone TEXT,
  p_website TEXT,
  p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_contact_email TEXT := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_website TEXT := nullif(trim(coalesce(p_website, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.vendors AS v
    WHERE v.id = p_vendor_id AND v.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized to update this vendor.';
  END IF;

  IF nullif(trim(coalesce(p_business_name, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Business name is required.';
  END IF;

  IF v_contact_email IS NOT NULL
    AND v_contact_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'A valid contact email is required.';
  END IF;

  IF v_website IS NOT NULL AND v_website !~ '^https?://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'Website must begin with http:// or https://.';
  END IF;

  UPDATE public.vendors AS v
  SET business_name = trim(p_business_name),
      street_address = nullif(trim(coalesce(p_street_address, '')), ''),
      contact_email = v_contact_email,
      phone = nullif(trim(coalesce(p_phone, '')), ''),
      website = v_website,
      description = nullif(trim(coalesce(p_description, '')), '')
  WHERE v.id = p_vendor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_vendor_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_vendor_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
