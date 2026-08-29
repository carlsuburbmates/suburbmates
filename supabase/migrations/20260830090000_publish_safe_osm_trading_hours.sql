-- D-019: an exact, source-supplied opening-hours expression may be public only
-- after the ingestion policy has accepted it. The projection remains narrow:
-- it does not expose source, owner, moderation, payment or audit fields.
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS trading_hours TEXT
  CHECK (trading_hours IS NULL OR length(trim(trading_hours)) BETWEEN 3 AND 300);

CREATE OR REPLACE VIEW public.published_vendors
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  vendor.id,
  vendor.slug,
  vendor.business_name,
  vendor.category_slug,
  vendor.suburb_slug,
  vendor.contact_email,
  vendor.phone,
  vendor.website,
  vendor.description,
  vendor.tier,
  vendor.is_claimed,
  vendor.street_address,
  vendor.created_at,
  vendor.is_published,
  EXISTS (
    SELECT 1
    FROM public.listing_evidence AS evidence
    WHERE evidence.vendor_id = vendor.id
      AND evidence.evidence_type = 'abn_lookup'
      AND evidence.status = 'passed'
      AND evidence.evidence_data ->> 'abn_status' = 'active'
      AND evidence.checked_at >= timezone('utc'::text, now()) - interval '90 days'
      AND evidence.id = (
        SELECT latest.id
        FROM public.listing_evidence AS latest
        WHERE latest.vendor_id = vendor.id AND latest.evidence_type = 'abn_lookup'
        ORDER BY latest.checked_at DESC NULLS LAST, latest.created_at DESC
        LIMIT 1
      )
  ) AS abn_checked,
  vendor.trading_hours
FROM public.vendors AS vendor
WHERE vendor.is_published = true;

REVOKE ALL ON TABLE public.published_vendors FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.published_vendors TO anon, authenticated, service_role;
