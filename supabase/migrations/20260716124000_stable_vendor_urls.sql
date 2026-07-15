-- Stable, human-readable vendor URLs with permanent UUID and slug compatibility.
-- Public callers resolve routes through a narrow SECURITY DEFINER function;
-- redirect history itself remains private.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

ALTER TABLE public.vendors
  ADD COLUMN slug TEXT;

CREATE TABLE public.vendor_slug_redirects (
  old_slug TEXT PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  CONSTRAINT vendor_slug_redirects_old_slug_format_check CHECK (
    length(old_slug) BETWEEN 1 AND 120
    AND old_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND old_slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ),
  CONSTRAINT vendor_slug_redirects_reason_check CHECK (length(trim(reason)) BETWEEN 1 AND 2000)
);

ALTER TABLE public.vendor_slug_redirects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.vendor_slug_redirects FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.vendor_slug_redirects TO service_role;

CREATE INDEX vendor_slug_redirects_vendor_id_idx
  ON public.vendor_slug_redirects (vendor_id);

CREATE OR REPLACE FUNCTION private.normalize_vendor_slug(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT trim(both '-' FROM regexp_replace(
    regexp_replace(lower(extensions.unaccent(coalesce(p_value, ''))), '[^a-z0-9]+', '-', 'g'),
    '-+', '-', 'g'
  ));
$$;

CREATE OR REPLACE FUNCTION private.vendor_slug_base(p_business_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_slug TEXT := private.normalize_vendor_slug(p_business_name);
BEGIN
  IF v_slug = '' THEN
    RETURN 'business';
  END IF;

  IF v_slug IN ('admin', 'api', 'claim', 'edit', 'new', 'ops')
    OR v_slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    v_slug := v_slug || '-business';
  END IF;

  RETURN rtrim(left(v_slug, 100), '-');
END;
$$;

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
  ) AND NOT EXISTS (
    SELECT 1
    FROM public.vendor_slug_redirects AS redirect
    WHERE redirect.old_slug = p_slug
  );
$$;

CREATE OR REPLACE FUNCTION private.allocate_vendor_slug(
  p_business_name TEXT,
  p_suburb_slug TEXT,
  p_vendor_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_base TEXT := private.vendor_slug_base(p_business_name);
  v_suburb TEXT := rtrim(left(private.normalize_vendor_slug(p_suburb_slug), 40), '-');
  v_id_suffix TEXT := left(replace(p_vendor_id::text, '-', ''), 8);
  v_candidate TEXT;
  v_suffix_length INTEGER := 8;
BEGIN
  IF private.vendor_slug_is_available(v_base, p_vendor_id) THEN
    RETURN v_base;
  END IF;

  IF v_suburb <> '' THEN
    v_candidate := rtrim(left(v_base, 120 - length(v_suburb) - 1), '-') || '-' || v_suburb;
    IF private.vendor_slug_is_available(v_candidate, p_vendor_id) THEN
      RETURN v_candidate;
    END IF;
  END IF;

  LOOP
    v_id_suffix := left(replace(p_vendor_id::text, '-', ''), v_suffix_length);
    IF v_suburb <> '' THEN
      v_candidate := rtrim(left(v_base, 120 - length(v_suburb) - length(v_id_suffix) - 2), '-')
        || '-' || v_suburb || '-' || v_id_suffix;
    ELSE
      v_candidate := left(v_base, 120 - length(v_id_suffix) - 1) || '-' || v_id_suffix;
    END IF;

    IF private.vendor_slug_is_available(v_candidate, p_vendor_id) THEN
      RETURN v_candidate;
    END IF;

    IF v_suffix_length = 32 THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Unable to allocate a unique vendor slug.';
    END IF;
    v_suffix_length := least(v_suffix_length + 4, 32);
  END LOOP;
END;
$$;

-- Every slug namespace mutation takes the same transaction lock. This closes
-- the cross-table race that independent UNIQUE constraints cannot prevent.
CREATE OR REPLACE FUNCTION public.prepare_vendor_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(804743, 20260716);

  IF TG_OP = 'UPDATE'
    AND OLD.slug IS NOT NULL
    AND OLD.slug IS DISTINCT FROM NEW.slug
    AND auth.role() IS DISTINCT FROM 'service_role'
    AND (
      current_setting('app.vendor_slug_change_vendor_id', true) IS DISTINCT FROM NEW.id::text
      OR current_setting('app.vendor_slug_change_target', true) IS DISTINCT FROM NEW.slug
    )
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Use the operator slug-change function.';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.slug IS NULL THEN
    NEW.slug := private.allocate_vendor_slug(NEW.business_name, NEW.suburb_slug, NEW.id);
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

CREATE OR REPLACE FUNCTION public.archive_previous_vendor_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.vendor_slug_redirects (old_slug, vendor_id, created_by, reason)
  VALUES (
    OLD.slug,
    OLD.id,
    auth.uid(),
    coalesce(nullif(current_setting('app.vendor_slug_change_reason', true), ''), 'Vendor slug changed.')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_vendor_slug_redirect()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(804743, 20260716);
  IF EXISTS (SELECT 1 FROM public.vendors AS vendor WHERE vendor.slug = NEW.old_slug) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Historical slug conflicts with a current vendor slug.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_vendor_slug_redirect_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Vendor slug redirect history is append-only.';
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_public_vendor_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF OLD.is_published = true OR OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'A vendor with a public URL identity cannot be deleted.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER vendors_prepare_slug
  BEFORE INSERT OR UPDATE OF slug ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.prepare_vendor_slug();

CREATE TRIGGER vendors_archive_previous_slug
  AFTER UPDATE OF slug ON public.vendors
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug AND OLD.slug IS NOT NULL)
  EXECUTE FUNCTION public.archive_previous_vendor_slug();

CREATE TRIGGER vendor_slug_redirects_prepare
  BEFORE INSERT ON public.vendor_slug_redirects
  FOR EACH ROW EXECUTE FUNCTION public.prepare_vendor_slug_redirect();

CREATE TRIGGER vendor_slug_redirects_append_only
  BEFORE UPDATE OR DELETE ON public.vendor_slug_redirects
  FOR EACH ROW EXECUTE FUNCTION public.prevent_vendor_slug_redirect_mutation();

CREATE TRIGGER vendors_preserve_public_identity
  BEFORE DELETE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.prevent_public_vendor_deletion();

-- Backfill in immutable order so collision outcomes are repeatable.
DO $$
DECLARE
  v_vendor RECORD;
BEGIN
  FOR v_vendor IN
    SELECT vendor.id, vendor.business_name, vendor.suburb_slug
    FROM public.vendors AS vendor
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
END;
$$;

ALTER TABLE public.vendors
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT vendors_slug_key UNIQUE (slug),
  ADD CONSTRAINT vendors_slug_format_check CHECK (
    length(slug) BETWEEN 1 AND 120
    AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    AND slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  );

-- Returns no row for missing or unpublished vendors. Historical aliases and
-- UUIDs are resolved without granting callers access to redirect history.
CREATE OR REPLACE FUNCTION public.resolve_public_vendor_route(p_route_key TEXT)
RETURNS TABLE (
  vendor_id UUID,
  current_slug TEXT,
  redirect_required BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_route_key TEXT := trim(coalesce(p_route_key, ''));
  v_lookup_key TEXT := lower(v_route_key);
BEGIN
  IF v_lookup_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN QUERY
    SELECT vendor.id, vendor.slug, true
    FROM public.vendors AS vendor
    WHERE vendor.id = v_lookup_key::uuid
      AND vendor.is_published = true;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT vendor.id, vendor.slug, vendor.slug <> v_route_key
  FROM public.vendors AS vendor
  WHERE vendor.slug = v_lookup_key
    AND vendor.is_published = true
  UNION ALL
  SELECT vendor.id, vendor.slug, true
  FROM public.vendor_slug_redirects AS redirect
  JOIN public.vendors AS vendor ON vendor.id = redirect.vendor_id
  WHERE redirect.old_slug = v_lookup_key
    AND vendor.is_published = true
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_change_vendor_slug(
  p_vendor_id UUID,
  p_new_slug TEXT,
  p_reason TEXT
)
RETURNS TABLE (
  vendor_id UUID,
  previous_slug TEXT,
  current_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_vendor public.vendors%ROWTYPE;
  v_new_slug TEXT := private.normalize_vendor_slug(p_new_slug);
  v_reason TEXT := nullif(trim(coalesce(p_reason, '')), '');
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_correlation_id UUID := extensions.uuid_generate_v4();
BEGIN
  IF v_new_slug = '' OR length(v_new_slug) > 120
    OR v_new_slug IN ('admin', 'api', 'claim', 'edit', 'new', 'ops')
    OR v_new_slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid non-reserved slug is required.';
  END IF;
  IF v_reason IS NULL OR length(v_reason) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason between 1 and 2,000 characters is required.';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(804743, 20260716);
  SELECT * INTO v_vendor
  FROM public.vendors AS vendor
  WHERE vendor.id = p_vendor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Listing not found.';
  END IF;
  IF v_vendor.slug = v_new_slug THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The vendor already uses this slug.';
  END IF;
  IF NOT private.vendor_slug_is_available(v_new_slug, p_vendor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Vendor slug is already used or permanently reserved.';
  END IF;

  PERFORM set_config('app.vendor_slug_change_reason', v_reason, true);
  PERFORM set_config('app.vendor_slug_change_vendor_id', p_vendor_id::text, true);
  PERFORM set_config('app.vendor_slug_change_target', v_new_slug, true);
  UPDATE public.vendors AS vendor
  SET slug = v_new_slug, updated_at = v_now
  WHERE vendor.id = p_vendor_id;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'operator', v_operator_id, 'vendor_slug_changed', 'vendor', p_vendor_id::text, v_reason,
    jsonb_build_object('slug', v_vendor.slug),
    jsonb_build_object('slug', v_new_slug),
    v_correlation_id
  );

  RETURN QUERY SELECT p_vendor_id, v_vendor.slug, v_new_slug;
END;
$$;

REVOKE ALL ON FUNCTION private.normalize_vendor_slug(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.vendor_slug_base(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.vendor_slug_is_available(TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.allocate_vendor_slug(TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.prepare_vendor_slug() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.archive_previous_vendor_slug() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_vendor_slug_redirect() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_vendor_slug_redirect_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_public_vendor_deletion() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resolve_public_vendor_route(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_vendor_route(TEXT) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.ops_change_vendor_slug(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ops_change_vendor_slug(UUID, TEXT, TEXT) TO authenticated, service_role;

COMMENT ON COLUMN public.vendors.slug IS 'Stable current public URL key. Business-name changes do not change it automatically.';
COMMENT ON TABLE public.vendor_slug_redirects IS 'Private, append-only reservation of every superseded public vendor slug.';
COMMENT ON FUNCTION public.resolve_public_vendor_route(TEXT) IS 'Resolves published UUID, current-slug, or historical-slug routes without disclosing unpublished vendors or redirect history.';
