-- D-021 application lane. The source is active only in combination with an
-- approved per-domain terms record; the runner itself selects no other host.
-- It never discovers or publishes a business, and can only fill empty fields
-- on an existing unclaimed public listing.

UPDATE public.catalogue_sources
SET permitted_use = 'store_and_display',
    contract_version = 'official-business-site-application-v2',
    licence_name = 'D-021 terms-approved factual extraction; per-domain review and robots required',
    automated = true,
    enabled = true,
    updated_at = timezone('utc'::text, now())
WHERE source_key = 'official_business_site';

COMMENT ON TABLE public.official_website_domain_reviews IS
  'Private D-021 per-host factual-reuse gate. A runner may inspect only review_status=approved hosts; no review permits media, prose, testimonials, logos, reviews, discovery or publication.';
