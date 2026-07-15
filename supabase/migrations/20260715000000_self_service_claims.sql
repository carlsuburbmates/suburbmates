-- Claiming is self-service: a signed-in owner can only claim a listing whose
-- recorded public contact email matches the email in their authenticated JWT.
-- The old request queue is intentionally removed: no staff approval is part
-- of the product workflow, and listings stay public before and after claims.
DROP FUNCTION IF EXISTS public.approve_claim(UUID);
DROP FUNCTION IF EXISTS public.search_claimable_vendors(TEXT);
DROP FUNCTION IF EXISTS public.list_pending_claims(INTEGER);
DROP FUNCTION IF EXISTS public.reject_claim(UUID, TEXT);
DROP TRIGGER IF EXISTS trg_check_vendor_claimable ON public.claim_requests;
DROP FUNCTION IF EXISTS public.check_vendor_claimable();
DROP TABLE IF EXISTS public.claim_requests;

CREATE OR REPLACE FUNCTION public.list_claimable_vendors_for_current_email()
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  suburb_slug TEXT,
  category_slug TEXT,
  street_address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
BEGIN
  IF auth.uid() IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Authentication with an email address is required.';
  END IF;

  RETURN QUERY
  SELECT v.id, v.business_name, v.suburb_slug, v.category_slug, v.street_address
  FROM public.vendors AS v
  WHERE v.owner_id IS NULL
    AND v.is_claimed = false
    AND lower(v.contact_email) = v_email
  ORDER BY v.business_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_vendor_for_current_email(p_vendor_id UUID)
RETURNS TABLE (
  id UUID,
  business_name TEXT,
  suburb_slug TEXT,
  category_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_vendor public.vendors%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_email = '' THEN
    RAISE EXCEPTION 'Authentication with an email address is required.';
  END IF;

  SELECT * INTO v_vendor
  FROM public.vendors AS v
  WHERE v.id = p_vendor_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found.';
  END IF;

  IF v_vendor.owner_id IS NOT NULL OR v_vendor.is_claimed THEN
    RAISE EXCEPTION 'This listing has already been claimed.';
  END IF;

  IF lower(coalesce(v_vendor.contact_email, '')) <> v_email THEN
    RAISE EXCEPTION 'Sign in using the email address shown on this business listing.';
  END IF;

  RETURN QUERY
  UPDATE public.vendors AS v
  SET owner_id = auth.uid(),
      is_claimed = true
  WHERE v.id = p_vendor_id
  RETURNING v.id, v.business_name, v.suburb_slug, v.category_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.list_claimable_vendors_for_current_email() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_vendor_for_current_email(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_claimable_vendors_for_current_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_vendor_for_current_email(UUID) TO authenticated;
