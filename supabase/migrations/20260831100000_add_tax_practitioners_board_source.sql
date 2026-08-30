-- D-018: allow a narrowly filtered, display-permitted public-register source.
-- The acquisition layer emits only organisation trading names, business address,
-- Darebin suburb and registration status. It must never store individual-agent
-- names, individual trading names, registration numbers or registration dates.

INSERT INTO public.catalogue_sources (
  source_key, display_name, source_kind, licence_name, licence_url,
  permitted_use, contract_version, allowed_hosts, refresh_interval_days, automated, enabled
) VALUES (
  'tax_practitioners_board',
  'Tax Practitioners Board public register (organisation records only)',
  'open_data',
  'Creative Commons Attribution 4.0 International',
  'https://www.data.gov.au/data/dataset/tpb-register',
  'store_and_display',
  'tax-practitioners-board-org-v1',
  ARRAY['www.data.gov.au', 'data.gov.au'],
  31,
  true,
  true
)
ON CONFLICT (source_key) DO NOTHING;
