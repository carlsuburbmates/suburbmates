-- Private owner-media proposals. Storage stays private; no direct client
-- storage policy is granted. Approval never changes listing lifecycle or ownership.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('owner-media-proposals', 'owner-media-proposals', false, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 2097152, allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

CREATE TABLE IF NOT EXISTS public.listing_media_proposals (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  media_kind TEXT NOT NULL CHECK (media_kind IN ('logo', 'listing_image')),
  storage_path TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size INTEGER NOT NULL CHECK (byte_size > 0 AND byte_size <= 2097152),
  checksum_sha256 TEXT NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  alt_text TEXT NOT NULL CHECK (length(alt_text) BETWEEN 2 AND 160),
  source_basis TEXT NOT NULL CHECK (length(source_basis) BETWEEN 10 AND 1000),
  proposal_status TEXT NOT NULL DEFAULT 'pending' CHECK (proposal_status IN ('pending', 'approved', 'rejected', 'removed')),
  operator_reason TEXT,
  decided_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS listing_media_one_pending_kind_idx
  ON public.listing_media_proposals (vendor_id, media_kind)
  WHERE proposal_status = 'pending';
CREATE INDEX IF NOT EXISTS listing_media_vendor_status_idx
  ON public.listing_media_proposals (vendor_id, proposal_status, created_at DESC);

ALTER TABLE public.listing_media_proposals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.listing_media_proposals FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.listing_media_proposals TO service_role;

CREATE OR REPLACE FUNCTION public.submit_owner_media_proposal(
  p_vendor_id UUID, p_media_kind TEXT, p_storage_path TEXT, p_content_type TEXT,
  p_byte_size INTEGER, p_checksum_sha256 TEXT, p_alt_text TEXT, p_source_basis TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_kind TEXT := lower(trim(coalesce(p_media_kind, '')));
  v_path TEXT := trim(coalesce(p_storage_path, ''));
  v_type TEXT := lower(trim(coalesce(p_content_type, '')));
  v_checksum TEXT := lower(trim(coalesce(p_checksum_sha256, '')));
  v_alt TEXT := trim(coalesce(p_alt_text, ''));
  v_basis TEXT := trim(coalesce(p_source_basis, ''));
  v_id UUID;
  v_vendor public.vendors%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Sign in to propose media.'; END IF;
  SELECT * INTO v_vendor FROM public.vendors WHERE id = p_vendor_id FOR UPDATE;
  IF NOT FOUND OR v_vendor.owner_id IS DISTINCT FROM v_user_id OR NOT v_vendor.is_claimed OR v_vendor.ownership_status NOT IN ('claimed', 'owner_verified') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Only the claimed owner can propose media for this listing.';
  END IF;
  IF v_kind NOT IN ('logo', 'listing_image') OR v_type NOT IN ('image/jpeg', 'image/png', 'image/webp') OR p_byte_size IS NULL OR p_byte_size < 1 OR p_byte_size > 2097152 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The media file is not supported.';
  END IF;
  IF v_checksum !~ '^[0-9a-f]{64}$' OR v_path !~ '^proposals/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The media upload reference is invalid.';
  END IF;
  IF length(v_alt) NOT BETWEEN 2 AND 160 OR length(v_basis) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Describe the media and your permission to use it.';
  END IF;

  INSERT INTO public.listing_media_proposals (vendor_id, submitted_by, media_kind, storage_path, content_type, byte_size, checksum_sha256, alt_text, source_basis)
  VALUES (p_vendor_id, v_user_id, v_kind, v_path, v_type, p_byte_size, v_checksum, v_alt, v_basis)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, after_data)
  VALUES ('owner', v_user_id, 'owner_media_proposed', 'listing_media_proposal', v_id::text, 'Owner submitted private media for moderation.', jsonb_build_object('vendor_id', p_vendor_id, 'media_kind', v_kind, 'proposal_status', 'pending', 'publication_unchanged', v_vendor.is_published));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_current_owner_media_proposals()
RETURNS TABLE (proposal_id UUID, vendor_id UUID, business_name TEXT, media_kind TEXT, proposal_status TEXT, alt_text TEXT, operator_reason TEXT, created_at TIMESTAMPTZ, decided_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT proposal.id, proposal.vendor_id, vendor.business_name, proposal.media_kind, proposal.proposal_status, proposal.alt_text, proposal.operator_reason, proposal.created_at, proposal.decided_at
  FROM public.listing_media_proposals proposal
  JOIN public.vendors vendor ON vendor.id = proposal.vendor_id
  WHERE proposal.submitted_by = auth.uid()
  ORDER BY proposal.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.ops_list_media_proposals(p_status TEXT DEFAULT NULL, p_vendor_id UUID DEFAULT NULL)
RETURNS TABLE (proposal_id UUID, vendor_id UUID, business_name TEXT, media_kind TEXT, storage_path TEXT, content_type TEXT, byte_size INTEGER, alt_text TEXT, source_basis TEXT, proposal_status TEXT, operator_reason TEXT, created_at TIMESTAMPTZ, decided_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_active_operator();
  IF p_status IS NOT NULL AND p_status NOT IN ('pending', 'approved', 'rejected', 'removed') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Invalid media status.'; END IF;
  RETURN QUERY SELECT proposal.id, proposal.vendor_id, vendor.business_name, proposal.media_kind, proposal.storage_path, proposal.content_type, proposal.byte_size, proposal.alt_text, proposal.source_basis, proposal.proposal_status, proposal.operator_reason, proposal.created_at, proposal.decided_at
  FROM public.listing_media_proposals proposal JOIN public.vendors vendor ON vendor.id = proposal.vendor_id
  WHERE (p_status IS NULL OR proposal.proposal_status = p_status) AND (p_vendor_id IS NULL OR proposal.vendor_id = p_vendor_id)
  ORDER BY CASE WHEN proposal.proposal_status = 'pending' THEN 0 ELSE 1 END, proposal.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.ops_decide_media_proposal(p_proposal_id UUID, p_action TEXT, p_reason TEXT)
RETURNS TABLE (proposal_id UUID, vendor_id UUID, proposal_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_action TEXT := lower(trim(coalesce(p_action, '')));
  v_reason TEXT := trim(coalesce(p_reason, ''));
  v_proposal public.listing_media_proposals%ROWTYPE;
  v_vendor public.vendors%ROWTYPE;
  v_status TEXT;
BEGIN
  IF v_action NOT IN ('approve', 'reject', 'remove') OR length(v_reason) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Enter a valid media decision and reason.'; END IF;
  SELECT * INTO v_proposal FROM public.listing_media_proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Media proposal was not found.'; END IF;
  SELECT * INTO v_vendor FROM public.vendors WHERE id = v_proposal.vendor_id FOR UPDATE;
  IF v_action IN ('approve', 'reject') AND v_proposal.proposal_status <> 'pending' THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Only a pending proposal can be approved or rejected.'; END IF;
  IF v_action = 'remove' AND v_proposal.proposal_status <> 'approved' THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='Only approved media can be removed.'; END IF;
  v_status := CASE v_action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE 'removed' END;
  UPDATE public.listing_media_proposals SET proposal_status=v_status, operator_reason=v_reason, decided_by=v_operator_id, decided_at=timezone('utc'::text, now()), updated_at=timezone('utc'::text, now()) WHERE id=v_proposal.id;
  INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data)
  VALUES ('operator', v_operator_id, 'owner_media_' || v_status, 'listing_media_proposal', v_proposal.id::text, v_reason, jsonb_build_object('proposal_status', v_proposal.proposal_status, 'vendor_id', v_proposal.vendor_id, 'publication_unchanged', v_vendor.is_published), jsonb_build_object('proposal_status', v_status, 'vendor_id', v_proposal.vendor_id, 'publication_unchanged', v_vendor.is_published));
  RETURN QUERY SELECT v_proposal.id, v_proposal.vendor_id, v_status;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_vendor_media(p_vendor_id UUID)
RETURNS TABLE (media_id UUID, media_kind TEXT, alt_text TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT proposal.id, proposal.media_kind, proposal.alt_text
  FROM public.listing_media_proposals proposal
  JOIN public.vendors vendor ON vendor.id = proposal.vendor_id
  WHERE proposal.vendor_id = p_vendor_id AND proposal.proposal_status = 'approved' AND vendor.is_published = true
  ORDER BY CASE WHEN proposal.media_kind = 'logo' THEN 0 ELSE 1 END, proposal.created_at ASC;
$$;

CREATE OR REPLACE FUNCTION public.resolve_public_media(p_media_id UUID)
RETURNS TABLE (storage_path TEXT, content_type TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT proposal.storage_path, proposal.content_type
  FROM public.listing_media_proposals proposal
  JOIN public.vendors vendor ON vendor.id = proposal.vendor_id
  WHERE proposal.id = p_media_id AND proposal.proposal_status = 'approved' AND vendor.is_published = true;
$$;

REVOKE ALL ON FUNCTION public.submit_owner_media_proposal(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.list_current_owner_media_proposals() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_list_media_proposals(TEXT, UUID) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.ops_decide_media_proposal(UUID, TEXT, TEXT) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION public.list_public_vendor_media(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_public_media(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_owner_media_proposal(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_current_owner_media_proposals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_media_proposals(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_decide_media_proposal(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_vendor_media(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_public_media(UUID) TO anon, authenticated;

COMMENT ON TABLE public.listing_media_proposals IS 'Private, moderated owner media. Storage objects remain private until an approved application route serves them after public release.';
