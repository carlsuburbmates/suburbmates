import { NextRequest, NextResponse } from "next/server";
import { qualifyCandidate, type CandidateInput, type ExistingListing } from "@/lib/automation/candidate-qualification";
import { CATALOGUE_SOURCE_CONTRACTS, getCatalogueSourceContract, hasCatalogueSourceContract, isAllowedCatalogueSourceUrl, type CatalogueSourceContract } from "@/lib/automation/catalogue-source-contract";
import { runtimeEnv } from "@/lib/runtime-env";
import { createAdminClient } from "@/utils/supabase/admin";
import { canonicalCategorySlug, loadCategoryAliasMap } from "@/lib/category-aliases";

const MAX_CANDIDATES = 100;
// The Worker request cannot legitimately outlive this window. Treat a longer
// processing record as interrupted, close its job and resume idempotently.
// A request that has not completed in one minute has exceeded the Worker
// recovery window. This avoids the former 30-second overlap without leaving a
// cancelled or resource-exhausted request to block the next idempotent retry.
const STALE_PROCESSING_MS = 60 * 1000;

type IncomingCandidate = CandidateInput & {
  sourceRecordKey: string;
  sourceUrl: string;
  sourceCheckedOn?: string;
  tradingHours?: string;
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
    const sourceContract = getCatalogueSourceContract(source);
    if (!sourceContract) {
      return NextResponse.json({ error: "Invalid approved-source candidate batch" }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!hasCatalogueSourceContract(source, asText(body.sourceContractVersion))) {
      await holdCatalogueSourceContract(admin, sourceContract);
      return NextResponse.json({ error: `${sourceContract.displayName} source contract changed; candidate processing is held` }, { status: 400 });
    }
    // The code contract validates the batch shape, but the private registry is
    // the durable approval record. A deployment must fail closed when either
    // record drifts, rather than accepting a source that was disabled or whose
    // licence/host policy changed outside this release.
    const sourceRegistry = await loadApprovedSourceRegistry(admin, sourceContract);
    if (!sourceRegistryMatchesContract(sourceRegistry, sourceContract)) {
      await holdCatalogueSourceContract(admin, sourceContract);
      return NextResponse.json({ error: `${sourceContract.displayName} registry approval is missing or changed; candidate processing is held` }, { status: 400 });
    }

    await finaliseStaleSourceRuns(admin, sourceContract);

    const categoryAliases = await loadCategoryAliasMap(admin);
    const candidates = Array.isArray(body.candidates)
      ? body.candidates.map((candidate: unknown) => {
          const parsed = readCandidate(candidate, sourceContract);
          return {
            ...parsed,
            categorySlug: canonicalCategorySlug(
              parsed.categorySlug,
              categoryAliases,
            ),
          };
        })
      : null;
    if (!/^[0-9a-f]{64}$/.test(artifactSha256) || !candidates || candidates.length < 1 || candidates.length > MAX_CANDIDATES) {
      return NextResponse.json({ error: "Invalid approved-source candidate batch" }, { status: 400 });
    }
    await markCatalogueSourceContractHealthy(admin, sourceContract);
    // Exact input retries remain idempotent through the source/artifact run
    // identity below. A later source observation must continue instead: it
    // refreshes private evidence and detects conflicts without rewriting the
    // existing public listing.
    let { data: run, error: runError } = await admin.from("candidate_handoff_runs")
      .insert({ source, source_contract_version: sourceContract.version, artifact_sha256: artifactSha256, artifact_url: artifactUrl, status: "processing", input_count: candidates.length })
      .select("id, correlation_id")
      .single();
    if (runError?.code === "23505") {
      const { data: existingRun, error: existingRunError } = await admin.from("candidate_handoff_runs")
        .select("id, correlation_id, status, qualified_count, exception_count, received_at")
        .eq("source", source).eq("artifact_sha256", artifactSha256).maybeSingle();
      if (existingRunError || !existingRun) throw new Error("Could not read the existing candidate handoff run.");
      if (existingRun.status === "completed") return NextResponse.json({ received: true, idempotent: true, run: existingRun }, { status: 200 });
      const staleProcessing = existingRun.status === "processing"
        && Date.now() - new Date(existingRun.received_at).getTime() >= STALE_PROCESSING_MS;
      if (existingRun.status === "processing" && !staleProcessing) {
        return NextResponse.json({ received: true, processing: true, run: existingRun }, { status: 202 });
      }
      if (existingRun.status === "failed" || staleProcessing) {
        if (staleProcessing) {
          const staleJobs = await admin.from("automation_jobs")
            .update({ status: "failed", error_message: "Candidate handoff exceeded the processing window and was safely resumed.", completed_at: new Date().toISOString() })
            .eq("correlation_id", existingRun.correlation_id).eq("status", "running");
          if (staleJobs.error) throw new Error("Could not close the stale candidate handoff job.");
        }
        const resumed = await admin.from("candidate_handoff_runs")
          .update({ source_contract_version: sourceContract.version, status: "processing", input_count: candidates.length, qualified_count: 0, exception_count: 0, error_message: null, completed_at: null, received_at: new Date().toISOString() })
          .eq("id", existingRun.id).select("id, correlation_id").single();
        if (resumed.error || !resumed.data) throw new Error("Could not resume the failed or stale candidate handoff run.");
        run = resumed.data;
        runError = null;
      } else {
        throw new Error("Candidate handoff run has an unsupported status.");
      }
    }
    if (runError || !run) throw new Error("Could not create the candidate handoff run.");

    try {
      const [categories, suburbs] = await Promise.all([loadSlugs(admin, "categories"), loadSlugs(admin, "suburbs")]);
      let qualifiedCount = 0;
      let exceptionCount = 0;
      for (const candidate of candidates) {
        const sourceRecordKey = `${source}:${candidate.sourceRecordKey}`;
        let recoveredRecordId: string | null = null;
        const { data: existingRecord, error: existingRecordError } = await admin.from("candidate_handoff_records")
          .select("id, qualification_outcome, qualification_reasons, duplicate_vendor_id, vendor_id").eq("run_id", run.id).eq("source_record_key", sourceRecordKey).maybeSingle();
        if (existingRecordError) throw new Error("Could not read existing candidate qualification evidence.");
        const priorQualified = await admin.from("candidate_handoff_records")
          .select("vendor_id")
          .eq("source_record_key", sourceRecordKey)
          .eq("qualification_outcome", "qualified")
          .not("vendor_id", "is", null)
          .neq("run_id", run.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (priorQualified.error) throw new Error("Could not read the prior approved-source listing record.");
        if (existingRecord) {
          if (existingRecord.qualification_outcome === "exception") {
            if (existingRecord.qualification_reasons.length === 1 && existingRecord.qualification_reasons[0] === "strong_duplicate" && existingRecord.duplicate_vendor_id) {
              await enrichMatchingListing(admin, {
                vendorId: existingRecord.duplicate_vendor_id,
                candidate,
                sourceRecordKey,
                sourceContract,
                correlationId: run.correlation_id,
              });
            }
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
            if (priorQualified.data?.vendor_id === recoveredVendor.id) {
              await refreshQualifiedSourceListing(admin, {
                vendorId: recoveredVendor.id, candidate, sourceRecordKey, sourceContract, correlationId: run.correlation_id,
              });
            } else {
              await ensureQualifiedListingProof(admin, {
                vendorId: recoveredVendor.id, candidate, runId: run.id, correlationId: run.correlation_id,
                sourceRecordKey, sourceContract, artifactSha256, qualificationReasons: existingRecord.qualification_reasons,
              });
            }
            const linked = await admin.from("candidate_handoff_records").update({ vendor_id: recoveredVendor.id }).eq("id", existingRecord.id);
            if (linked.error) throw new Error("Could not recover the candidate-to-listing link.");
            qualifiedCount++;
            continue;
          }
          recoveredRecordId = existingRecord.id;
        }
        const existingListings = (await loadCandidateDuplicateCandidates(admin, candidate))
          .filter((listing) => listing.id !== priorQualified.data?.vendor_id);
        const qualification = qualifyCandidate(candidate, {
          allowedSources: new Set(Object.keys(CATALOGUE_SOURCE_CONTRACTS)),
          allowedSuburbs: suburbs,
          allowedCategories: categories,
          existingListings,
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

        if (priorQualified.data?.vendor_id && qualification.outcome === "qualified") {
          await refreshQualifiedSourceListing(admin, {
            vendorId: priorQualified.data.vendor_id,
            candidate,
            sourceRecordKey,
            sourceContract,
            correlationId: run.correlation_id,
          });
          const link = await admin.from("candidate_handoff_records").update({ vendor_id: priorQualified.data.vendor_id }).eq("id", recordId);
          if (link.error) throw new Error("Could not link refreshed source evidence to its listing.");
          qualifiedCount++;
          continue;
        }

        if (qualification.outcome === "exception") {
          let enrichment: ExistingListingEnrichment | null = null;
          if (qualification.reasons.length === 1 && qualification.reasons[0] === "strong_duplicate" && qualification.duplicateVendorId) {
            enrichment = await enrichMatchingListing(admin, {
              vendorId: qualification.duplicateVendorId,
              candidate,
              sourceRecordKey,
              sourceContract,
              correlationId: run.correlation_id,
            });
          }
          exceptionCount++;
          const { error } = await admin.from("audit_events").insert({
            actor_type: "service", action: "candidate_handoff_exception_created", entity_type: "candidate_handoff_record", entity_id: recordId,
            reason: qualification.reasons.join(", "), after_data: {
              qualification_outcome: "exception",
              listing_status_unchanged: true,
              public_field_changes: enrichment?.appliedFields ?? [],
              existing_listing_enrichment: enrichment ? { applied_fields: enrichment.appliedFields, conflicts: enrichment.conflictFields } : null,
            }, correlation_id: run.correlation_id,
          });
          if (error) throw new Error("Could not audit candidate exception.");
          continue;
        }

        const sourceKey = `automation:${sourceRecordKey}`;
        const { data: vendor, error: vendorError } = await admin.from("vendors").insert({
          business_name: candidate.businessName.trim(), category_slug: candidate.categorySlug.trim().toLowerCase(), suburb_slug: candidate.suburbSlug.trim().toLowerCase(),
          street_address: nullable(candidate.streetAddress), description: nullable(candidate.description), contact_email: nullable(candidate.contactEmail?.toLowerCase()), phone: nullable(candidate.phone), website: nullable(candidate.website), trading_hours: nullable(candidate.tradingHours),
          source_key: sourceKey, source_url: candidate.sourceUrl, source_checked_on: candidate.sourceCheckedOn ?? new Date().toISOString().slice(0, 10),
          source_notes: candidate.notes ?? sourceContract.defaultSourceNotes, verification_status: "unverified",
          listing_status: "published", listing_source: "approved_import", ownership_status: "unclaimed", is_published: true, is_claimed: false, tier: "free",
        }).select("id").single();
        if (vendorError || !vendor) throw new Error("Could not create qualified listing.");
        await ensureQualifiedListingProof(admin, {
          vendorId: vendor.id, candidate, runId: run.id, correlationId: run.correlation_id,
          sourceRecordKey, sourceContract, artifactSha256, qualificationReasons: qualification.reasons,
        });
        const link = await admin.from("candidate_handoff_records").update({ vendor_id: vendor.id }).eq("id", recordId);
        if (link.error) throw new Error("Could not link qualification evidence to listing.");
        qualifiedCount++;
      }
      const completedAt = new Date().toISOString();
      // Each handoff is one source candidate. Close its durable, idempotent run
      // before updating optional aggregate health so a Worker interruption after
      // the listing/evidence link never leaves a completed candidate processing.
      const completion = await admin.from("candidate_handoff_runs")
        .update({ status: "completed", qualified_count: qualifiedCount, exception_count: exceptionCount, completed_at: completedAt })
        .eq("id", run.id);
      if (completion.error) throw new Error("Could not complete the candidate handoff run.");
      const health = await admin.from("integration_health").upsert({ integration_name: "candidate_handoff", status: "healthy", last_success_at: completedAt, metadata: { last_run_id: run.id, qualified_count: qualifiedCount, exception_count: exceptionCount } }, { onConflict: "integration_name" });
      if (health.error) throw new Error("Could not record candidate handoff health.");
      return NextResponse.json({ received: true, idempotent: false, runId: run.id, qualifiedCount, exceptionCount });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Candidate handoff failed.";
      const now = new Date().toISOString();
      await admin.from("candidate_handoff_runs").update({ status: "failed", error_message: message, completed_at: now }).eq("id", run.id);
      await admin.from("integration_health").upsert({ integration_name: "candidate_handoff", status: "failed", last_failure_at: now, last_error: message, metadata: { last_run_id: run.id } }, { onConflict: "integration_name" });
      throw error;
    }
  } catch (error) {
    console.error("Candidate handoff failed", error);
    return NextResponse.json({ error: "Candidate handoff failed" }, { status: 500 });
  }
}

function readCandidate(value: unknown, sourceContract: CatalogueSourceContract): IncomingCandidate {
  if (!value || typeof value !== "object") throw new Error("Invalid candidate.");
  const item = value as Record<string, unknown>;
  const sourceUrl = optionalHttpsUrl(item.sourceUrl);
  if (!sourceUrl || !isAllowedCatalogueSourceUrl(sourceContract, sourceUrl)) throw new Error("Candidate source URL is not allowed by the approved source contract.");
  const candidateSource = asText(item.source);
  if (candidateSource && candidateSource !== sourceContract.key) throw new Error("Candidate source must match the approved source batch.");
  const sourceRecordKey = optionalText(item.sourceRecordKey) ?? sourceUrl;
  if (sourceRecordKey.length > 500) throw new Error("Candidate source record key is too long.");
  return {
    source: sourceContract.key, sourceRecordKey, businessName: asText(item.businessName), categorySlug: asText(item.categorySlug), suburbSlug: asText(item.suburbSlug),
    streetAddress: optionalText(item.streetAddress), description: optionalDescription(item.description), contactEmail: optionalText(item.contactEmail), phone: optionalText(item.phone), website: optionalText(item.website),
    websiteSafety: item.websiteSafety === "safe" || item.websiteSafety === "unsafe" ? item.websiteSafety : "unknown",
    sourceUrl, sourceCheckedOn: optionalDate(item.sourceCheckedOn), tradingHours: optionalTradingHours(item.tradingHours), notes: optionalText(item.notes),
  };
}

function integrationName(source: CatalogueSourceContract) {
  return source.key === "openstreetmap" ? "openstreetmap_source" : `${source.key}_source`;
}

type ApprovedSourceRegistry = {
  source_key: string;
  contract_version: string;
  allowed_hosts: string[];
  permitted_use: string;
  automated: boolean;
  enabled: boolean;
};

async function loadApprovedSourceRegistry(admin: ReturnType<typeof createAdminClient>, source: CatalogueSourceContract) {
  const { data, error } = await admin.from("catalogue_sources")
    .select("source_key, contract_version, allowed_hosts, permitted_use, automated, enabled")
    .eq("source_key", source.key)
    .maybeSingle();
  if (error) throw new Error("Could not read the approved catalogue source registry.");
  return data as ApprovedSourceRegistry | null;
}

function sourceRegistryMatchesContract(registry: ApprovedSourceRegistry | null, source: CatalogueSourceContract) {
  if (!registry) return false;
  return registry.source_key === source.key
    && registry.contract_version === source.version
    && registry.permitted_use === "store_and_display"
    && registry.automated === true
    && registry.enabled === true
    && sameHosts(registry.allowed_hosts, source.allowedHosts);
}

function sameHosts(left: readonly string[], right: readonly string[]) {
  return left.length === right.length
    && [...left].sort().every((host, index) => host === [...right].sort()[index]);
}

async function holdCatalogueSourceContract(admin: ReturnType<typeof createAdminClient>, source: CatalogueSourceContract) {
  const now = new Date().toISOString();
  const health = await admin.from("integration_health").upsert({
    integration_name: integrationName(source),
    status: "failed",
    last_failure_at: now,
    last_error: `The expected ${source.displayName} source contract was not received. Candidate processing was held; no listing changed.`,
    metadata: { action: "source_contract_held", source: source.key },
  }, { onConflict: "integration_name" });
  if (health.error) throw new Error("Could not record the catalogue source contract hold.");
}

async function markCatalogueSourceContractHealthy(admin: ReturnType<typeof createAdminClient>, source: CatalogueSourceContract) {
  const now = new Date().toISOString();
  const health = await admin.from("integration_health").upsert({
    integration_name: integrationName(source),
    status: "healthy",
    last_success_at: now,
    last_error: null,
    metadata: { source_contract: source.version, source: source.key },
  }, { onConflict: "integration_name" });
  if (health.error) throw new Error("Could not record the catalogue source contract check.");
}

async function finaliseStaleSourceRuns(admin: ReturnType<typeof createAdminClient>, source: CatalogueSourceContract) {
  const cutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();
  const { data: staleRuns, error } = await admin.from("candidate_handoff_runs")
    .select("id, correlation_id")
    .eq("source", source.key)
    .eq("status", "processing")
    .lt("received_at", cutoff)
    .limit(MAX_CANDIDATES);
  if (error) throw new Error("Could not inspect stale candidate handoff runs.");

  const now = new Date().toISOString();
  for (const staleRun of staleRuns ?? []) {
    const message = "Candidate handoff exceeded the processing window and was safely closed before a new source observation.";
    const { error: runError } = await admin.from("candidate_handoff_runs")
      .update({ status: "failed", error_message: message, completed_at: now })
      .eq("id", staleRun.id)
      .eq("status", "processing");
    if (runError) throw new Error("Could not close the stale candidate handoff run.");
    const { error: jobError } = await admin.from("automation_jobs")
      .update({ status: "failed", error_message: message, completed_at: now })
      .eq("correlation_id", staleRun.correlation_id)
      .eq("status", "running");
    if (jobError) throw new Error("Could not close the stale candidate handoff job.");
  }
}

async function loadCandidateDuplicateCandidates(admin: ReturnType<typeof createAdminClient>, candidate: IncomingCandidate): Promise<ExistingListing[]> {
  // Loading every listing for every singleton handoff made a 365-row official
  // source run exceed GitHub Actions' job window. Retrieve only plausible
  // exact-identifier matches, then retain the existing normalized duplicate
  // decision in qualifyCandidate as the final authority.
  const matches = new Map<string, ExistingListing>();
  const add = (rows: Array<{ id: string; business_name: string; street_address: string | null; phone: string | null; website: string | null; source_url: string | null }> | null) => {
    for (const row of rows ?? []) matches.set(row.id, {
      id: row.id,
      businessName: row.business_name,
      streetAddress: row.street_address,
      phone: row.phone,
      website: row.website,
      sourceUrl: row.source_url,
    });
  };
  const select = "id, business_name, street_address, phone, website, source_url";
  if (candidate.businessName.trim()) {
    const byName = await admin.from("vendors").select(select).ilike("business_name", candidate.businessName.trim()).limit(100);
    if (byName.error) throw new Error("Could not look up candidate name duplicates.");
    add(byName.data);
  }
  if (candidate.sourceUrl) {
    const bySourceUrl = await admin.from("vendors").select(select).eq("source_url", candidate.sourceUrl).limit(100);
    if (bySourceUrl.error) throw new Error("Could not look up candidate source-record duplicates.");
    add(bySourceUrl.data);
  }
  const websiteHost = candidate.website ? safeHost(candidate.website) : null;
  if (websiteHost) {
    const byWebsite = await admin.from("vendors").select(select).ilike("website", `%${websiteHost}%`).limit(100);
    if (byWebsite.error) throw new Error("Could not look up candidate website duplicates.");
    add(byWebsite.data);
  }
  const phoneTail = candidate.phone?.replace(/\D/g, "").slice(-8);
  if (phoneTail) {
    const byPhone = await admin.from("vendors").select(select).ilike("phone", `%${phoneTail}%`).limit(100);
    if (byPhone.error) throw new Error("Could not look up candidate phone duplicates.");
    add(byPhone.data);
  }
  return [...matches.values()];
}

function safeHost(value: string) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); }
  catch { return null; }
}

