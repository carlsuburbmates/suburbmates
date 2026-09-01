-- The review-first profile-change workflow superseded this direct owner write.
-- It was previously revoked, but retaining it leaves an unnecessary privileged
-- mutation implementation in the database.
DROP FUNCTION IF EXISTS public.update_vendor_profile(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
