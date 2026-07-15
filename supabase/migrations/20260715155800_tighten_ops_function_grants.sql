-- Operator actions must carry an authenticated operator JWT. The service role
-- is not an alternate claim-decision identity.
REVOKE ALL ON FUNCTION public.is_current_user_operator() FROM service_role;
REVOKE ALL ON FUNCTION public.ops_claim_overview() FROM service_role;
REVOKE ALL ON FUNCTION public.ops_list_claim_requests(TEXT, UUID, INTEGER, INTEGER) FROM service_role;
REVOKE ALL ON FUNCTION public.ops_decide_claim(UUID, TEXT, TEXT) FROM service_role;

GRANT EXECUTE ON FUNCTION public.is_current_user_operator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_claim_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_list_claim_requests(TEXT, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ops_decide_claim(UUID, TEXT, TEXT) TO authenticated;
