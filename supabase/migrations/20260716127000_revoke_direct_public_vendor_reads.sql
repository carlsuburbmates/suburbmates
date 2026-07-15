-- Public callers use public.published_vendors. The base table contains
-- ownership, payment, source, moderation, and lifecycle fields and must not
-- be exposed through the Data API.
REVOKE SELECT ON TABLE public.vendors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.vendors TO service_role;

COMMENT ON TABLE public.vendors IS 'Private canonical listing record. Public Data API reads must use public.published_vendors.';
