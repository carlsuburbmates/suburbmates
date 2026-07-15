-- A directory listing needs a location even when the vendor has no website.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS street_address TEXT;

COMMENT ON COLUMN public.vendors.street_address IS
  'Public business street address supplied by the catalogue import or vendor owner.';
