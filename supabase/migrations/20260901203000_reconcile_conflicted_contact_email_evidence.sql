-- A source handoff can retain field evidence before its final vendor update.
-- If that update is rejected by the unique contact-email constraint, the
-- conflict record is authoritative: the email was never public on that vendor.
-- Reconcile only that proven inconsistent state; do not alter values, listings,
-- source records, ownership, or audit history.
UPDATE public.listing_field_evidence AS evidence
SET
  evidence_state = 'conflict',
  application_state = 'conflict',
  applied_at = NULL
FROM public.vendors AS vendor,
     public.catalogue_field_conflicts AS conflict
WHERE evidence.vendor_id = vendor.id
  AND conflict.vendor_id = vendor.id
  AND conflict.incoming_evidence_id = evidence.id
  AND evidence.field_name = 'contact_email'
  AND evidence.evidence_state = 'active'
  AND evidence.application_state = 'applied'
  AND vendor.contact_email IS NULL;
