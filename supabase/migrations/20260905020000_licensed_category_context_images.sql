-- D-021 licensed category context. These are provider-licensed design assets,
-- never business media or evidence about an individual listing.

CREATE TABLE public.licensed_category_context_images (
  category_slug TEXT PRIMARY KEY REFERENCES public.categories(slug) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'pexels'),
  provider_photo_id TEXT NOT NULL,
  provider_url TEXT NOT NULL CHECK (provider_url ~ '^https://'),
  photographer TEXT NOT NULL,
  photographer_url TEXT NOT NULL CHECK (photographer_url ~ '^https://'),
  image_url TEXT NOT NULL CHECK (image_url ~ '^https://'),
  alt_text TEXT NOT NULL,
  keyword TEXT NOT NULL,
  licence_snapshot TEXT NOT NULL,
  selection_version TEXT NOT NULL,
  selected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (provider, provider_photo_id)
);

ALTER TABLE public.licensed_category_context_images ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.licensed_category_context_images FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.licensed_category_context_images TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.licensed_category_context_images TO service_role;

CREATE POLICY "Public readers can see active licensed category context only"
  ON public.licensed_category_context_images FOR SELECT TO anon, authenticated
  USING (active = true);

COMMENT ON TABLE public.licensed_category_context_images IS 'Publicly displayable Pexels category-context assets with credit/provenance. They never depict or verify a listed business and never replace owner-approved media.';
