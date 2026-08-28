-- Some Victorian evidence arrived during the first recovery deployment, after
-- the initial freshness backfill had run. Complete the private-only backfill
-- without changing any public field or listing state.
UPDATE public.listing_field_evidence
SET freshness_due_at = observed_at + CASE source_key
  WHEN 'openstreetmap' THEN interval '7 days'
  WHEN 'victorian_liquor_licences' THEN interval '31 days'
  ELSE interval '31 days'
END
WHERE freshness_due_at IS NULL
  AND source_key IN ('openstreetmap', 'victorian_liquor_licences');
