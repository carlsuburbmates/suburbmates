-- A read-only, owner-scoped status feed for the dashboard. It deliberately
-- returns only status guidance, not listing data, raw operator notes, or IDs.
-- User Workflows owns the presentation; Ops owns this security boundary.

CREATE OR REPLACE FUNCTION public.list_current_owner_request_statuses()
RETURNS TABLE (
  request_type TEXT,
  request_status TEXT,
  safe_operator_reason TEXT,
  next_step TEXT,
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required.';
  END IF;

  RETURN QUERY
  SELECT
    'claim'::TEXT,
    claim.claim_status,
    CASE claim.claim_status
      WHEN 'pending' THEN 'Your claim is waiting for review.'
      WHEN 'needs_information' THEN 'SuburbMates needs more information before a decision can be made.'
      WHEN 'approved' THEN 'Your claim was approved.'
      WHEN 'rejected' THEN 'Your claim was not approved.'
      WHEN 'revoked' THEN 'Your ownership approval was removed.'
      WHEN 'withdrawn' THEN 'Your claim is no longer active.'
      ELSE 'Your claim has an updated status.'
    END,
    CASE claim.claim_status
      WHEN 'pending' THEN 'No action is needed while your claim is reviewed.'
      WHEN 'needs_information' THEN 'Reply to SuburbMates with the requested information.'
      WHEN 'approved' THEN 'You can now manage profile-change requests from your dashboard.'
      WHEN 'rejected' THEN 'Contact SuburbMates if you believe this decision is incorrect.'
      WHEN 'revoked' THEN 'Contact SuburbMates if you need help with this decision.'
      WHEN 'withdrawn' THEN 'Submit a new claim only if you are still the appropriate owner.'
      ELSE 'Check back later or contact SuburbMates if you need help.'
    END,
    claim.created_at,
    claim.decided_at
  FROM public.claim_requests AS claim
  WHERE claim.claimant_user_id = v_user_id

  UNION ALL

  SELECT
    'profile_change'::TEXT,
    change.change_status,
    CASE change.change_status
      WHEN 'pending' THEN 'Your profile changes are waiting for review.'
      WHEN 'approved' THEN 'Your profile changes were approved.'
      WHEN 'rejected' THEN 'Your profile changes were not approved.'
      WHEN 'withdrawn' THEN 'Your profile-change request is no longer active.'
      ELSE 'Your profile-change request has an updated status.'
    END,
    CASE change.change_status
      WHEN 'pending' THEN 'No action is needed while your changes are reviewed.'
      WHEN 'approved' THEN 'Refresh your public profile to see the approved changes.'
      WHEN 'rejected' THEN 'Review your listing and submit a fresh request when it is ready.'
      WHEN 'withdrawn' THEN 'Submit a new request only when you have changes ready for review.'
      ELSE 'Check back later or contact SuburbMates if you need help.'
    END,
    change.created_at,
    change.decided_at
  FROM public.listing_change_requests AS change
  WHERE change.submitted_by = v_user_id

  ORDER BY 5 DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_current_owner_request_statuses() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_current_owner_request_statuses() TO authenticated;

COMMENT ON FUNCTION public.list_current_owner_request_statuses() IS
  'Read-only owner-scoped status feed. Returns only safe request status guidance and never writes audit events or exposes listing data, identifiers, or operator notes.';
