-- D-018: onboard a narrowly filtered, display-permitted national register.
-- The acquisition layer emits only active organisation/institution licensees,
-- a public business name where supplied, and the principal Darebin locality.
-- It must never retain an individual licensee name, raw licence number, ABN,
-- ACN, licence authorisation text, latitude/longitude, or a postal address.

INSERT INTO public.catalogue_sources (
  source_key, display_name, source_kind, licence_name, licence_url,
  permitted_use, contract_version, allowed_hosts, refresh_interval_days, automated, enabled
) VALUES (
  'asic_credit_licensees',
  'ASIC Credit Licensee register (organisation records only)',
  'open_data',
  'Creative Commons Attribution 3.0 Australia',
  'https://www.data.gov.au/data/dataset/asic-credit-licensee',
  'store_and_display',
  'asic-credit-licensee-org-v1',
  ARRAY['www.data.gov.au', 'data.gov.au'],
  7,
  true,
  true
)
ON CONFLICT (source_key) DO NOTHING;
