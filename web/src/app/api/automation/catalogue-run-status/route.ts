import { NextRequest, NextResponse } from "next/server";
import { getCatalogueSourceContract } from "@/lib/automation/catalogue-source-contract";
import { runtimeEnv } from "@/lib/runtime-env";
import { createAdminClient } from "@/utils/supabase/admin";

type Outcome = "started" | "completed" | "failed";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!runtimeEnv("AUTOMATION_INGEST_TOKEN") || token !== runtimeEnv("AUTOMATION_INGEST_TOKEN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, unknown>;
    const source = text(body.source);
    const outcome = text(body.outcome) as Outcome | null;
    const workflowRunId = text(body.workflowRunId);
    const contract = source ? getCatalogueSourceContract(source) : null;
    if (!contract || (outcome !== "started" && outcome !== "completed" && outcome !== "failed")) {
      return NextResponse.json({ error: "Invalid catalogue run outcome" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const integrationName = contract.key === "openstreetmap" ? "openstreetmap_source" : `${contract.key}_source`;
    const started = outcome === "started";
    const failed = outcome === "failed";
    const healthStatus = started ? "running" : failed ? "failed" : "healthy";
    const message = failed
      ? `The ${contract.displayName} source handoff workflow did not finish. Completed records retain their audited state; unprocessed candidates were not changed.`
      : null;
    const admin = createAdminClient();
    const metadata = { source: contract.key, source_contract: contract.version, workflow_run_id: workflowRunId };
    const [sourceHealth, handoffHealth] = await Promise.all([
      admin.from("integration_health").upsert({
        integration_name: integrationName,
        status: healthStatus,
        last_success_at: outcome === "completed" ? now : undefined,
        last_failure_at: failed ? now : undefined,
        last_error: failed ? message : null,
        metadata,
      }, { onConflict: "integration_name" }),
      admin.from("integration_health").upsert({
        integration_name: "candidate_handoff",
        status: healthStatus,
        last_success_at: outcome === "completed" ? now : undefined,
        last_failure_at: failed ? now : undefined,
        last_error: failed ? message : null,
        metadata,
      }, { onConflict: "integration_name" }),
    ]);
    if (sourceHealth.error || handoffHealth.error) {
      throw new Error("Could not record the catalogue handoff outcome.");
    }
    if (!started) {
      const { error: auditError } = await admin.from("audit_events").insert({
        actor_type: "service",
        action: failed ? "catalogue_source_handoff_failed" : "catalogue_source_handoff_completed",
        entity_type: "catalogue_source",
        entity_id: contract.key,
        reason: message ?? "All scheduled source handoff shards completed.",
        after_data: { ...metadata, outcome, listing_state_changed_by_status_callback: false },
      });
      if (auditError) throw new Error("Could not record the catalogue handoff outcome.");
    }
    return NextResponse.json({ recorded: true, outcome });
  } catch (error) {
    console.error("Could not record catalogue handoff outcome", error);
    return NextResponse.json({ error: "Could not record catalogue handoff outcome" }, { status: 500 });
  }
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() && value.length <= 120 ? value.trim() : null;
}
