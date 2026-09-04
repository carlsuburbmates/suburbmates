-- D-021 claimed-business pilot readiness. This is aggregate, operator-only
-- evidence; it neither enrols an owner nor changes any public profile.

CREATE FUNCTION public.ops_get_claimed_profile_pilot_summary()
RETURNS TABLE (claimed_profiles BIGINT, profiles_with_direct_action BIGINT, profiles_with_three_services BIGINT, profiles_with_owner_summary BIGINT, profiles_with_real_media BIGINT, quality_gate_ready BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.require_active_operator();
  RETURN QUERY WITH claimed AS (
    SELECT vendor.id, vendor.phone, vendor.contact_email, vendor.website, vendor.trading_hours, vendor.services, vendor.description
    FROM public.vendors AS vendor WHERE vendor.is_claimed = true AND vendor.ownership_status IN ('claimed', 'owner_verified')
  ), scored AS (
    SELECT claimed.*, EXISTS (SELECT 1 FROM public.listing_media_proposals AS media WHERE media.vendor_id = claimed.id AND media.proposal_status = 'approved' AND media.media_kind = 'listing_image') AS has_real_media FROM claimed
  ) SELECT count(*), count(*) FILTER (WHERE phone IS NOT NULL OR contact_email IS NOT NULL OR website IS NOT NULL), count(*) FILTER (WHERE cardinality(services) >= 3), count(*) FILTER (WHERE nullif(trim(description), '') IS NOT NULL), count(*) FILTER (WHERE has_real_media), count(*) FILTER (WHERE (phone IS NOT NULL OR contact_email IS NOT NULL OR website IS NOT NULL) AND nullif(trim(trading_hours), '') IS NOT NULL AND cardinality(services) >= 3 AND nullif(trim(description), '') IS NOT NULL AND has_real_media) FROM scored;
END;
$$;

REVOKE ALL ON FUNCTION public.ops_get_claimed_profile_pilot_summary() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.ops_get_claimed_profile_pilot_summary() TO authenticated;

COMMENT ON FUNCTION public.ops_get_claimed_profile_pilot_summary() IS 'Operator-only D-021 aggregate quality-gate counts for the genuine claimed-business pilot. It returns no owner, vendor, media, action or visitor identity.';
