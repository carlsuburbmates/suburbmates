import "server-only";

import { makeHubSpotDecisionTask, type DecisionInboxItem, type DecisionInboxKind } from "@/lib/hubspot/decision-task";
import { runtimeEnv } from "@/lib/runtime-env";
import { createAdminClient } from "@/utils/supabase/admin";

type Mapping = {
  work_item_id: string;
  hubspot_task_id: string;
  work_kind: DecisionInboxKind;
  task_state: "open" | "completed";
  fingerprint: string;
};

type SyncResult = { enabled: boolean; created: number; updated: number; completed: number; open: number };

const hubSpotTaskEndpoint = "https://api.hubapi.com/crm/objects/2026-03/tasks";
const taskKinds = new Set<DecisionInboxKind>(["listing", "claim", "profile", "contact", "candidate", "catalogue", "system"]);

export async function syncHubSpotDecisionInbox(): Promise<SyncResult> {
  const config = configForHubSpotDecisionInbox();
  if (!config) return { enabled: false, created: 0, updated: 0, completed: 0, open: 0 };

  const admin = createAdminClient();
  const items = await loadOpenDecisionInboxItems();
  const { data: storedMappings, error: mappingError } = await admin
    .from("hubspot_decision_inbox_items")
    .select("work_item_id, hubspot_task_id, work_kind, task_state, fingerprint");
  if (mappingError) throw new Error("Could not load HubSpot Decision Inbox mappings.");
  const mappings = new Map((storedMappings ?? []).map((mapping) => [mapping.work_item_id, mapping as Mapping]));
  const now = new Date().toISOString();
  let created = 0;
  let updated = 0;
  let completed = 0;

  for (const item of items) {
    const task = makeHubSpotDecisionTask(item, config.ownerId, config.baseUrl, now);
    const mapping = mappings.get(item.workId);
    if (!mapping) {
      const taskId = await createHubSpotTask(config.token, task.properties);
      await saveMapping(admin, { workItemId: item.workId, taskId, workKind: item.kind, state: "open", fingerprint: task.fingerprint });
      created++;
      continue;
    }
    if (mapping.task_state === "completed" || mapping.fingerprint !== task.fingerprint) {
      await updateHubSpotTask(config.token, mapping.hubspot_task_id, task.properties);
      await saveMapping(admin, { workItemId: item.workId, taskId: mapping.hubspot_task_id, workKind: item.kind, state: "open", fingerprint: task.fingerprint });
      updated++;
    }
  }

  const activeIds = new Set(items.map((item) => item.workId));
  for (const mapping of mappings.values()) {
    if (mapping.task_state === "open" && !activeIds.has(mapping.work_item_id)) {
      await completeHubSpotTask(config.token, mapping.hubspot_task_id);
      await saveMapping(admin, { workItemId: mapping.work_item_id, taskId: mapping.hubspot_task_id, workKind: mapping.work_kind, state: "completed", fingerprint: mapping.fingerprint });
      completed++;
    }
  }

  return { enabled: true, created, updated, completed, open: items.length };
}

// A HubSpot outage must not block a protected Ops decision. The scheduled
// reconciliation will retry any closure that cannot be completed here.
export async function closeHubSpotDecisionInboxTask(workItemId: string) {
  const config = configForHubSpotDecisionInbox();
  if (!config) return false;
  try {
    const admin = createAdminClient();
    const { data: mapping, error } = await admin
      .from("hubspot_decision_inbox_items")
      .select("work_item_id, hubspot_task_id, work_kind, task_state, fingerprint")
      .eq("work_item_id", workItemId)
      .maybeSingle();
    if (error || !mapping || mapping.task_state === "completed" || !taskKinds.has(mapping.work_kind as DecisionInboxKind)) return false;
    await completeHubSpotTask(config.token, mapping.hubspot_task_id);
    await saveMapping(admin, {
      workItemId: mapping.work_item_id,
      taskId: mapping.hubspot_task_id,
      workKind: mapping.work_kind as DecisionInboxKind,
      state: "completed",
      fingerprint: mapping.fingerprint,
    });
    return true;
  } catch {
    return false;
  }
}

export function hubSpotDecisionInboxIsConfigured() {
  return Boolean(configForHubSpotDecisionInbox());
}

