-- Public business directories cannot depend on an email address being published.
-- A stable source key keeps repeated catalog imports idempotent when email is absent.
ALTER TABLE public.vendors
  ALTER COLUMN contact_email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_key TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'vendors_source_key_key'
      AND conrelid = 'public.vendors'::regclass
  ) THEN
    ALTER TABLE public.vendors
      ADD CONSTRAINT vendors_source_key_key UNIQUE (source_key);
  END IF;
END $$;
