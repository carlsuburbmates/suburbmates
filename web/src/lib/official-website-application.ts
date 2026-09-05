import { inspectOfficialWebsite, type OfficialWebsiteInspection } from "@/lib/official-website-enrichment";
import { planOfficialWebsiteApplication, type OfficialWebsiteApplicationVendor } from "@/lib/official-website-application-plan";
import { createAdminClient } from "@/utils/supabase/admin";

const SOURCE_KEY = "official_business_site";
const SOURCE_CONTRACT_VERSION = "official-business-site-application-v3";
const REFRESH_DAYS = 31;

type Vendor = OfficialWebsiteApplicationVendor;

function hostname(value: string) { try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } }
function reasonCode(inspection: OfficialWebsiteInspection) {
  const reason = inspection.reason ?? ""; if (inspection.outcome === "eligible") return "eligible";
  if (/robots.*disallow/i.test(reason)) return "robots_disallowed"; if (/robots/i.test(reason)) return "robots_unavailable";
  if (/terms require operator review/i.test(reason)) return "terms_pending";
  if (/redirected away/i.test(reason)) return "redirect_outside_domain"; if (/redirect/i.test(reason)) return "redirect_unsupported";
  if (/not return HTML/i.test(reason)) return "non_html"; if (/too large/i.test(reason)) return "page_too_large"; if (/eligible/i.test(reason)) return "invalid_url"; return "site_unavailable";
}
function robotsStatus(inspection: OfficialWebsiteInspection) { if (inspection.outcome === "eligible") return "allowed"; if (/robots.*disallow/i.test(inspection.reason ?? "")) return "disallowed"; return /robots/i.test(inspection.reason ?? "") ? "unavailable" : "unsupported"; }
function freshnessDueAt(checkedAt: string) { const date = new Date(checkedAt); date.setUTCDate(date.getUTCDate() + REFRESH_DAYS); return date.toISOString(); }

async function recordHealth(status: "running" | "healthy" | "failed", error: string | null, runId?: string) {
  const now = new Date().toISOString(); const result = await createAdminClient().from("integration_health").upsert({ integration_name: "official_website_enrichment", status, last_success_at: status === "healthy" ? now : undefined, last_failure_at: status === "failed" ? now : undefined, last_error: error, updated_at: now, metadata: { source: SOURCE_KEY, source_contract: SOURCE_CONTRACT_VERSION, run_id: runId ?? null } }, { onConflict: "integration_name" });
  if (result.error) throw new Error("Could not record official-website enrichment health.");
}