async function loadOpenDecisionInboxItems(): Promise<DecisionInboxItem[]> {
  const admin = createAdminClient();
  const [listings, claims, profiles, contacts, candidates, health, jobs, latestCatalogueRun] = await Promise.all([
    admin.from("vendors").select("id, business_name").or("listing_status.is.null,listing_status.in.(draft,pending_review)"),
    admin.from("claim_requests").select("id, claim_status, vendors!inner(business_name)").in("claim_status", ["pending", "needs_information"]),
    admin.from("listing_change_requests").select("id, vendors!inner(business_name)").eq("change_status", "pending"),
    admin.from("contact_requests").select("id, topic").in("contact_status", ["new", "in_progress"]),
    admin.from("candidate_handoff_records").select("id, qualification_reasons").eq("qualification_outcome", "exception").eq("exception_status", "open"),
    admin.from("integration_health").select("integration_name, status").in("status", ["failed", "degraded", "stale"]),
    admin.from("automation_jobs").select("id, job_type").eq("status", "failed"),
    admin.from("existing_catalogue_requalification_runs").select("id").eq("status", "completed").order("completed_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle(),
  ]);
  for (const [name, result] of Object.entries({ listings, claims, profiles, contacts, candidates, health, jobs, latestCatalogueRun })) {
    if (result.error) throw new Error(`Could not load the current SuburbMates decision queue: ${name}.`);
  }

  const catalogue = latestCatalogueRun.data
    ? await admin.from("existing_catalogue_requalification_records").select("id, vendor_id, qualification_reasons").eq("run_id", latestCatalogueRun.data.id).eq("qualification_outcome", "exception").eq("exception_status", "open")
    : { data: [], error: null };
  if (catalogue.error) throw new Error("Could not load current catalogue review decisions.");

  return [
    ...(listings.data ?? []).filter((row) => !isTestFixture(row.business_name)).map((row) => item(`listing:${row.id}`, "listing", "needs_decision", `/ops/listings/${row.id}`, row.business_name)),
    ...(claims.data ?? []).filter((row) => !isTestFixture(firstBusinessName(row.vendors))).map((row) => item(`claim:${row.id}`, "claim", "needs_decision", `/ops/claims/${row.id}`, firstBusinessName(row.vendors))),
    ...(profiles.data ?? []).filter((row) => !isTestFixture(firstBusinessName(row.vendors))).map((row) => item(`profile:${row.id}`, "profile", "needs_decision", `/ops/profile-edits/${row.id}`, firstBusinessName(row.vendors))),
    ...(contacts.data ?? []).map((row) => item(`contact:${row.id}`, "contact", "needs_decision", `/ops/contact/${row.id}`, null, row.topic)),
    ...(candidates.data ?? []).filter((row) => isOnlyPossibleDuplicate(row.qualification_reasons)).map((row) => item(`candidate:${row.id}`, "candidate", "needs_decision", `/ops/candidates/${row.id}`)),
    ...(catalogue.data ?? []).filter((row) => isOnlyPossibleDuplicate(row.qualification_reasons)).map((row) => item(`catalogue:${row.id}`, "catalogue", "later_review", `/ops/listings/${row.vendor_id}`)),
    ...(health.data ?? []).map((row) => item(`health:${row.integration_name}`, "system", "act_now", `/ops/system#health-${row.integration_name}`, row.integration_name)),
    ...(jobs.data ?? []).map((row) => item(`job:${row.id}`, "system", "act_now", `/ops/system#job-${row.id}`, row.job_type)),
  ];
}

function item(workId: string, kind: DecisionInboxKind, priority: DecisionInboxItem["priority"], href: string, title?: string | null, topic?: string | null): DecisionInboxItem {
  return { workId, kind, priority, href, title, topic };
}

function firstBusinessName(value: unknown): string | null {
  if (Array.isArray(value)) return firstBusinessName(value[0]);
  if (!value || typeof value !== "object") return null;
  const businessName = (value as { business_name?: unknown }).business_name;
  return typeof businessName === "string" ? businessName : null;
}

function isOnlyPossibleDuplicate(value: unknown) {
  return Array.isArray(value) && value.length === 1 && value[0] === "possible_duplicate";
}

function isTestFixture(value: string | null) {
  return /\b(?:test|fixture)\b/i.test(value ?? "");
}

async function saveMapping(admin: ReturnType<typeof createAdminClient>, input: { workItemId: string; taskId: string; workKind: DecisionInboxKind; state: "open" | "completed"; fingerprint: string }) {
  const { error } = await admin.from("hubspot_decision_inbox_items").upsert({
    work_item_id: input.workItemId,
    hubspot_task_id: input.taskId,
    work_kind: input.workKind,
    task_state: input.state,
    fingerprint: input.fingerprint,
    last_synced_at: new Date().toISOString(),
    completed_at: input.state === "completed" ? new Date().toISOString() : null,
  }, { onConflict: "work_item_id" });
  if (error) throw new Error("Could not store the HubSpot Decision Inbox mapping.");
}

async function createHubSpotTask(token: string, properties: Record<string, string>) {
  const response = await hubSpotRequest(token, hubSpotTaskEndpoint, "POST", { properties });
  const body = await response.json().catch(() => null) as { id?: unknown } | null;
  if (!response.ok || typeof body?.id !== "string") throw new Error("HubSpot could not create the Decision Inbox task.");
  return body.id;
}

async function updateHubSpotTask(token: string, taskId: string, properties: Record<string, string>) {
  const response = await hubSpotRequest(token, `${hubSpotTaskEndpoint}/${encodeURIComponent(taskId)}`, "PATCH", { properties });
  if (!response.ok) throw new Error("HubSpot could not update the Decision Inbox task.");
}

async function completeHubSpotTask(token: string, taskId: string) {
  const response = await hubSpotRequest(token, `${hubSpotTaskEndpoint}/${encodeURIComponent(taskId)}`, "PATCH", { properties: { hs_task_status: "COMPLETED" } });
  if (!response.ok) throw new Error("HubSpot could not close the Decision Inbox task.");
}

function hubSpotRequest(token: string, url: string, method: "POST" | "PATCH", body: unknown) {
  return fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
}

function configForHubSpotDecisionInbox() {
  if (runtimeEnv("HUBSPOT_DECISION_INBOX_ENABLED") !== "true") return null;
  const token = runtimeEnv("HUBSPOT_PRIVATE_APP_TOKEN");
  const ownerId = runtimeEnv("HUBSPOT_OWNER_ID");
  if (!token || !ownerId) return null;
  return { token, ownerId, baseUrl: runtimeEnv("NEXT_PUBLIC_BASE_URL") ?? "https://suburbmates.com.au" };
}
