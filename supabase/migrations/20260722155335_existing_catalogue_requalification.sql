-- Private, repeatable requalification evidence for listings that predate the
-- deterministic candidate handoff. Classification alone never changes a
-- listing's public, ownership, commercial or lifecycle state.

CREATE TABLE public.existing_catalogue_requalification_runs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  policy_version TEXT NOT NULL,
  catalogue_fingerprint TEXT NOT NULL CHECK (catalogue_fingerprint ~ '^[0-9a-f]{64}$'),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  input_count INTEGER NOT NULL DEFAULT 0 CHECK (input_count >= 0),
  qualified_count INTEGER NOT NULL DEFAULT 0 CHECK (qualified_count >= 0),
  exception_count INTEGER NOT NULL DEFAULT 0 CHECK (exception_count >= 0),
  correlation_id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  UNIQUE (policy_version, catalogue_fingerprint)
);

CREATE TABLE public.existing_catalogue_requalification_records (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.existing_catalogue_requalification_runs(id) ON DELETE RESTRICT,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  qualification_outcome TEXT NOT NULL CHECK (qualification_outcome IN ('qualified', 'exception')),
  qualification_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  normalized_data JSONB NOT NULL,
  duplicate_vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT,
  exception_status TEXT NOT NULL DEFAULT 'open' CHECK (exception_status IN ('open', 'acknowledged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (run_id, vendor_id)
);

ALTER TABLE public.existing_catalogue_requalification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.existing_catalogue_requalification_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.existing_catalogue_requalification_runs, public.existing_catalogue_requalification_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.existing_catalogue_requalification_runs, public.existing_catalogue_requalification_records TO service_role;

CREATE INDEX existing_catalogue_requalification_records_run_outcome_idx
  ON public.existing_catalogue_requalification_records (run_id, qualification_outcome, created_at DESC);
CREATE INDEX existing_catalogue_requalification_records_exception_idx
  ON public.existing_catalogue_requalification_records (exception_status, created_at DESC)
  WHERE qualification_outcome = 'exception';

CREATE OR REPLACE FUNCTION public.ops_list_existing_catalogue_requalification_exceptions(
  p_status TEXT DEFAULT 'open',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  run_id UUID,
  run_completed_at TIMESTAMPTZ,
  record_id UUID,
  vendor_id UUID,
  business_name TEXT,
  category_slug TEXT,
  suburb_slug TEXT,
  qualification_reasons JSONB,
  duplicate_vendor_id UUID,
  exception_status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT := lower(trim(coalesce(p_status, 'open')));
BEGIN
  PERFORM private.require_active_operator();
  IF v_status NOT IN ('open', 'acknowledged', 'all') OR p_limit < 1 OR p_limit > 200 OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid catalogue requalification filter or pagination values.';
  END IF;

  RETURN QUERY
  WITH latest_run AS (
    SELECT run.id, run.completed_at
    FROM public.existing_catalogue_requalification_runs AS run
    WHERE run.status = 'completed'
    ORDER BY run.completed_at DESC NULLS LAST, run.started_at DESC
    LIMIT 1
  )
  SELECT run.id, run.completed_at, record.id, vendor.id, vendor.business_name,
    vendor.category_slug, vendor.suburb_slug, record.qualification_reasons,
    record.duplicate_vendor_id, record.exception_status, record.created_at
  FROM latest_run AS run
  JOIN public.existing_catalogue_requalification_records AS record ON record.run_id = run.id
  JOIN public.vendors AS vendor ON vendor.id = record.vendor_id
  WHERE record.qualification_outcome = 'exception'
    AND (v_status = 'all' OR record.exception_status = v_status)
  ORDER BY record.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_existing_catalogue_requalification_exceptions(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_list_existing_catalogue_requalification_exceptions(TEXT, INTEGER, INTEGER) TO authenticated;

COMMENT ON TABLE public.existing_catalogue_requalification_runs IS
  'Private, idempotent evidence pass over existing listings. It never changes listing lifecycle or visibility.';
COMMENT ON TABLE public.existing_catalogue_requalification_records IS
  'Private per-listing deterministic requalification result for a specific existing-catalogue run.';
