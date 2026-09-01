-- D-018: a CC BY 4.0 boundary reference supports precise locality assignment
-- from an already-approved OpenStreetMap coordinate. It is not a business
-- discovery source and never independently creates, enriches, or publishes a
-- listing.

INSERT INTO public.catalogue_sources (
  source_key, display_name, source_kind, licence_name, licence_url,
  permitted_use, contract_version, allowed_hosts, refresh_interval_days, automated, enabled
) VALUES (
  'geoscape_vic_localities',
  'Victorian locality boundaries',
  'open_data',
  'Creative Commons Attribution 4.0 International',
  'https://data.gov.au/data/dataset/vic-suburb-locality-boundaries-geoscape-administrative-boundaries',
  'store_and_display',
  'geoscape-vic-localities-v1',
  ARRAY['data.gov.au'],
  31,
  true,
  true
)
ON CONFLICT (source_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  source_kind = EXCLUDED.source_kind,
  licence_name = EXCLUDED.licence_name,
  licence_url = EXCLUDED.licence_url,
  permitted_use = EXCLUDED.permitted_use,
  contract_version = EXCLUDED.contract_version,
  allowed_hosts = EXCLUDED.allowed_hosts,
  refresh_interval_days = EXCLUDED.refresh_interval_days,
  automated = EXCLUDED.automated,
  enabled = EXCLUDED.enabled,
  updated_at = timezone('utc'::text, now());

COMMENT ON TABLE public.catalogue_sources IS 'Private approved-source registry. The Geoscape Victorian locality entry is a supporting boundary reference only; it cannot independently produce a business candidate.';
