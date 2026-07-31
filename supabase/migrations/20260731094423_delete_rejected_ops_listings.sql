-- A permanent deletion is exceptional. It is available only for a never-public
-- rejected listing with no linked operational records, and it retains an
-- append-only audit event after the vendor row is removed.

CREATE FUNCTION public.ops_delete_rejected_listing(
  p_vendor_id UUID,
  p_operator_note TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_operator_id UUID := private.require_active_operator();
  v_note TEXT := nullif(trim(coalesce(p_operator_note, '')), '');
  v_vendor public.vendors%ROWTYPE;
BEGIN
  IF v_note IS NULL OR length(v_note) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A deletion reason between 1 and 2,000 characters is required.';
  END IF;

  SELECT * INTO v_vendor
  FROM public.vendors AS vendor
  WHERE vendor.id = p_vendor_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '02000', MESSAGE = 'Listing not found.';
  END IF;
  IF v_vendor.listing_status IS DISTINCT FROM 'rejected' OR v_vendor.is_published OR v_vendor.published_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Only a never-public rejected listing can be permanently deleted.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.claim_requests WHERE vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.listing_evidence WHERE vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.listing_change_requests WHERE vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.operator_listing_drafts WHERE vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.vendor_slug_redirects WHERE vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.business_submission_requests WHERE vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.candidate_handoff_records WHERE vendor_id = p_vendor_id OR duplicate_vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.listing_media_proposals WHERE vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.existing_catalogue_requalification_records WHERE vendor_id = p_vendor_id OR duplicate_vendor_id = p_vendor_id)
    OR EXISTS (SELECT 1 FROM public.emails_queue WHERE vendor_id = p_vendor_id) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'This rejected listing has linked operational records and must be retained.';
  END IF;

  INSERT INTO public.audit_events (
    actor_type, actor_user_id, action, entity_type, entity_id, reason, before_data, after_data
  ) VALUES (
    'operator', v_operator_id, 'rejected_listing_permanently_deleted', 'vendor', p_vendor_id::text, v_note,
    jsonb_build_object(
      'business_name', v_vendor.business_name,
      'listing_status', v_vendor.listing_status,
      'is_published', v_vendor.is_published,
      'moderation_reason', v_vendor.moderation_reason,
      'rejected_at', v_vendor.rejected_at
    ),
    jsonb_build_object('deleted', true)
  );

  DELETE FROM public.vendors WHERE id = p_vendor_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_delete_rejected_listing(UUID, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_delete_rejected_listing(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.ops_delete_rejected_listing(UUID, TEXT) IS
  'Operator-only permanent deletion for one never-public rejected listing with no linked operational records; audit history remains.';
