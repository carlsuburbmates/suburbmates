import { NextRequest, NextResponse } from "next/server";
import { qualifyCandidate, type CandidateInput, type ExistingListing } from "@/lib/automation/candidate-qualification";
import { runtimeEnv } from "@/lib/runtime-env";
import { createAdminClient } from "@/utils/supabase/admin";

const MAX_CANDIDATES = 100;
const allowedSource = "openstreetmap";

type IncomingCandidate = CandidateInput & {
  sourceUrl: string;
  sourceCheckedOn?: string;
  notes?: string;
};

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!runtimeEnv("AUTOMATION_INGEST_TOKEN") || token !== runtimeEnv("AUTOMATION_INGEST_TOKEN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 900_000) {
    return NextResponse.json({ error: "Batch is too large" }, { status: 413 });
  }

  try {
    const body = await request.json();
    const source = asText(body.source);
    const artifactSha256 = asText(body.artifactSha256);
    const artifactUrl = optionalHttpsUrl(body.artifactUrl);
    const candidates = Array.isArray(body.candidates) ? body.candidates.map(readCandidate) : null;
    if (source !== allowedSource || !/^[0-9a-f]{64}$/.test(artifactSha256) || !candidates || candidates.length < 1 || candidates.length > MAX_CANDIDATES) {
      return NextResponse.json({ error: "Invalid approved-source candidate batch" }, { status: 400 });
    }

    const admin = createAdminClient();
    let { data: run, error: runError } = await admin.from("candidate_handoff_runs")
      .insert({ source, artifact_sha256: artifactSha256, artifact_url: artifactUrl, status: "processing", input_count: candidates.length })
      .select("id, correlation_id")
      .single();
    if (runError?.code === "23505") {
      const { data: existingRun, error: existingRunError } = await admin.from("candidate_handoff_runs")
        .select("id, correlation_id, status, qualified_count, exception_count")
        .eq("source", source).eq("artifact_sha256", artifactSha256).maybeSingle();
      if (existingRunError || !existingRun) throw new Error("Could not read the existing candidate handoff run.");
      if (existingRun.status === "completed") return NextResponse.json({ received: true, idempotent: true, run: existingRun }, { status: 200 });
      if (existingRun.status === "processing") return NextResponse.json({ received: true, processing: true, run: existingRun }, { status: 202 });
      if (existingRun.status === "failed") {
        const resumed = await admin.from("candidate_handoff_runs")
          .update({ status: "processing", input_count: candidates.length, qualified_count: 0, exception_count: 0, error_message: null, completed_at: null })
          .eq("id", existingRun.id).select("id, correlation_id").single();
        if (resumed.error || !resumed.data) throw new Error("Could not resume the failed candidate handoff run.");
        run = resumed.data;
        runError = null;
      } else {
        throw new Error("Candidate handoff run has an unsupported status.");
      }
    }
    if (runError || !run) throw new Error("Could not create the candidate handoff run.");

    const job = await admin.from("automation_jobs").insert({
      job_type: "candidate_handoff",
      status: "running",
      attempt_count: 1,
      max_attempts: 3,
      correlation_id: run.correlation_id,
      payload: { source, candidate_count: candidates.length, artifact_sha256: artifactSha256 },
      started_at: new Date().toISOString(),
    }).select("id").single();
    if (job.error || !job.data) throw new Error("Could not create the candidate handoff job record.");

    try {
      const [listings, categories, suburbs] = await Promise.all([loadListings(admin), loadSlugs(admin, "categories"), loadSlugs(admin, "suburbs")]);
      let qualifiedCount = 0;
      let exceptionCount = 0;
      for (const candidate of candidates) {
        const sourceRecordKey = `${source}:${candidate.sourceUrl}`;
        let recoveredRecordId: string | null = null;
        const { data: existingRecord, error: existingRecordError } = await admin.from("candidate_handoff_records")
          .select("id, qualification_outcome, qualification_reasons, vendor_id").eq("run_id", run.id).eq("source_record_key", sourceRecordKey).maybeSingle();
        if (existingRecordError) throw new Error("Could not read existing candidate qualification evidence.");
        if (existingRecord) {
          if (existingRecord.qualification_outcome === "exception") {
            exceptionCount++;
            continue;
          }
          if (existingRecord.vendor_id) {
            qualifiedCount++;
            continue;
          }
          const { data: recoveredVendor, error: recoveredVendorError } = await admin.from("vendors").select("id, business_name, street_address, phone, website")
            .eq("source_key", `automation:${sourceRecordKey}`).maybeSingle();
          if (recoveredVendorError) throw new Error("Could not recover the partially completed qualified listing.");
          if (recoveredVendor) {
            await ensureQualifiedListingProof(admin, {
              vendorId: recoveredVendor.id, candidate, runId: run.id, correlationId: run.correlation_id,
              sourceRecordKey, artifactSha256, qualificationReasons: existingRecord.qualification_reasons,
            });
            const linked = await admin.from("candidate_handoff_records").update({ vendor_id: recoveredVendor.id }).eq("id", existingRecord.id);
            if (linked.error) throw new Error("Could not recover the candidate-to-listing link.");
            listings.push({ id: recoveredVendor.id, businessName: recoveredVendor.business_name, streetAddress: recoveredVendor.street_address, phone: recoveredVendor.phone, website: recoveredVendor.website });
            qualifiedCount++;
            continue;
          }
          recoveredRecordId = existingRecord.id;
        }
        const qualification = qualifyCandidate(candidate, {
          allowedSources: new Set([allowedSource, "operator", "community"]),
          allowedSuburbs: suburbs,
          allowedCategories: categories,
          existingListings: listings,
        });
        const candidateData = toCandidateData(candidate);
        const createdRecord = recoveredRecordId ? { data: { id: recoveredRecordId }, error: null } : await admin.from("candidate_handoff_records").insert({
          run_id: run.id,
          source_record_key: sourceRecordKey,
          candidate_data: candidateData,
          normalized_data: qualification.normalized,
          qualification_outcome: qualification.outcome,
          qualification_reasons: qualification.reasons,
          duplicate_vendor_id: qualification.duplicateVendorId,
        }).select("id").single();
        if (createdRecord.error || !createdRecord.data) throw new Error("Could not record candidate qualification evidence.");
        const recordId = createdRecord.data.id;

        if (qualification.outcome === "exception") {
          exceptionCount++;
          const { error } = await admin.from("audit_events").insert({
            actor_type: "service", action: "candidate_handoff_exception_created", entity_type: "candidate_handoff_record", entity_id: recordId,
            reason: qualification.reasons.join(", "), after_data: { qualification_outcome: "exception", publication_unchanged: true }, correlation_id: run.correlation_id,
          });
          if (error) throw new Error("Could not audit candidate exception.");
          continue;
        }

        const sourceKey = `automation:${sourceRecordKey}`;
        const { data: vendor, error: vendorError } = await admin.from("vendors").insert({
          business_name: candidate.businessName.trim(), category_slug: candidate.categorySlug.trim().toLowerCase(), suburb_slug: candidate.suburbSlug.trim().toLowerCase(),
          street_address: nullable(candidate.streetAddress), contact_email: nullable(candidate.contactEmail?.toLowerCase()), phone: nullable(candidate.phone), website: nullable(candidate.website),
          source_key: sourceKey, source_url: candidate.sourceUrl, source_checked_on: candidate.sourceCheckedOn ?? new Date().toISOString().slice(0, 10),
          source_notes: candidate.notes ?? "Approved OpenStreetMap candidate handoff.", verification_status: "unverified",
          listing_status: "published", listing_source: "approved_import", ownership_status: "unclaimed", is_published: true, is_claimed: false, tier: "free",
        }).select("id").single();
        if (vendorError || !vendor) throw new Error("Could not create qualified listing.");
        await ensureQualifiedListingProof(admin, {
          vendorId: vendor.id, candidate, runId: run.id, correlationId: run.correlation_id,
          sourceRecordKey, artifactSha256, qualificationReasons: qualification.reasons,
        });
        const link = await admin.from("candidate_handoff_records").update({ vendor_id: vendor.id }).eq("id", recordId);
        if (link.error) throw new Error("Could not link qualification evidence to listing.");
        listings.push({ id: vendor.id, businessName: candidate.businessName, streetAddress: candidate.streetAddress, phone: candidate.phone, website: candidate.website });
        qualifiedCount++;
      }
      const completedAt = new Date().toISOString();
      await admin.from("candidate_handoff_runs").update({ status: "completed", qualified_count: qualifiedCount, exception_count: exceptionCount, completed_at: completedAt }).eq("id", run.id);
      await admin.from("automation_jobs").update({ status: "succeeded", result: { qualified_count: qualifiedCount, exception_count: exceptionCount }, completed_at: completedAt }).eq("id", job.data.id);
      await admin.from("integration_health").upsert({ integration_name: "candidate_handoff", status: "healthy", last_success_at: completedAt, metadata: { last_run_id: run.id, qualified_count: qualifiedCount, exception_count: exceptionCount } }, { onConflict: "integration_name" });
      return NextResponse.json({ received: true, idempotent: false, runId: run.id, qualifiedCount, exceptionCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Candidate handoff failed.";
      const now = new Date().toISOString();
      await admin.from("candidate_handoff_runs").update({ status: "failed", error_message: message, completed_at: now }).eq("id", run.id);
      await admin.from("automation_jobs").update({ status: "failed", error_message: message, completed_at: now }).eq("id", job.data.id);
      await admin.from("integration_health").upsert({ integration_name: "candidate_handoff", status: "failed", last_failure_at: now, last_error: message, metadata: { last_run_id: run.id } }, { onConflict: "integration_name" });
      throw error;
    }
  } catch (error) {
    console.error("Candidate handoff failed", error);
    return NextResponse.json({ error: "Candidate handoff failed" }, { status: 500 });
  }
}

function readCandidate(value: unknown): IncomingCandidate {
  if (!value || typeof value !== "object") throw new Error("Invalid candidate.");
  const item = value as Record<string, unknown>;
  const sourceUrl = optionalHttpsUrl(item.sourceUrl);
  if (!sourceUrl || new URL(sourceUrl).hostname !== "www.openstreetmap.org") throw new Error("Candidate source URL must be an OpenStreetMap record.");
  return {
    source: asText(item.source) || allowedSource, businessName: asText(item.businessName), categorySlug: asText(item.categorySlug), suburbSlug: asText(item.suburbSlug),
    streetAddress: optionalText(item.streetAddress), contactEmail: optionalText(item.contactEmail), phone: optionalText(item.phone), website: optionalText(item.website),
    websiteSafety: item.websiteSafety === "safe" || item.websiteSafety === "unsafe" ? item.websiteSafety : "unknown",
    sourceUrl, sourceCheckedOn: optionalDate(item.sourceCheckedOn), notes: optionalText(item.notes),
  };
}

async function loadListings(admin: ReturnType<typeof createAdminClient>): Promise<ExistingListing[]> {
  const listings: ExistingListing[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from("vendors").select("id, business_name, street_address, phone, website").range(from, from + 999);
    if (error) throw new Error("Could not load existing listings for duplicate checks.");
    listings.push(...data.map((item) => ({ id: item.id, businessName: item.business_name, streetAddress: item.street_address, phone: item.phone, website: item.website })));
    if (data.length < 1000) return listings;
  }
}

async function loadSlugs(admin: ReturnType<typeof createAdminClient>, table: "categories" | "suburbs") {
  const { data, error } = await admin.from(table).select("slug");
  if (error) throw new Error(`Could not load supported ${table}.`);
  return new Set(data.map((item) => item.slug));
}

async function ensureQualifiedListingProof(admin: ReturnType<typeof createAdminClient>, input: {
  vendorId: string; candidate: IncomingCandidate; runId: string; correlationId: string;
  sourceRecordKey: string; artifactSha256: string; qualificationReasons: string[];
}) {
  const evidenceQuery = await admin.from("listing_evidence").select("id")
    .eq("vendor_id", input.vendorId).eq("evidence_type", "automation_qualification")
    .contains("evidence_data", { run_id: input.runId, source_record_key: input.sourceRecordKey }).limit(1).maybeSingle();
  if (evidenceQuery.error) throw new Error("Could not read listing qualification evidence.");
  if (!evidenceQuery.data) {
    const evidence = await admin.from("listing_evidence").insert({
      vendor_id: input.vendorId, evidence_type: "automation_qualification", source_url: input.candidate.sourceUrl, status: "passed",
      summary: "Approved-source candidate passed the deterministic directory qualification policy.",
      evidence_data: { run_id: input.runId, source_record_key: input.sourceRecordKey, qualification_reasons: input.qualificationReasons, artifact_sha256: input.artifactSha256 }, checked_at: new Date().toISOString(),
    });
    if (evidence.error) throw new Error("Could not retain listing qualification evidence.");
  }

  const auditQuery = await admin.from("audit_events").select("id")
    .eq("action", "qualified_candidate_listing_created").eq("entity_type", "vendor").eq("entity_id", input.vendorId)
    .eq("correlation_id", input.correlationId).limit(1).maybeSingle();
  if (auditQuery.error) throw new Error("Could not read qualified listing audit evidence.");
  if (!auditQuery.data) {
    const audit = await admin.from("audit_events").insert({
      actor_type: "service", action: "qualified_candidate_listing_created", entity_type: "vendor", entity_id: input.vendorId,
      reason: "Deterministic approved-source qualification passed.", after_data: { listing_status: "published", is_published: true, ownership_status: "unclaimed", publication_qualification: "passed" }, correlation_id: input.correlationId,
    });
    if (audit.error) throw new Error("Could not audit qualified listing creation.");
  }
}

function toCandidateData(candidate: IncomingCandidate) { return { business_name: candidate.businessName, category_slug: candidate.categorySlug, suburb_slug: candidate.suburbSlug, street_address: candidate.streetAddress ?? null, contact_email: candidate.contactEmail ?? null, phone: candidate.phone ?? null, website: candidate.website ?? null, source_url: candidate.sourceUrl, source_checked_on: candidate.sourceCheckedOn ?? null, notes: candidate.notes ?? null }; }
function asText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const text = asText(value); return text || undefined; }
function nullable(value: string | null | undefined) { return value?.trim() || null; }
function optionalDate(value: unknown) { const date = asText(value); return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined; }
function optionalHttpsUrl(value: unknown) { const text = asText(value); if (!text) return null; try { const url = new URL(text); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null; } catch { return null; } }
