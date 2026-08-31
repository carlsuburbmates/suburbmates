-- Keep legacy public taxonomy links compatible while converging current records
-- and every future write on the canonical Australian-English category slug.
CREATE TABLE IF NOT EXISTS public.category_aliases (
  alias_slug TEXT PRIMARY KEY CHECK (alias_slug = lower(trim(alias_slug))),
  category_slug TEXT NOT NULL REFERENCES public.categories(slug) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CHECK (alias_slug <> category_slug)
);

ALTER TABLE public.category_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public readers can resolve category aliases"
  ON public.category_aliases
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Production already had this canonical category from the imported catalogue.
-- A fresh local replay does not include production data, so create the same
-- presentation category before the alias's foreign key is evaluated.
INSERT INTO public.categories (slug, name, seo_description)
VALUES ('jeweller', 'Jeweller', 'Find local jewellers in Darebin.')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.category_aliases (alias_slug, category_slug)
VALUES ('jewelry', 'jeweller')
ON CONFLICT (alias_slug) DO UPDATE
SET category_slug = EXCLUDED.category_slug;

CREATE OR REPLACE FUNCTION private.canonical_category_slug(p_slug TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT coalesce(
    (
      SELECT alias.category_slug
      FROM public.category_aliases AS alias
      WHERE alias.alias_slug = lower(trim(coalesce(p_slug, '')))
    ),
    lower(trim(coalesce(p_slug, '')))
  );
$$;

CREATE OR REPLACE FUNCTION private.normalize_vendor_category_alias()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.category_slug := private.canonical_category_slug(NEW.category_slug);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS normalize_vendor_category_alias ON public.vendors;
CREATE TRIGGER normalize_vendor_category_alias
  BEFORE INSERT OR UPDATE OF category_slug ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION private.normalize_vendor_category_alias();

UPDATE public.vendors
SET category_slug = private.canonical_category_slug(category_slug)
WHERE category_slug IN (SELECT alias_slug FROM public.category_aliases);

REVOKE ALL ON TABLE public.category_aliases FROM PUBLIC;
GRANT SELECT ON TABLE public.category_aliases TO anon, authenticated;
REVOKE ALL ON FUNCTION private.canonical_category_slug(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.normalize_vendor_category_alias() FROM PUBLIC;
