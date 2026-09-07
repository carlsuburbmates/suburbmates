-- The first explicit-HTML evidence cohort was deliberately evidence-only for
-- service headings. Row-level acceptance found FAQ/marketing headings and two
-- template contact placeholders. Reject only those bounded observations,
-- retain their provenance and record one immutable audit per affected vendor.
-- No public vendor field, publication state or ownership state is changed.

DO $$
DECLARE
  v_record RECORD;
  v_correlation UUID;
BEGIN
  FOR v_record IN
    WITH rejected AS (
      UPDATE public.listing_field_evidence AS evidence
      SET evidence_state = 'rejected',
          application_state = 'superseded',
          applied_at = NULL
      WHERE evidence.source_key = 'official_business_site'
        AND evidence.observed_at >= '2026-09-07T11:19:00Z'::TIMESTAMPTZ
        AND evidence.observed_at < '2026-09-07T11:20:00Z'::TIMESTAMPTZ
        AND (
          (
            evidence.field_name = 'service'
            AND evidence.confidence = 55
            AND evidence.application_state = 'observed'
            AND (
              evidence.value_text ~ '[?!]'
              OR lower(evidence.value_text) ~ '(faq|feedback|testimonial|review|why|what|how|choose|top-rated|free quote|rely on|different from|regions? we serve|areas? we service|our service areas|available every|hidden cost|belongings|listing below|priority|transparency|flexibility|types of|positive moving|solution|customisable services|safety and accountability|ancillary services offered)'
              OR lower(evidence.value_text) IN ('services', 'what we do', 'our services', 'contact', 'book', 'about', 'welcome', 'learn more', 'products and consumables')
            )
          )
          OR (evidence.field_name = 'contact_email' AND lower(evidence.value_text) = 'info@company.com')
          OR (evidence.field_name = 'phone' AND regexp_replace(evidence.value_text, '[^0-9]', '', 'g') = '1102209800')
        )
      RETURNING evidence.vendor_id, evidence.field_name
    )
    SELECT rejected.vendor_id,
      count(*)::INTEGER AS rejected_count,
      array_agg(DISTINCT rejected.field_name ORDER BY rejected.field_name) AS rejected_fields
    FROM rejected
    GROUP BY rejected.vendor_id
  LOOP
    v_correlation := extensions.uuid_generate_v4();
    INSERT INTO public.audit_events (
      actor_type, action, entity_type, entity_id, reason, after_data, correlation_id
    ) VALUES (
      'service', 'official_website_evidence_quality_rejected', 'vendor', v_record.vendor_id::TEXT,
      'Production acceptance rejected noisy service-heading evidence or template contact placeholders; no public field changed.',
      jsonb_build_object(
        'rejected_evidence_count', v_record.rejected_count,
        'rejected_fields', to_jsonb(v_record.rejected_fields),
        'evidence_retained', true,
        'public_values_unchanged', true,
        'ownership_unchanged', true,
        'publication_unchanged', true
      ),
      v_correlation
    );
  END LOOP;
END;
$$;
