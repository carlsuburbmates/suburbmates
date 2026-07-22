-- The media review reader verifies the currently signed-in operator, so it
-- must not be advertised to PostgreSQL as stable.
ALTER FUNCTION public.ops_list_media_proposals(TEXT, UUID) VOLATILE;
