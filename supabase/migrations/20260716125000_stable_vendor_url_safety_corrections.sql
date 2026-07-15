-- Published listings own human-readable routes. Unpublished listings receive
-- non-public placeholders until their first publication, so they cannot squat
-- a public business route. This correction is intentionally run before the
-- slug-aware web deployment; no temporary canonical route has been public.

ALTER TABLE public.vendor_slug_redirects
  DROP CONSTRAINT IF EXISTS vendor_slug_redirects_created_by_fkey;

CREATE OR REPLACE FUNCTION private.vendor_slug_is_available(
  p_slug TEXT,
  p_vendor_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.vendors AS vendor
    WHERE vendor.slug = p_slug
      AND (p_vendor_id IS NULL OR vendor.id <> p_vendor_id)
      AND (
        vendor.is_published = true
        OR vendor.slug !~ '^pending-[0-9a-f]{32}$'
      )
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.vendor_slug_redirects AS redirect
    WHERE redirect.old_slug = p_slug
  );
$$;

CREATE OR REPLACE FUNCTION public.prepare_vendor_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_automatic_publication BOOLEAN := false;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(804743, 20260716);

  IF TG_OP = 'INSERT' AND NEW.slug IS NULL THEN
    IF NEW.is_published = true THEN
      NEW.slug := private.allocate_vendor_slug(NEW.business_name, NEW.suburb_slug, NEW.id);
    ELSE
      NEW.slug := 'pending-' || replace(NEW.id::text, '-', '');
    END IF;
  ELSIF TG_OP = 'UPDATE'
    AND OLD.is_published IS NOT TRUE
    AND NEW.is_published = true
    AND OLD.slug ~ '^pending-[0-9a-f]{32}$'
    AND NEW.slug = OLD.slug
  THEN
    NEW.slug := private.allocate_vendor_slug(NEW.business_name, NEW.suburb_slug, NEW.id);
    v_automatic_publication := true;
  END IF;

  IF TG_OP = 'UPDATE'
    AND OLD.slug IS NOT NULL
    AND OLD.slug IS DISTINCT FROM NEW.slug
    AND auth.role() IS DISTINCT FROM 'service_role'
    AND NOT v_automatic_publication
    AND (
      current_setting('app.vendor_slug_change_vendor_id', true) IS DISTINCT FROM NEW.id::text
      OR current_setting('app.vendor_slug_change_target', true) IS DISTINCT FROM NEW.slug
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Use the operator slug-change function.';
  END IF;

  IF NEW.slug IS NULL
    OR length(NEW.slug) NOT BETWEEN 1 AND 120
    OR NEW.slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    OR NEW.slug IN ('admin', 'api', 'claim', 'edit', 'new', 'ops')
    OR NEW.slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Vendor slug is invalid.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vendor_slug_redirects AS redirect WHERE redirect.old_slug = NEW.slug
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Vendor slug is permanently reserved.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER vendors_prepare_slug ON public.vendors;
CREATE TRIGGER vendors_prepare_slug
  BEFORE INSERT OR UPDATE OF slug, is_published ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.prepare_vendor_slug();

DO $$
DECLARE
  v_vendor RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM public.vendor_slug_redirects) THEN
    RAISE EXCEPTION 'Cannot correct stable vendor routes after slug redirects exist.';
  END IF;

  ALTER TABLE public.vendors DISABLE TRIGGER vendors_prepare_slug;
  ALTER TABLE public.vendors DISABLE TRIGGER vendors_archive_previous_slug;

  UPDATE public.vendors
  SET slug = 'temporary-' || replace(id::text, '-', '');

  FOR v_vendor IN
    SELECT vendor.id, vendor.business_name, vendor.suburb_slug
    FROM public.vendors AS vendor
    WHERE vendor.is_published = true
    ORDER BY vendor.created_at, vendor.id
  LOOP
    UPDATE public.vendors AS vendor
    SET slug = private.allocate_vendor_slug(
      v_vendor.business_name,
      v_vendor.suburb_slug,
      v_vendor.id
    )
    WHERE vendor.id = v_vendor.id;
  END LOOP;

  UPDATE public.vendors
  SET slug = 'pending-' || replace(id::text, '-', '')
  WHERE is_published IS NOT TRUE;

  ALTER TABLE public.vendors ENABLE TRIGGER vendors_prepare_slug;
  ALTER TABLE public.vendors ENABLE TRIGGER vendors_archive_previous_slug;
END;
$$;

COMMENT ON COLUMN public.vendor_slug_redirects.created_by IS 'Historical actor UUID. Deliberately not a foreign key so account deletion cannot mutate append-only redirect history.';
