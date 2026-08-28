-- D-018: evidence gathered before the runtime freshness helper existed still
-- needs an explicit review horizon. This is private provenance only; it does
-- not alter a public listing field or its publication state.
UPDATE public.listing_field_evidence
SET freshness_due_at = observed_at + CASE source_key
  WHEN 'openstreetmap' THEN interval '7 days'
  WHEN 'victorian_liquor_licences' THEN interval '31 days'
  ELSE interval '31 days'
END
WHERE freshness_due_at IS NULL
  AND source_key IN ('openstreetmap', 'victorian_liquor_licences');
