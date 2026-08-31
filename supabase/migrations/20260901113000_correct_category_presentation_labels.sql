-- Taxonomy mapping plan, Phase 1: readable presentation only.
-- Slugs, vendor assignments, public URLs and historical evidence stay intact.
UPDATE public.categories
SET name = CASE slug
  WHEN 'doityourself' THEN 'DIY'
  WHEN 'hifi' THEN 'Hi-Fi'
  WHEN 'it' THEN 'IT'
  ELSE name
END
WHERE slug IN ('doityourself', 'hifi', 'it');
