-- Operator-only listing lifecycle controls. Publication remains independent
-- from ownership, payment, tier, ABN and AI output.

DROP FUNCTION IF EXISTS public.ops_list_listings(TEXT, TEXT, UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.ops_decide_listing(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.ops_listing_overview();

CREATE TABLE IF NOT EXISTS public.operator_listing_drafts (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  draft_status TEXT NOT NULL DEFAULT 'active' CHECK (draft_status IN ('active', 'applied', 'discarded')),
  base_values JSONB NOT NULL CHECK (jsonb_typeof(base_values) = 'object'),
  draft_values JSONB NOT NULL CHECK (jsonb_typeof(draft_values) = 'object'),
  edited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  operator_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE UNIQUE INDEX IF NOT EXISTS operator_listing_drafts_one_active_idx
  ON public.operator_listing_drafts (vendor_id) WHERE draft_status = 'active';
CREATE INDEX IF NOT EXISTS operator_listing_drafts_vendor_created_idx
  ON public.operator_listing_drafts (vendor_id, created_at DESC);
ALTER TABLE public.operator_listing_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.operator_listing_drafts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.operator_listing_drafts TO service_role;

CREATE OR REPLACE FUNCTION public.ops_save_listing_draft(
  p_vendor_id UUID,
  p_business_name TEXT,
  p_category_slug TEXT,
  p_suburb_slug TEXT,
  p_street_address TEXT,
  p_contact_email TEXT,
  p_phone TEXT,
  p_website TEXT,
  p_description TEXT,
  p_operator_note TEXT
)
RETURNS TABLE (draft_id UUID, vendor_id UUID, draft_status TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_vendor public.vendors%ROWTYPE;
  v_draft public.operator_listing_drafts%ROWTYPE;
  v_name TEXT := trim(coalesce(p_business_name, ''));
  v_category TEXT := nullif(trim(coalesce(p_category_slug, '')), '');
  v_suburb TEXT := nullif(trim(coalesce(p_suburb_slug, '')), '');
  v_address TEXT := nullif(trim(coalesce(p_street_address, '')), '');
  v_email TEXT := nullif(lower(trim(coalesce(p_contact_email, ''))), '');
  v_phone TEXT := nullif(trim(coalesce(p_phone, '')), '');
  v_website TEXT := nullif(trim(coalesce(p_website, '')), '');
  v_description TEXT := nullif(trim(coalesce(p_description, '')), '');
  v_note TEXT := nullif(trim(coalesce(p_operator_note, '')), '');
  v_base JSONB;
  v_values JSONB;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_correlation_id UUID := extensions.uuid_generate_v4();
BEGIN
  SELECT * INTO v_vendor FROM public.vendors AS vendor WHERE vendor.id = p_vendor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Listing not found.'; END IF;

  IF length(v_name) < 2 OR length(v_name) > 200 OR v_category IS NULL OR v_suburb IS NULL
    OR length(coalesce(v_address, '')) > 500 OR length(coalesce(v_email, '')) > 320
    OR length(coalesce(v_phone, '')) > 80 OR length(coalesce(v_website, '')) > 1000
    OR length(coalesce(v_description, '')) > 5000 OR length(coalesce(v_note, '')) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'One or more draft fields are missing or exceed the allowed length.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.categories AS category WHERE category.slug = v_category)
    OR NOT EXISTS (SELECT 1 FROM public.suburbs AS suburb WHERE suburb.slug = v_suburb) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Select a valid category and location.';
  END IF;
  IF v_email IS NOT NULL AND v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The public contact email is invalid.';
  END IF;
  IF v_website IS NOT NULL AND v_website !~* '^https?://[^[:space:]]+$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The public website URL is invalid.';
  END IF;

  v_base := jsonb_build_object(
    'business_name', v_vendor.business_name, 'category_slug', v_vendor.category_slug,
    'suburb_slug', v_vendor.suburb_slug, 'street_address', v_vendor.street_address,
    'contact_email', v_vendor.contact_email, 'phone', v_vendor.phone,
    'website', v_vendor.website, 'description', v_vendor.description
  );
  v_values := jsonb_build_object(
    'business_name', v_name, 'category_slug', v_category,
    'suburb_slug', v_suburb, 'street_address', v_address,
    'contact_email', v_email, 'phone', v_phone,
    'website', v_website, 'description', v_description
  );

  SELECT * INTO v_draft
  FROM public.operator_listing_drafts AS draft
  WHERE draft.vendor_id = p_vendor_id AND draft.draft_status = 'active'
  FOR UPDATE;

  IF FOUND THEN
    UPDATE public.operator_listing_drafts AS draft
    SET base_values = v_base, draft_values = v_values, edited_by = v_operator_id,
        operator_note = v_note, updated_at = v_now
    WHERE draft.id = v_draft.id
    RETURNING * INTO v_draft;
  ELSE
    INSERT INTO public.operator_listing_drafts (
      vendor_id, base_values, draft_values, edited_by, operator_note
    ) VALUES (p_vendor_id, v_base, v_values, v_operator_id, v_note)
    RETURNING * INTO v_draft;
  END IF;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'operator', v_operator_id, 'listing_draft_saved', 'vendor', p_vendor_id::text, v_note,
    v_base || jsonb_build_object('listing_status', v_vendor.listing_status, 'is_published', v_vendor.is_published),
    v_values || jsonb_build_object('listing_status', v_vendor.listing_status, 'is_published', v_vendor.is_published, 'draft_id', v_draft.id),
    v_correlation_id
  );

  RETURN QUERY SELECT v_draft.id, v_draft.vendor_id, v_draft.draft_status, v_draft.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_listing_overview()
RETURNS TABLE (
  review_count BIGINT,
  published_count BIGINT,
  rejected_count BIGINT,
  unpublished_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  RETURN QUERY
  SELECT
    count(*) FILTER (WHERE vendor.listing_status IS NULL OR vendor.listing_status IN ('draft', 'pending_review')),
    count(*) FILTER (WHERE vendor.listing_status = 'published'),
    count(*) FILTER (WHERE vendor.listing_status = 'rejected'),
    count(*) FILTER (WHERE vendor.listing_status = 'unpublished')
  FROM public.vendors AS vendor;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_listings(
  p_status TEXT DEFAULT 'review',
  p_query TEXT DEFAULT NULL,
  p_vendor_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  vendor_id UUID,
  business_name TEXT,
  category_slug TEXT,
  suburb_slug TEXT,
  street_address TEXT,
  contact_email TEXT,
  phone TEXT,
  website TEXT,
  description TEXT,
  listing_status TEXT,
  listing_source TEXT,
  ownership_status TEXT,
  is_published BOOLEAN,
  is_claimed BOOLEAN,
  tier TEXT,
  moderation_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  unpublished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  active_draft_id UUID,
  draft_base_values JSONB,
  draft_values JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT := lower(trim(coalesce(p_status, 'review')));
  v_query TEXT := nullif(trim(coalesce(p_query, '')), '');
BEGIN
  PERFORM private.require_active_operator();
  IF v_status NOT IN ('review', 'unclassified', 'draft', 'pending_review', 'published', 'rejected', 'unpublished', 'all') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid listing status filter.';
  END IF;
  IF p_limit < 1 OR p_limit > 200 OR p_offset < 0 OR length(coalesce(v_query, '')) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid listing search or pagination values.';
  END IF;

  RETURN QUERY
  SELECT
    vendor.id, vendor.business_name, vendor.category_slug, vendor.suburb_slug,
    vendor.street_address, vendor.contact_email, vendor.phone, vendor.website, vendor.description,
    vendor.listing_status, vendor.listing_source, vendor.ownership_status,
    vendor.is_published, vendor.is_claimed, vendor.tier, vendor.moderation_reason,
    vendor.reviewed_at, vendor.published_at, vendor.rejected_at, vendor.unpublished_at,
    vendor.created_at, vendor.updated_at,
    active_draft.id, active_draft.base_values, active_draft.draft_values
  FROM public.vendors AS vendor
  LEFT JOIN LATERAL (
    SELECT draft.id, draft.base_values, draft.draft_values
    FROM public.operator_listing_drafts AS draft
    WHERE draft.vendor_id = vendor.id AND draft.draft_status = 'active'
    LIMIT 1
  ) AS active_draft ON true
  WHERE (p_vendor_id IS NULL OR vendor.id = p_vendor_id)
    AND (v_query IS NULL OR vendor.business_name ILIKE '%' || replace(replace(replace(v_query, '\\', '\\\\'), '%', '\\%'), '_', '\\_') || '%' ESCAPE '\\')
    AND (
      v_status = 'all'
      OR (v_status = 'review' AND (vendor.listing_status IS NULL OR vendor.listing_status IN ('draft', 'pending_review')))
      OR (v_status = 'unclassified' AND vendor.listing_status IS NULL)
      OR vendor.listing_status = v_status
    )
  ORDER BY
    CASE WHEN vendor.listing_status IS NULL OR vendor.listing_status IN ('draft', 'pending_review') THEN 0 ELSE 1 END,
    vendor.updated_at DESC,
    vendor.business_name
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_decide_listing(
  p_vendor_id UUID,
  p_action TEXT,
  p_reason_code TEXT,
  p_operator_note TEXT
)
RETURNS TABLE (
  vendor_id UUID,
  listing_status TEXT,
  is_published BOOLEAN,
  ownership_status TEXT,
  tier TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_action TEXT := lower(trim(coalesce(p_action, '')));
  v_reason_code TEXT := nullif(lower(trim(coalesce(p_reason_code, ''))), '');
  v_operator_note TEXT := nullif(trim(coalesce(p_operator_note, '')), '');
  v_reason TEXT;
  v_vendor public.vendors%ROWTYPE;
  v_draft public.operator_listing_drafts%ROWTYPE;
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_new_status TEXT;
  v_new_published BOOLEAN;
  v_correlation_id UUID := extensions.uuid_generate_v4();
BEGIN
  IF v_action NOT IN ('publish', 'approve_changes', 'reject', 'unpublish', 'restore') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid listing decision.';
  END IF;
  IF v_operator_note IS NULL OR length(v_operator_note) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A decision basis or note between 1 and 2,000 characters is required.';
  END IF;
  IF v_action = 'reject' AND v_reason_code NOT IN (
    'obvious_spam', 'business_not_found', 'outside_geographic_scope', 'unsupported_category',
    'malicious_or_misleading_website', 'duplicate_listing', 'insufficient_evidence',
    'prohibited_content', 'business_closed', 'invalid_submission', 'other'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Select a valid rejection reason.';
  END IF;
  IF v_action = 'unpublish' AND v_reason_code NOT IN (
    'business_closed', 'unsafe_outbound_url', 'inaccurate_listing', 'duplicate_listing',
    'ownership_dispute', 'privacy_or_legal_concern', 'investigation', 'operator_decision',
    'payment_presentation_correction', 'other'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Select a valid unpublication reason.';
  END IF;
  v_reason := concat_ws(': ', v_reason_code, v_operator_note);

  SELECT * INTO v_vendor
  FROM public.vendors AS vendor
  WHERE vendor.id = p_vendor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Listing not found.';
  END IF;

  IF v_action IN ('publish', 'approve_changes') THEN
    IF v_action = 'publish' AND (v_vendor.is_published OR v_vendor.listing_status IS DISTINCT FROM 'pending_review') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Only a pending-review listing can be published.';
    END IF;
    IF v_action = 'approve_changes' AND (NOT v_vendor.is_published OR v_vendor.listing_status <> 'published') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Only a published listing can receive approved public changes.';
    END IF;

    SELECT * INTO v_draft
    FROM public.operator_listing_drafts AS draft
    WHERE draft.vendor_id = p_vendor_id AND draft.draft_status = 'active'
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Save an operator draft before approval.';
    END IF;

    IF v_draft.base_values IS DISTINCT FROM jsonb_build_object(
      'business_name', v_vendor.business_name, 'category_slug', v_vendor.category_slug,
      'suburb_slug', v_vendor.suburb_slug, 'street_address', v_vendor.street_address,
      'contact_email', v_vendor.contact_email, 'phone', v_vendor.phone,
      'website', v_vendor.website, 'description', v_vendor.description
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'The listing changed after this draft was saved. Save a fresh draft before deciding.';
    END IF;

    IF length(trim(coalesce(v_draft.draft_values ->> 'business_name', ''))) < 2
      OR nullif(v_draft.draft_values ->> 'category_slug', '') IS NULL
      OR nullif(v_draft.draft_values ->> 'suburb_slug', '') IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Business name, category and location are required before approval.';
    END IF;

    v_new_status := 'published';
    v_new_published := true;

    UPDATE public.vendors AS vendor
    SET business_name = v_draft.draft_values ->> 'business_name',
        category_slug = v_draft.draft_values ->> 'category_slug',
        suburb_slug = v_draft.draft_values ->> 'suburb_slug',
        street_address = nullif(v_draft.draft_values ->> 'street_address', ''),
        contact_email = nullif(v_draft.draft_values ->> 'contact_email', ''),
        phone = nullif(v_draft.draft_values ->> 'phone', ''),
        website = nullif(v_draft.draft_values ->> 'website', ''),
        description = nullif(v_draft.draft_values ->> 'description', ''),
        listing_status = v_new_status, is_published = true,
        moderation_reason = v_reason, reviewed_by = v_operator_id, reviewed_at = v_now,
        published_at = CASE WHEN v_action = 'publish' THEN v_now ELSE vendor.published_at END,
        updated_at = v_now
    WHERE vendor.id = p_vendor_id;

    UPDATE public.operator_listing_drafts AS draft
    SET draft_status = 'applied', updated_at = v_now
    WHERE draft.id = v_draft.id;

  ELSIF v_action = 'reject' THEN
    IF v_vendor.is_published OR v_vendor.listing_status IS DISTINCT FROM 'pending_review' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Only a pending-review listing can be rejected.';
    END IF;
    v_new_status := 'rejected';
    v_new_published := false;

    UPDATE public.vendors AS vendor
    SET listing_status = v_new_status, is_published = false,
        moderation_reason = v_reason, reviewed_by = v_operator_id, reviewed_at = v_now,
        rejected_at = v_now, updated_at = v_now
    WHERE vendor.id = p_vendor_id;

  ELSIF v_action = 'unpublish' THEN
    IF NOT v_vendor.is_published OR v_vendor.listing_status <> 'published' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Only a published listing can be unpublished.';
    END IF;
    v_new_status := 'unpublished';
    v_new_published := false;

    UPDATE public.vendors AS vendor
    SET listing_status = v_new_status, is_published = false,
        moderation_reason = v_reason, reviewed_by = v_operator_id, reviewed_at = v_now,
        unpublished_at = v_now, updated_at = v_now
    WHERE vendor.id = p_vendor_id;

  ELSE
    IF v_vendor.is_published OR NOT (
      v_vendor.listing_status IS NULL OR v_vendor.listing_status IN ('draft', 'rejected', 'unpublished')
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Only a draft, unclassified, rejected or unpublished listing can move to review.';
    END IF;
    v_new_status := 'pending_review';
    v_new_published := false;

    UPDATE public.vendors AS vendor
    SET listing_status = v_new_status, is_published = false,
        moderation_reason = v_reason, reviewed_by = v_operator_id, reviewed_at = v_now,
        updated_at = v_now
    WHERE vendor.id = p_vendor_id;
  END IF;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason,
    before_data, after_data, correlation_id
  ) VALUES (
    'operator', v_operator_id,
    CASE v_action
      WHEN 'publish' THEN 'listing_published'
      WHEN 'approve_changes' THEN 'listing_changes_approved'
      WHEN 'reject' THEN 'listing_rejected'
      WHEN 'unpublish' THEN 'listing_unpublished'
      ELSE 'listing_restored_for_review'
    END,
    'vendor', p_vendor_id::text, v_reason,
    jsonb_build_object(
      'listing_status', v_vendor.listing_status, 'is_published', v_vendor.is_published,
      'ownership_status', v_vendor.ownership_status, 'tier', v_vendor.tier,
      'public_values', CASE WHEN v_action IN ('publish', 'approve_changes') THEN v_draft.base_values ELSE NULL END
    ),
    jsonb_build_object(
      'listing_status', v_new_status, 'is_published', v_new_published,
      'ownership_status', v_vendor.ownership_status, 'tier', v_vendor.tier,
      'public_values', CASE WHEN v_action IN ('publish', 'approve_changes') THEN v_draft.draft_values ELSE NULL END
    ),
    v_correlation_id
  );

  RETURN QUERY
  SELECT vendor.id, vendor.listing_status, vendor.is_published, vendor.ownership_status, vendor.tier
  FROM public.vendors AS vendor
  WHERE vendor.id = p_vendor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_listing_overview() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_save_listing_draft(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_list_listings(TEXT, TEXT, UUID, INTEGER, INTEGER) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_decide_listing(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_listing_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_save_listing_draft(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_listings(TEXT, TEXT, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_decide_listing(UUID, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.ops_decide_listing(UUID, TEXT, TEXT, TEXT) IS
  'Operator-only listing lifecycle decision; applies only an explicit operator draft and never changes ownership, tier, payment or ABN.';
