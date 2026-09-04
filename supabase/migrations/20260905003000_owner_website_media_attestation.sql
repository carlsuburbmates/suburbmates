-- D-021: an owner may nominate one exact image from their recorded website
-- after attesting to reuse rights. The retrieved copy stays private and uses
-- the existing proposal/moderation lifecycle.

ALTER TABLE public.listing_media_proposals
  ADD COLUMN IF NOT EXISTS origin_url TEXT,
  ADD COLUMN IF NOT EXISTS rights_attested_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.submit_owner_website_media_proposal(
  p_vendor_id UUID, p_media_kind TEXT, p_storage_path TEXT, p_content_type TEXT,
  p_byte_size INTEGER, p_checksum_sha256 TEXT, p_alt_text TEXT, p_origin_url TEXT,
  p_source_basis TEXT
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id UUID := auth.uid(); v_vendor public.vendors%ROWTYPE; v_id UUID;
  v_kind TEXT := lower(trim(coalesce(p_media_kind, ''))); v_path TEXT := trim(coalesce(p_storage_path, ''));
  v_type TEXT := lower(trim(coalesce(p_content_type, ''))); v_checksum TEXT := lower(trim(coalesce(p_checksum_sha256, '')));
  v_alt TEXT := trim(coalesce(p_alt_text, '')); v_origin TEXT := trim(coalesce(p_origin_url, '')); v_basis TEXT := trim(coalesce(p_source_basis, ''));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Sign in to propose media.'; END IF;
  SELECT * INTO v_vendor FROM public.vendors WHERE id = p_vendor_id FOR UPDATE;
  IF NOT FOUND OR v_vendor.owner_id IS DISTINCT FROM v_user_id OR NOT v_vendor.is_claimed OR v_vendor.ownership_status NOT IN ('claimed', 'owner_verified') THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Only the claimed owner can propose media for this listing.'; END IF;
  IF v_kind NOT IN ('logo', 'listing_image') OR v_type NOT IN ('image/jpeg', 'image/png', 'image/webp') OR p_byte_size NOT BETWEEN 1 AND 2097152 OR v_checksum !~ '^[0-9a-f]{64}$' OR v_path !~ '^proposals/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='The media file is not supported.'; END IF;
  IF v_alt !~ '^.{2,160}$' OR v_origin !~ '^https://[^[:space:]]+$' OR length(v_basis) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='Describe the image, source and your permission to use it.'; END IF;
  INSERT INTO public.listing_media_proposals (vendor_id, submitted_by, media_kind, storage_path, content_type, byte_size, checksum_sha256, alt_text, source_basis, origin_url, rights_attested_at)
  VALUES (p_vendor_id, v_user_id, v_kind, v_path, v_type, p_byte_size, v_checksum, v_alt, v_basis, v_origin, timezone('utc'::text, now())) RETURNING id INTO v_id;
  INSERT INTO public.audit_events (actor_type, actor_user_id, action, entity_type, entity_id, reason, after_data)
  VALUES ('owner', v_user_id, 'owner_website_media_proposed', 'listing_media_proposal', v_id::text, 'Owner attested to rights for a same-domain website image; private moderation required.', jsonb_build_object('vendor_id', p_vendor_id, 'proposal_status', 'pending', 'publication_unchanged', v_vendor.is_published, 'origin_url_retained_privately', true));
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_owner_website_media_proposal(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_owner_website_media_proposal(UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;