export async function runOfficialWebsiteEnrichment(runKey: string, requestedLimit: number) {
  const admin = createAdminClient(); const limit = Math.min(Math.max(requestedLimit, 1), 1);
  const staleBefore = new Date(Date.now() - 5 * 60_000).toISOString();
  const { error: recoveryError } = await admin.from("catalogue_enrichment_runs").update({ status: "failed", error_message: "Execution ended before the bounded batch completed; a later batch may safely continue.", completed_at: new Date().toISOString() }).eq("source_key", SOURCE_KEY).eq("source_contract_version", SOURCE_CONTRACT_VERSION).eq("status", "processing").lt("received_at", staleBefore);
  if (recoveryError) throw new Error("Could not recover stale official-website enrichment runs.");
  const { data: source, error: sourceError } = await admin.from("catalogue_sources").select("enabled, automated, permitted_use, contract_version").eq("source_key", SOURCE_KEY).maybeSingle();
  if (sourceError || !source || !source.enabled || !source.automated || source.permitted_use !== "store_and_display" || source.contract_version !== SOURCE_CONTRACT_VERSION) throw new Error("Official website enrichment is not enabled under its approved source contract.");
  const { data: reviews, error: reviewError } = await admin.from("official_website_domain_reviews").select("host_name, review_status");
  if (reviewError) throw new Error("Could not read approved website-domain terms reviews.");
  const domainDecisions = new Map((reviews ?? []).map((review: { host_name: string; review_status: "approved" | "blocked" | "pending" }) => [review.host_name, review.review_status]));
  const { data: currentInspections, error: inspectionReadError } = await admin.from("official_website_inspections").select("vendor_id").gt("freshness_due_at", new Date().toISOString());
  if (inspectionReadError) throw new Error("Could not read official-website inspection freshness.");
  const currentVendorIds = new Set((currentInspections ?? []).map((inspection: { vendor_id: string }) => inspection.vendor_id));
  const { data: possible, error: candidatesError } = await admin.from("vendors").select("id, business_name, website, ownership_status, description, contact_email, phone, street_address, trading_hours, services, booking_url, menu_url, area_served, accessibility_features").eq("is_published", true).eq("is_claimed", false).eq("ownership_status", "unclaimed").like("website", "https://%").order("updated_at", { ascending: true }).limit(2000);
  if (candidatesError) throw new Error("Could not select eligible official-website listings.");
  const candidates = ((possible ?? []) as Vendor[]).filter((vendor) => { const host = hostname(vendor.website); return host !== null && !currentVendorIds.has(vendor.id) && domainDecisions.get(host) !== "blocked"; }).slice(0, limit);
  const { data: created, error: createdError } = await admin.from("catalogue_enrichment_runs").insert({ source_key: SOURCE_KEY, source_contract_version: SOURCE_CONTRACT_VERSION, artifact_sha256: runKey, status: "processing", input_count: candidates.length }).select("id, correlation_id").maybeSingle();
  if (createdError?.code === "23505") { const { data: prior, error } = await admin.from("catalogue_enrichment_runs").select("status, input_count, applied_count, conflict_count").eq("source_key", SOURCE_KEY).eq("artifact_sha256", runKey).maybeSingle(); if (error || !prior) throw new Error("Could not recover the official-website enrichment run."); return { state: prior.status === "completed" ? "completed" as const : "processing" as const, inspected: prior.input_count, applied: prior.applied_count, conflicts: prior.conflict_count, idempotent: prior.status === "completed" }; }
  if (createdError || !created) throw new Error("Could not create the official-website enrichment run.");
  await recordHealth("running", null, created.id); let applied = 0; let conflicts = 0;
  try {
    for (const vendor of candidates) {
      const host = hostname(vendor.website); if (!host) throw new Error("An enrichment candidate has an invalid website host.");
      const decision = domainDecisions.get(host);
      const inspection = await inspectOfficialWebsite(vendor.website, { termsOverride: decision === "approved" ? "approved" : undefined });
      const { error: inspectionError } = await admin.from("official_website_inspections").insert({ vendor_id: vendor.id, source_key: SOURCE_KEY, source_contract_version: SOURCE_CONTRACT_VERSION, requested_url: vendor.website, resolved_url: inspection.sourceUrl, host_name: host, outcome: inspection.outcome, reason_code: reasonCode(inspection), robots_status: robotsStatus(inspection), terms_review_status: inspection.termsStatus, terms_url: inspection.termsUrl, terms_fingerprint: inspection.termsFingerprint, terms_assessment_basis: inspection.termsBasis, content_fingerprint: inspection.contentFingerprint, extracted_fact_count: inspection.facts.length, checked_at: inspection.checkedAt, freshness_due_at: freshnessDueAt(inspection.checkedAt), enrichment_run_id: created.id });
      if (inspectionError) throw new Error("Could not retain official-website inspection evidence."); if (inspection.outcome !== "eligible") continue;
      const plan = planOfficialWebsiteApplication(vendor, inspection.facts); const sourceRecordKey = `website:${host}:${inspection.contentFingerprint ?? inspection.checkedAt}`;
      const rows = plan.facts.map((fact) => ({ vendor_id: vendor.id, field_name: fact.fieldName, value_text: fact.value, source_key: SOURCE_KEY, source_record_key: sourceRecordKey, source_url: inspection.sourceUrl, observed_at: inspection.checkedAt, freshness_due_at: freshnessDueAt(inspection.checkedAt), confidence: fact.fieldName === "description" ? 70 : 85, evidence_state: fact.conflict ? "conflict" : "active", application_state: fact.applied ? "applied" : fact.conflict ? "conflict" : "observed", applied_at: fact.applied ? inspection.checkedAt : null, enrichment_run_id: created.id }));
      const { data: evidence, error: evidenceError } = rows.length ? await admin.from("listing_field_evidence").upsert(rows, { onConflict: "vendor_id,field_name,source_key,source_record_key,value_text,observed_at" }).select("id, field_name") : { data: [], error: null };
      if (evidenceError) throw new Error("Could not retain official-website field evidence.");
      for (const conflictField of plan.conflictFields) { const incoming = (evidence ?? []).find((row: { field_name: string }) => row.field_name === conflictField); if (!incoming) continue; const current = conflictField === "service" ? (vendor.services ?? []).join(", ") : conflictField === "area_served" ? (vendor.area_served ?? []).join(", ") : conflictField === "accessibility" ? (vendor.accessibility_features ?? []).join(", ") : String(vendor[conflictField as keyof Vendor] ?? ""); const { error } = await admin.from("catalogue_field_conflicts").upsert({ vendor_id: vendor.id, field_name: conflictField, incoming_evidence_id: incoming.id, current_value: current }, { onConflict: "incoming_evidence_id", ignoreDuplicates: true }); if (error) throw new Error("Could not retain official-website field conflict."); }
      if (Object.keys(plan.updates).length) { const { error } = await admin.from("vendors").update({ ...plan.updates, source_checked_on: inspection.checkedAt.slice(0, 10), updated_at: inspection.checkedAt }).eq("id", vendor.id).eq("ownership_status", "unclaimed").eq("is_claimed", false); if (error) throw new Error("Could not apply safe official-website facts."); }
      applied += plan.appliedFields.length; conflicts += plan.conflictFields.length;
      const { error: auditError } = await admin.from("audit_events").insert({ actor_type: "service", action: "official_website_factual_enrichment", entity_type: "vendor", entity_id: vendor.id, reason: "Terms-aware, robots-aware structured factual inspection applied only empty unclaimed fields.", after_data: { applied_fields: plan.appliedFields, conflict_fields: plan.conflictFields, terms_basis: inspection.termsBasis, owner_control_preserved: true, media_or_page_copy_retained: false }, correlation_id: created.correlation_id }); if (auditError) throw new Error("Could not audit official-website factual enrichment.");
    }
    const { error } = await admin.from("catalogue_enrichment_runs").update({ status: "completed", applied_count: applied, conflict_count: conflicts, completed_at: new Date().toISOString() }).eq("id", created.id); if (error) throw new Error("Could not complete official-website enrichment run."); await recordHealth("healthy", null, created.id); return { state: "completed" as const, inspected: candidates.length, applied, conflicts };
  } catch (error) { const message = error instanceof Error ? error.message.slice(0, 500) : "Official-website enrichment failed."; await admin.from("catalogue_enrichment_runs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", created.id); await recordHealth("failed", message, created.id); throw error; }
}
