-- Correct a source-key normalisation defect before the first Victorian
-- licence handoff. Old exception evidence remains immutable; only records
-- with the erroneous unapproved_source reason are eligible for requalification.
UPDATE public.catalogue_sources
SET contract_version = 'victorian-liquor-licences-v2',
    updated_at = timezone('utc'::text, now())
WHERE source_key = 'victorian_liquor_licences'
  AND contract_version = 'victorian-liquor-licences-v1';
