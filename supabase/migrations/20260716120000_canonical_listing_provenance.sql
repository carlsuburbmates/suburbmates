-- Align listing provenance with the canonical operations vocabulary, then
-- classify only cohorts whose committed import identity proves their origin.

ALTER TABLE public.vendors
  DROP CONSTRAINT IF EXISTS vendors_listing_source_check;

DO $$
DECLARE
  legacy_seeded_count INTEGER := 0;
  legacy_imported_count INTEGER := 0;
  catalogue_import_count INTEGER := 0;
  initial_seed_count INTEGER := 0;
  changed_count INTEGER := 0;
BEGIN
  UPDATE public.vendors
  SET listing_source = 'seeded_by_suburbmates',
      updated_at = timezone('utc'::text, now())
  WHERE listing_source = 'seeded';
  GET DIAGNOSTICS legacy_seeded_count = ROW_COUNT;

  UPDATE public.vendors
  SET listing_source = 'approved_import',
      updated_at = timezone('utc'::text, now())
  WHERE listing_source = 'imported';
  GET DIAGNOSTICS legacy_imported_count = ROW_COUNT;

  UPDATE public.vendors
  SET listing_source = 'approved_import',
      updated_at = timezone('utc'::text, now())
  WHERE listing_source IS NULL
    AND source_key LIKE 'catalogue:%';
  GET DIAGNOSTICS catalogue_import_count = ROW_COUNT;

  UPDATE public.vendors
  SET listing_source = 'seeded_by_suburbmates',
      updated_at = timezone('utc'::text, now())
  WHERE listing_source IS NULL
    AND id IN (
      'ef0e43b5-62f8-496b-a0cd-f4dc0db58026'::uuid,
      '2a24f6c2-04c6-4c0e-9cb6-f972311cfc22'::uuid,
      '7068265c-e2a0-410b-916c-75251e776779'::uuid
    );
  GET DIAGNOSTICS initial_seed_count = ROW_COUNT;

  changed_count := legacy_seeded_count + legacy_imported_count + catalogue_import_count + initial_seed_count;
  IF changed_count > 0 THEN
    INSERT INTO public.audit_events (
      actor_type, action, entity_type, entity_id, reason, after_data
    ) VALUES (
      'system',
      'listing_provenance_canonicalized',
      'vendor_catalogue',
      'canonical_listing_provenance',
      'Aligned proven listing origins with the canonical operations vocabulary',
      jsonb_build_object(
        'changed_count', changed_count,
        'legacy_seeded_mapped', legacy_seeded_count,
        'legacy_imported_mapped', legacy_imported_count,
        'catalogue_imports_classified', catalogue_import_count,
        'initial_seeds_classified', initial_seed_count
      )
    );
  END IF;
END $$;

ALTER TABLE public.vendors
  ADD CONSTRAINT vendors_listing_source_check
  CHECK (
    listing_source IS NULL OR listing_source IN (
      'seeded_by_suburbmates',
      'operator_added',
      'business_submitted',
      'claimed_existing_listing',
      'approved_import'
    )
  );

COMMENT ON COLUMN public.vendors.listing_source IS
  'Canonical origin of the listing; NULL means provenance is not yet proven.';
