-- The `darebin` slug is an area-wide source bucket, not a suburb assertion.
-- Preserve the stable slug and every listing assignment; correct only its label.
UPDATE public.suburbs
SET name = 'Darebin area'
WHERE slug = 'darebin';
