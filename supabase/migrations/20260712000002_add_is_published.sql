-- Step 1: Add the missing is_published column to vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false NOT NULL;

-- Step 2: Drop the existing permissive read policy
DROP POLICY IF EXISTS "Public read access for vendors" ON public.vendors;

-- Step 3: Create a new read policy that is strictly gated by is_published = true
-- Only published vendors are visible to the public (anon + authenticated).
-- Service role bypasses RLS entirely, so admin/backend can still see all rows.
CREATE POLICY "Public read access for published vendors only"
  ON public.vendors
  FOR SELECT
  USING (is_published = true);

-- Step 4: Verify — the table should now have:
--   is_published BOOLEAN DEFAULT false NOT NULL
-- And the only SELECT policy should be:
--   USING (is_published = true)
