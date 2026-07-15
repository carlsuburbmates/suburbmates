-- uuid-ossp is installed in Supabase's extensions schema. Keep the
-- SECURITY DEFINER search path explicit while allowing the UUID helper.
ALTER FUNCTION public.submit_claim_for_current_email(UUID, TEXT)
  SET search_path = public, auth, extensions;
