-- Approved-source automation is recorded privately before any qualified
-- candidate can become a listing. GitHub artifacts and raw source records are
-- evidence only; this handoff is the separate, auditable decision boundary.

CREATE TABLE public.candidate_handoff_runs (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  source TEXT NOT NULL CHECK (source IN ('openstreetmap', 'operator', 'community')),
  artifact_sha256 TEXT NOT NULL CHECK (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  artifact_url TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed')),
  input_count INTEGER NOT NULL DEFAULT 0 CHECK (input_count >= 0),
  qualified_count INTEGER NOT NULL DEFAULT 0 CHECK (qualified_count >= 0),
  exception_count INTEGER NOT NULL DEFAULT 0 CHECK (exception_count >= 0),
  correlation_id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMPTZ,
  UNIQUE (source, artifact_sha256)
);

CREATE TABLE public.candidate_handoff_records (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES public.candidate_handoff_runs(id) ON DELETE RESTRICT,
  source_record_key TEXT NOT NULL,
  candidate_data JSONB NOT NULL,
  normalized_data JSONB NOT NULL,
  qualification_outcome TEXT NOT NULL CHECK (qualification_outcome IN ('qualified', 'exception')),
  qualification_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicate_vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE RESTRICT,
  exception_status TEXT NOT NULL DEFAULT 'open' CHECK (exception_status IN ('open', 'acknowledged', 'dismissed')),
  resolution_note TEXT,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (run_id, source_record_key)
);

ALTER TABLE public.candidate_handoff_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidate_handoff_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.candidate_handoff_runs, public.candidate_handoff_records FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.candidate_handoff_runs, public.candidate_handoff_records TO service_role;

CREATE INDEX candidate_handoff_records_open_exception_idx
  ON public.candidate_handoff_records (exception_status, created_at DESC)
  WHERE qualification_outcome = 'exception';
CREATE INDEX candidate_handoff_records_vendor_idx ON public.candidate_handoff_records (vendor_id);

CREATE OR REPLACE FUNCTION public.ops_list_candidate_handoff_records(
  p_status TEXT DEFAULT 'open',
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  record_id UUID,
  run_id UUID,
  source TEXT,
  source_record_key TEXT,
  candidate_data JSONB,
  normalized_data JSONB,
  qualification_outcome TEXT,
  qualification_reasons JSONB,
  duplicate_vendor_id UUID,
  vendor_id UUID,
  exception_status TEXT,
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
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
  IF v_status NOT IN ('open', 'acknowledged', 'dismissed', 'all') OR p_limit < 1 OR p_limit > 200 OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid candidate handoff filter or pagination values.';
  END IF;
  RETURN QUERY
  SELECT record.id, run.id, run.source, record.source_record_key, record.candidate_data,
    record.normalized_data, record.qualification_outcome, record.qualification_reasons,
    record.duplicate_vendor_id, record.vendor_id, record.exception_status,
    record.resolution_note, record.resolved_at, record.created_at
  FROM public.candidate_handoff_records AS record
  JOIN public.candidate_handoff_runs AS run ON run.id = record.run_id
  WHERE record.qualification_outcome = 'exception'
    AND (v_status = 'all' OR record.exception_status = v_status)
  ORDER BY record.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_resolve_candidate_handoff_record(
  p_record_id UUID,
  p_action TEXT,
  p_operator_note TEXT
)
RETURNS TABLE (record_id UUID, exception_status TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_action TEXT := lower(trim(coalesce(p_action, '')));
  v_note TEXT := nullif(trim(coalesce(p_operator_note, '')), '');
  v_record public.candidate_handoff_records%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
  IF v_action NOT IN ('acknowledge', 'dismiss') OR v_note IS NULL OR length(v_note) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose a valid exception action and provide a note up to 2,000 characters.';
  END IF;

  SELECT * INTO v_record FROM public.candidate_handoff_records AS record
  WHERE record.id = p_record_id AND record.qualification_outcome = 'exception'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Candidate exception not found.';
  END IF;
  IF v_record.exception_status = 'dismissed' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'A dismissed candidate exception cannot be changed.';
  END IF;

  UPDATE public.candidate_handoff_records AS record
  SET exception_status = CASE WHEN v_action = 'acknowledge' THEN 'acknowledged' ELSE 'dismissed' END,
      resolution_note = v_note,
      resolved_by = v_operator_id,
      resolved_at = v_now
  WHERE record.id = p_record_id;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id
  ) VALUES (
    'operator', v_operator_id, 'candidate_handoff_exception_' || v_action,
    'candidate_handoff_record', p_record_id::text, v_note,
    jsonb_build_object('exception_status', v_record.exception_status, 'qualification_reasons', v_record.qualification_reasons),
    jsonb_build_object('exception_status', CASE WHEN v_action = 'acknowledge' THEN 'acknowledged' ELSE 'dismissed' END),
    (SELECT run.correlation_id FROM public.candidate_handoff_runs AS run WHERE run.id = v_record.run_id)
  );

  RETURN QUERY SELECT p_record_id, CASE WHEN v_action = 'acknowledge' THEN 'acknowledged' ELSE 'dismissed' END;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_candidate_handoff_records(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_list_candidate_handoff_records(TEXT, INTEGER, INTEGER) TO authenticated;
REVOKE ALL ON FUNCTION public.ops_resolve_candidate_handoff_record(UUID, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_resolve_candidate_handoff_record(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.candidate_handoff_runs IS 'Private, idempotent receipt record for approved-source candidate artifacts.';
COMMENT ON TABLE public.candidate_handoff_records IS 'Private qualification evidence and Ops exceptions. A record is not a public listing.';
