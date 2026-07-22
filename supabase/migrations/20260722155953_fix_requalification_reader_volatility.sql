-- The reader verifies the current operator, so PostgreSQL must not treat it
-- as a stable function.
ALTER FUNCTION public.ops_list_existing_catalogue_requalification_exceptions(TEXT, INTEGER, INTEGER) VOLATILE;