async function loadSlugs(admin: ReturnType<typeof createAdminClient>, table: "categories" | "suburbs") {
  const { data, error } = await admin.from(table).select("slug");
  if (error) throw new Error(`Could not load supported ${table}.`);
  return new Set(data.map((item) => item.slug));
}

async function ensureQualifiedListingProof(admin: ReturnType<typeof createAdminClient>, input: {
  vendorId: string; candidate: IncomingCandidate; runId: string; correlationId: string;
  sourceRecordKey: string; sourceContract: CatalogueSourceContract; artifactSha256: string; qualificationReasons: string[];
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
  await recordListingFieldEvidence(admin, input);

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

async function recordListingFieldEvidence(admin: ReturnType<typeof createAdminClient>, input: {
  vendorId: string; candidate: IncomingCandidate; sourceRecordKey: string; sourceContract: CatalogueSourceContract;
}) {
  const observedAt = `${input.candidate.sourceCheckedOn ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const fields: Array<[string, string | null | undefined]> = [
    ["business_name", input.candidate.businessName],
    ["category_slug", input.candidate.categorySlug],
    ["suburb_slug", input.candidate.suburbSlug],
    ["street_address", input.candidate.streetAddress],
    ["description", input.candidate.description],
    ["contact_email", input.candidate.contactEmail],
    ["phone", input.candidate.phone],
    ["website", input.candidate.website],
    ["trading_hours", input.candidate.tradingHours],
  ];
  const records = fields.flatMap(([fieldName, rawValue]) => {
    const valueText = rawValue?.trim();
    return valueText ? [{
      vendor_id: input.vendorId, field_name: fieldName, value_text: valueText,
      source_key: input.sourceContract.key, source_record_key: input.sourceRecordKey,
      source_url: input.candidate.sourceUrl, observed_at: observedAt, freshness_due_at: freshnessDueAt(observedAt, input.sourceContract), confidence: 85,
      evidence_state: "active", application_state: "applied", applied_at: new Date().toISOString(),
    }] : [];
  });
  if (!records.length) return;
  const result = await admin.from("listing_field_evidence").upsert(records, {
    onConflict: "vendor_id,field_name,source_key,source_record_key,value_text,observed_at", ignoreDuplicates: true,
  });
  if (result.error) throw new Error("Could not record field-level listing evidence.");
}

async function refreshQualifiedSourceListing(admin: ReturnType<typeof createAdminClient>, input: {
  vendorId: string; candidate: IncomingCandidate; sourceRecordKey: string;
  sourceContract: CatalogueSourceContract; correlationId: string;
}) {
  const { data: vendor, error: vendorError } = await admin.from("vendors")
    .select("id, ownership_status, business_name, category_slug, suburb_slug, street_address, description, contact_email, phone, website, trading_hours")
    .eq("id", input.vendorId).maybeSingle();
  if (vendorError || !vendor) throw new Error("Could not load the prior qualified listing for source refresh.");

  const observedAt = `${input.candidate.sourceCheckedOn ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const fields: Array<[string, string | null | undefined, string | null | undefined]> = [
    ["business_name", input.candidate.businessName, vendor.business_name],
    ["category_slug", input.candidate.categorySlug, vendor.category_slug],
    ["suburb_slug", input.candidate.suburbSlug, vendor.suburb_slug],
    ["street_address", input.candidate.streetAddress, vendor.street_address],
    ["description", input.candidate.description, vendor.description],
    ["contact_email", input.candidate.contactEmail?.toLowerCase(), vendor.contact_email],
    ["phone", input.candidate.phone, vendor.phone],
    ["website", input.candidate.website, vendor.website],
    ["trading_hours", input.candidate.tradingHours, vendor.trading_hours],
  ];
  const observedFields: string[] = [];
  const conflictFields: string[] = [];
  const appliedFields: string[] = [];
  const updates: Record<string, string> = {};

  for (const [fieldName, incomingValue, currentValue] of fields) {
    const valueText = incomingValue?.trim();
    if (!valueText) continue;
    const currentText = currentValue?.trim() ?? "";
    const isSameValue = comparableFieldValue(fieldName, currentText) === comparableFieldValue(fieldName, valueText);
    const canApply = ["contact_email", "phone", "website", "description", "trading_hours"].includes(fieldName)
      && vendor.ownership_status === "unclaimed" && !currentText;
    const emailIsAssignedElsewhere = fieldName === "contact_email" && canApply
      ? await hasExternalContactEmailAssignment(admin, vendor.id, valueText)
      : false;
    const applicationState = canApply && !emailIsAssignedElsewhere ? "applied" : isSameValue ? "observed" : "conflict";
    const { data: evidence, error: evidenceError } = await admin.from("listing_field_evidence").upsert({
      vendor_id: vendor.id, field_name: fieldName, value_text: valueText,
      source_key: input.sourceContract.key, source_record_key: input.sourceRecordKey,
      source_url: input.candidate.sourceUrl, observed_at: observedAt, freshness_due_at: freshnessDueAt(observedAt, input.sourceContract), confidence: 85,
      evidence_state: applicationState === "conflict" ? "conflict" : "active", application_state: applicationState,
      applied_at: applicationState === "applied" ? new Date().toISOString() : null,
    }, { onConflict: "vendor_id,field_name,source_key,source_record_key,value_text,observed_at", ignoreDuplicates: true }).select("id").maybeSingle();
    if (evidenceError) throw new Error("Could not retain refreshed approved-source evidence.");
    if (!evidence) {
      if (applicationState === "observed") observedFields.push(fieldName);
      continue;
    }
    if (applicationState === "applied") {
      updates[fieldName] = valueText;
      appliedFields.push(fieldName);
    } else if (applicationState === "conflict") {
      const conflict = await admin.from("catalogue_field_conflicts").upsert({
        vendor_id: vendor.id, field_name: fieldName, incoming_evidence_id: evidence.id, current_value: currentText,
      }, { onConflict: "incoming_evidence_id", ignoreDuplicates: true });
      if (conflict.error) throw new Error("Could not retain the approved-source refresh conflict.");
      conflictFields.push(fieldName);
    } else {
      observedFields.push(fieldName);
    }
  }

  const checkedOn = input.candidate.sourceCheckedOn ?? new Date().toISOString().slice(0, 10);
  const sourceCheck = await admin.from("vendors")
    .update({ ...updates, source_checked_on: checkedOn, updated_at: new Date().toISOString() })
    .eq("id", vendor.id);
  if (sourceCheck.error) throw new Error("Could not update the approved-source observation date.");
  const audit = await admin.from("audit_events").insert({
    actor_type: "service", action: "approved_source_listing_refreshed", entity_type: "vendor", entity_id: vendor.id,
    reason: "A prior qualified source record was re-observed; public fields were not overwritten.",
    after_data: { public_field_changes: appliedFields, observed_fields: observedFields, conflict_fields: conflictFields, owner_control_preserved: true },
    correlation_id: input.correlationId,
  });
  if (audit.error) throw new Error("Could not audit the approved-source listing refresh.");
}

type ExistingListingEnrichment = { appliedFields: string[]; conflictFields: string[] };

async function enrichMatchingListing(admin: ReturnType<typeof createAdminClient>, input: {
  vendorId: string; candidate: IncomingCandidate; sourceRecordKey: string; sourceContract: CatalogueSourceContract; correlationId: string;
}): Promise<ExistingListingEnrichment> {
  const { data: vendor, error: vendorError } = await admin.from("vendors")
    .select("id, ownership_status, description, contact_email, phone, website, trading_hours")
    .eq("id", input.vendorId).maybeSingle();
  if (vendorError || !vendor) throw new Error("Could not load the matching listing for safe enrichment.");

  const observedAt = `${input.candidate.sourceCheckedOn ?? new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  const fields: Array<["description" | "contact_email" | "phone" | "website" | "trading_hours", string | null | undefined, string | null]> = [
    ["description", input.candidate.description, vendor.description],
    ["contact_email", input.candidate.contactEmail?.toLowerCase(), vendor.contact_email],
    ["phone", input.candidate.phone, vendor.phone],
    ["website", input.candidate.website, vendor.website],
    ["trading_hours", input.candidate.tradingHours, vendor.trading_hours],
  ];
  const appliedFields: string[] = [];
  const conflictFields: string[] = [];
  const updates: Record<string, string> = {};

  for (const [fieldName, incomingValue, currentValue] of fields) {
    const valueText = incomingValue?.trim();
    if (!valueText) continue;
    const currentText = currentValue?.trim() ?? "";
    const sameValue = comparableFieldValue(fieldName, currentText) === comparableFieldValue(fieldName, valueText);
    const canApply = vendor.ownership_status === "unclaimed" && !currentText;
    const emailIsAssignedElsewhere = fieldName === "contact_email" && canApply
      ? await hasExternalContactEmailAssignment(admin, vendor.id, valueText)
      : false;
    const applicationState = canApply && !emailIsAssignedElsewhere
      ? "applied"
      : emailIsAssignedElsewhere || (currentText && !sameValue)
        ? "conflict"
        : "observed";
    const { data: evidence, error: evidenceError } = await admin.from("listing_field_evidence").upsert({
      vendor_id: vendor.id, field_name: fieldName, value_text: valueText,
      source_key: input.sourceContract.key, source_record_key: input.sourceRecordKey,
      source_url: input.candidate.sourceUrl, observed_at: observedAt, freshness_due_at: freshnessDueAt(observedAt, input.sourceContract), confidence: 85,
      evidence_state: applicationState === "conflict" ? "conflict" : "active", application_state: applicationState,
      applied_at: applicationState === "applied" ? new Date().toISOString() : null,
    }, { onConflict: "vendor_id,field_name,source_key,source_record_key,value_text,observed_at", ignoreDuplicates: true }).select("id").maybeSingle();
    if (evidenceError) throw new Error("Could not retain matching-listing field evidence.");
    const evidenceId = evidence?.id ?? (await admin.from("listing_field_evidence").select("id")
      .eq("vendor_id", vendor.id).eq("field_name", fieldName).eq("source_key", input.sourceContract.key)
      .eq("source_record_key", input.sourceRecordKey).eq("value_text", valueText).eq("observed_at", observedAt).maybeSingle()).data?.id;
    if (!evidenceId) throw new Error("Could not recover matching-listing field evidence.");
    if (applicationState === "applied") {
      updates[fieldName] = valueText;
      appliedFields.push(fieldName);
    } else if (applicationState === "conflict") {
      const { error: conflictError } = await admin.from("catalogue_field_conflicts").upsert({
        vendor_id: vendor.id, field_name: fieldName, incoming_evidence_id: evidenceId, current_value: currentText,
      }, { onConflict: "incoming_evidence_id", ignoreDuplicates: true });
      if (conflictError) throw new Error("Could not retain matching-listing field conflict.");
      conflictFields.push(fieldName);
    }
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await admin.from("vendors").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", vendor.id);
    if (updateError) throw new Error("Could not apply safe matching-listing enrichment.");
    const { error: auditError } = await admin.from("audit_events").insert({
      actor_type: "service", action: "approved_source_empty_field_enriched", entity_type: "vendor", entity_id: vendor.id,
      reason: "Approved source filled empty unclaimed listing fields without overwriting existing information.",
      after_data: { applied_fields: appliedFields, owner_control_preserved: true }, correlation_id: input.correlationId,
    });
    if (auditError) throw new Error("Could not audit safe matching-listing enrichment.");
  }
  return { appliedFields, conflictFields };
}

function comparableFieldValue(fieldName: string, value: string) {
  if (fieldName === "phone") return value.replace(/\D/g, "").replace(/^61(?=\d{9,10}$)/, "0");
  if (fieldName === "website") {
    try { const url = new URL(value); return `${url.hostname.toLowerCase().replace(/^www\./, "")}${url.pathname.replace(/\/$/, "")}`; }
    catch { return value.toLowerCase(); }
  }
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

async function hasExternalContactEmailAssignment(
  admin: ReturnType<typeof createAdminClient>,
  vendorId: string,
  email: string,
) {
  const { data, error } = await admin
    .from("vendors")
    .select("id")
    .eq("contact_email", email)
    .neq("id", vendorId)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Could not check the incoming contact email for a safe enrichment.");
  return Boolean(data);
}

function freshnessDueAt(observedAt: string, source: CatalogueSourceContract) {
  const due = new Date(observedAt);
  due.setUTCDate(due.getUTCDate() + source.refreshIntervalDays);
  return due.toISOString();
}

function toCandidateData(candidate: IncomingCandidate) { return { business_name: candidate.businessName, category_slug: candidate.categorySlug, suburb_slug: candidate.suburbSlug, street_address: candidate.streetAddress ?? null, description: candidate.description ?? null, contact_email: candidate.contactEmail ?? null, phone: candidate.phone ?? null, website: candidate.website ?? null, trading_hours: candidate.tradingHours ?? null, source_record_key: candidate.sourceRecordKey, source_url: candidate.sourceUrl, source_checked_on: candidate.sourceCheckedOn ?? null, notes: candidate.notes ?? null }; }
function asText(value: unknown) { return typeof value === "string" ? value.trim() : ""; }
function optionalText(value: unknown) { const text = asText(value); return text || undefined; }
function optionalDescription(value: unknown) { const description = optionalText(value); return description && description.length <= 600 ? description : undefined; }
function optionalTradingHours(value: unknown) {
  const hours = optionalText(value)?.replace(/\s+/g, " ");
  return hours && hours.length <= 300 && (hours === "24/7" || /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/.test(hours)) ? hours : undefined;
}
function nullable(value: string | null | undefined) { return value?.trim() || null; }
function optionalDate(value: unknown) { const date = asText(value); return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined; }
function optionalHttpsUrl(value: unknown) { const text = asText(value); if (!text) return null; try { const url = new URL(text); return url.protocol === "https:" && !url.username && !url.password ? url.toString() : null; } catch { return null; } }
