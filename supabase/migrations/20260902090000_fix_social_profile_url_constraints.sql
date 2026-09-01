-- The original social-profile migration used doubled backslashes in standard
-- PostgreSQL string literals. PostgreSQL therefore interpreted the regular
-- expression as requiring a literal backslash before the domain separator and
-- rejected ordinary canonical Facebook/Instagram URLs.
ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_facebook_url_check,
  DROP CONSTRAINT IF EXISTS vendors_instagram_url_check;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_facebook_url_check
    CHECK (facebook_url IS NULL OR facebook_url ~* '^https://(www\.|m\.)?facebook\.com/[^[:space:]]+$'),
  ADD CONSTRAINT vendors_instagram_url_check
    CHECK (instagram_url IS NULL OR instagram_url ~* '^https://(www\.)?instagram\.com/[^[:space:]]+$');
