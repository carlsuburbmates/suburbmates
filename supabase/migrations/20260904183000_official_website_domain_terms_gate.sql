-- D-021 domain-level reuse gate. A technical robots result is not a reuse
-- decision. Only an active operator can approve or block a recorded official
-- domain, and a source batch must remain held until both controls agree.

CREATE TABLE public.official_website_domain_reviews (
  host_name TEXT PRIMARY KEY CHECK (host_name ~ '^[a-z0-9][a-z0-9.-]{0,251}[a-z0-9]$'),
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'blocked')),
  terms_url TEXT CHECK (terms_url IS NULL OR terms_url ~ '^https://[^[:space:]]+$'),
  review_reason TEXT NOT NULL CHECK (length(trim(review_reason)) BETWEEN 1 AND 2000),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CHECK ((review_status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR (review_status IN ('approved', 'blocked') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);

ALTER TABLE public.official_website_domain_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.official_website_domain_reviews FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.official_website_domain_reviews TO service_role;

CREATE FUNCTION public.ops_list_official_website_domain_reviews(p_status TEXT DEFAULT NULL)
RETURNS TABLE (host_name TEXT, review_status TEXT, terms_url TEXT, review_reason TEXT, reviewed_at TIMESTAMPTZ, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'blocked') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid website-domain review status.';
  END IF;
  RETURN QUERY
  SELECT review.host_name, review.review_status, review.terms_url, review.review_reason, review.reviewed_at, review.updated_at
  FROM public.official_website_domain_reviews AS review
  WHERE p_status IS NULL OR review.review_status = p_status
  ORDER BY CASE review.review_status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, review.updated_at DESC, review.host_name;
END;
$$;

CREATE FUNCTION public.ops_decide_official_website_domain_review(p_host_name TEXT, p_action TEXT, p_terms_url TEXT, p_reason TEXT)
RETURNS TABLE (host_name TEXT, review_status TEXT, reviewed_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_host TEXT := lower(trim(coalesce(p_host_name, '')));
  v_action TEXT := lower(trim(coalesce(p_action, '')));
  v_terms TEXT := nullif(trim(coalesce(p_terms_url, '')), '');
  v_reason TEXT := nullif(trim(coalesce(p_reason, '')), '');
  v_status TEXT; v_before public.official_website_domain_reviews%ROWTYPE; v_had_before BOOLEAN;
  v_now TIMESTAMPTZ := timezone('utc'::text, now()); v_correlation_id UUID := extensions.uuid_generate_v4();
BEGIN
  IF v_host !~ '^[a-z0-9][a-z0-9.-]{0,251}[a-z0-9]$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Enter a valid website hostname.'; END IF;
  IF v_action NOT IN ('approve', 'block') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Choose approve or block.'; END IF;
  IF v_reason IS NULL OR length(v_reason) > 2000 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A review reason between 1 and 2,000 characters is required.'; END IF;
  IF v_action = 'approve' AND (v_terms IS NULL OR v_terms !~ '^https://[^[:space:]]+$') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An https terms or permission record is required before approval.'; END IF;
  IF v_terms IS NOT NULL AND v_terms !~ '^https://[^[:space:]]+$' THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Terms record must begin with https://.'; END IF;
  SELECT * INTO v_before FROM public.official_website_domain_reviews WHERE official_website_domain_reviews.host_name = v_host FOR UPDATE;
  v_had_before := FOUND;
  v_status := CASE WHEN v_action = 'approve' THEN 'approved' ELSE 'blocked' END;
  INSERT INTO public.official_website_domain_reviews (host_name, review_status, terms_url, review_reason, reviewed_by, reviewed_at, updated_at)
  VALUES (v_host, v_status, v_terms, v_reason, v_operator_id, v_now, v_now)
  ON CONFLICT (host_name) DO UPDATE SET review_status = EXCLUDED.review_status, terms_url = EXCLUDED.terms_url, review_reason = EXCLUDED.review_reason, reviewed_by = EXCLUDED.reviewed_by, reviewed_at = EXCLUDED.reviewed_at, updated_at = EXCLUDED.updated_at;
  INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data, correlation_id)
  VALUES ('operator', v_operator_id, 'official_website_domain_review_' || v_status, 'official_website_domain_review', v_host, v_reason,
    CASE WHEN v_had_before THEN jsonb_build_object('review_status', v_before.review_status) ELSE jsonb_build_object('review_status', NULL) END,
    jsonb_build_object('review_status', v_status, 'terms_recorded', v_terms IS NOT NULL, 'source_enabled_unchanged', true), v_correlation_id);
  RETURN QUERY SELECT v_host, v_status, v_now;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_list_official_website_domain_reviews(TEXT) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_decide_official_website_domain_review(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_list_official_website_domain_reviews(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_decide_official_website_domain_review(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.official_website_domain_reviews IS
  'Private operator decision record for D-021 domain terms/reuse review. Approval does not enable the source, collect a website, alter a vendor, or publish a fact.';
