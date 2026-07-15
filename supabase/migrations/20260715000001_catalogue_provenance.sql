-- Keep the public evidence for every imported directory listing. These fields
-- describe the source record; they are not a publication or claim gate.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_checked_on DATE,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS source_notes TEXT;

COMMENT ON COLUMN public.vendors.source_key IS
  'Stable import identity used to deduplicate repeat catalogue imports.';
COMMENT ON COLUMN public.vendors.source_url IS
  'Public source record used to create or refresh this directory listing.';
COMMENT ON COLUMN public.vendors.source_checked_on IS
  'Date the source record was last checked by the catalogue process.';
COMMENT ON COLUMN public.vendors.verification_status IS
  'Directory data state, not a visibility gate. Listings remain public while incomplete.';
