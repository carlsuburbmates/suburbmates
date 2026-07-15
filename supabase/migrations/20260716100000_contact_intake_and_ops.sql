-- Public support intake with a service-only write boundary and an operator queue.
-- Turnstile is verified by the application before this database function runs.

CREATE TABLE public.contact_requests (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  topic TEXT NOT NULL CHECK (topic IN (
    'general', 'listing_correction', 'claim_help', 'privacy', 'technical', 'partnership', 'other'
  )),
  requester_name TEXT NOT NULL,
  requester_email TEXT NOT NULL,
  business_name TEXT,
  message TEXT NOT NULL,
  contact_status TEXT NOT NULL DEFAULT 'new' CHECK (
    contact_status IN ('new', 'in_progress', 'resolved', 'spam')
  ),
  duplicate_hash TEXT NOT NULL,
  turnstile_hostname TEXT NOT NULL,
  turnstile_action TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL,
  operator_note TEXT,
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.contact_requests FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.contact_requests TO service_role;

CREATE INDEX contact_requests_status_created_at_idx
  ON public.contact_requests (contact_status, created_at DESC);
CREATE INDEX contact_requests_email_created_at_idx
  ON public.contact_requests (lower(requester_email), created_at DESC);
CREATE INDEX contact_requests_duplicate_created_at_idx
  ON public.contact_requests (duplicate_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_contact_request(
  p_topic TEXT,
  p_requester_name TEXT,
  p_requester_email TEXT,
  p_business_name TEXT,
  p_message TEXT,
  p_turnstile_hostname TEXT,
  p_turnstile_action TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_id UUID;
  v_name TEXT := trim(coalesce(p_requester_name, ''));
  v_email TEXT := lower(trim(coalesce(p_requester_email, '')));
  v_business_name TEXT := nullif(trim(coalesce(p_business_name, '')), '');
  v_message TEXT := trim(coalesce(p_message, ''));
  v_hash TEXT;
BEGIN
  IF p_topic IS NULL OR p_topic NOT IN (
    'general', 'listing_correction', 'claim_help', 'privacy', 'technical', 'partnership', 'other'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose a valid contact topic.';
  END IF;

  IF length(v_name) < 2 OR length(v_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter your name.';
  END IF;
  IF length(v_email) > 254 OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a valid reply email.';
  END IF;
  IF v_business_name IS NOT NULL AND length(v_business_name) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Business name is too long.';
  END IF;
  IF length(v_message) < 10 OR length(v_message) > 4000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a message between 10 and 4000 characters.';
  END IF;
  IF p_turnstile_action <> 'contact' OR length(coalesce(p_turnstile_hostname, '')) > 253 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Human verification was not valid.';
  END IF;

  -- Serialize checks for the same address so concurrent submissions cannot
  -- bypass rate or duplicate controls.
  PERFORM pg_advisory_xact_lock(hashtextextended('contact:' || v_email, 0));

  IF (
    SELECT count(*)
    FROM public.contact_requests AS request
    WHERE lower(request.requester_email) = v_email
      AND request.created_at >= v_now - interval '1 hour'
  ) >= 3 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Too many recent requests. Try again later.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.contact_requests AS request
    WHERE lower(request.requester_email) = v_email
      AND request.created_at >= v_now - interval '1 day'
  ) >= 10 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Too many recent requests. Try again later.';
  END IF;

  v_hash := md5(v_email || E'\n' || lower(v_message));
  SELECT request.id INTO v_id
  FROM public.contact_requests AS request
  WHERE request.duplicate_hash = v_hash
    AND request.created_at >= v_now - interval '10 minutes'
  ORDER BY request.created_at DESC
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.contact_requests (
    topic, requester_name, requester_email, business_name, message,
    duplicate_hash, turnstile_hostname, turnstile_action, consented_at
  ) VALUES (
    p_topic, v_name, v_email, v_business_name, v_message,
    v_hash, p_turnstile_hostname, p_turnstile_action, v_now
  ) RETURNING id INTO v_id;

  INSERT INTO public.audit_events (
    actor_type, action, entity_type, entity_id, reason, after_data
  ) VALUES (
    'service', 'contact_request_received', 'contact_request', v_id::text,
    'Validated public contact intake',
    jsonb_build_object('topic', p_topic, 'status', 'new')
  );

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_contact_overview()
RETURNS TABLE (new_count BIGINT, in_progress_count BIGINT, resolved_count BIGINT, spam_count BIGINT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE request.contact_status = 'new'),
    count(*) FILTER (WHERE request.contact_status = 'in_progress'),
    count(*) FILTER (WHERE request.contact_status = 'resolved'),
    count(*) FILTER (WHERE request.contact_status = 'spam')
  FROM public.contact_requests AS request;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_contact_requests(
  p_status TEXT DEFAULT 'new',
  p_contact_request_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  contact_request_id UUID,
  topic TEXT,
  requester_name TEXT,
  requester_email TEXT,
  business_name TEXT,
  message TEXT,
  contact_status TEXT,
  operator_note TEXT,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_status IS NOT NULL AND p_status NOT IN ('new', 'in_progress', 'resolved', 'spam') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid contact status.';
  END IF;
  IF p_limit < 1 OR p_limit > 200 OR p_offset < 0 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid pagination.';
  END IF;

  RETURN QUERY
  SELECT request.id, request.topic, request.requester_name, request.requester_email,
    request.business_name, request.message, request.contact_status, request.operator_note,
    request.decided_by, request.decided_at, request.created_at, request.updated_at
  FROM public.contact_requests AS request
  WHERE (p_status IS NULL OR request.contact_status = p_status)
    AND (p_contact_request_id IS NULL OR request.id = p_contact_request_id)
  ORDER BY request.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_decide_contact_request(
  p_contact_request_id UUID,
  p_status TEXT,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operator UUID := auth.uid();
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_before public.contact_requests%ROWTYPE;
BEGIN
  PERFORM private.require_active_operator();
  IF p_status NOT IN ('new', 'in_progress', 'resolved', 'spam') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid contact decision.';
  END IF;
  IF length(trim(coalesce(p_reason, ''))) < 1 OR length(trim(p_reason)) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason is required.';
  END IF;

  SELECT * INTO v_before
  FROM public.contact_requests AS request
  WHERE request.id = p_contact_request_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Contact request not found.';
  END IF;
  IF v_before.contact_status = p_status THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Contact request already has that status.';
  END IF;
  IF NOT (
    (v_before.contact_status = 'new' AND p_status IN ('in_progress', 'resolved', 'spam')) OR
    (v_before.contact_status = 'in_progress' AND p_status IN ('new', 'resolved', 'spam')) OR
    (v_before.contact_status = 'resolved' AND p_status = 'in_progress') OR
    (v_before.contact_status = 'spam' AND p_status = 'new')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'That contact status transition is not allowed.';
  END IF;

  UPDATE public.contact_requests
  SET contact_status = p_status,
      operator_note = trim(p_reason),
      decided_by = v_operator,
      decided_at = v_now,
      updated_at = v_now
  WHERE id = p_contact_request_id;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data
  ) VALUES (
    'operator', v_operator, 'contact_request_status_changed', 'contact_request', p_contact_request_id::text,
    trim(p_reason),
    jsonb_build_object('status', v_before.contact_status),
    jsonb_build_object('status', p_status)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.ops_contact_overview() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_list_contact_requests(TEXT, UUID, INTEGER, INTEGER)
  FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_decide_contact_request(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_contact_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_contact_requests(TEXT, UUID, INTEGER, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_decide_contact_request(UUID, TEXT, TEXT)
  TO authenticated;

COMMENT ON TABLE public.contact_requests IS
  'Private public-support intake. Only verified server intake and active operators may access it.';
COMMENT ON FUNCTION public.submit_contact_request(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Service-only persistence boundary called after application-side Turnstile verification.';
