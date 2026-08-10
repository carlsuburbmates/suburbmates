import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import Module from "node:module";
import { createClient } from "@supabase/supabase-js";

const fixturePath = process.env.D017_FIXTURE_PATH;
const evidencePath = process.env.D017_COMMUNICATIONS_EVIDENCE_PATH;
if (!fixturePath || process.env.D017_CONTROLLED_ACCEPTANCE !== "true") throw new Error("D-017 communications acceptance requires its controlled fixture.");

async function main() {
  const fixture = JSON.parse(await readFile(fixturePath!, "utf8"));
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  if (!url || !key || url.includes("lqxohgpignkqqfkkbzsn")) throw new Error("D-017 communications acceptance refuses missing or production credentials.");
  process.env.TRANSACTIONAL_STATUS_EMAILS_ENABLED = "true";
  process.env.RESEND_API_KEY = "d017-controlled-provider-key";
  process.env.TRANSACTIONAL_STATUS_FROM = "auth@suburbmates.test";
  const service = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const calls: Array<{ url: string; body: unknown }> = [];
  const realFetch = globalThis.fetch;
  const originalLoad = (Module as unknown as { _load: (...args: unknown[]) => unknown })._load;
  try {
  // Next replaces this compile-time marker during its server build. Keep the
  // module server-only in the product while allowing this Node acceptance
  // runner to execute its server code directly.
  (Module as unknown as { _load: (request: string, ...args: unknown[]) => unknown })._load = (request, ...args) => request === "server-only" ? {} : originalLoad(request, ...args);
  const { createAdminClient } = await import("../src/utils/supabase/admin");
  const probe = await createAdminClient().rpc("prepare_stage1_status_communication", { p_entity_type: "profile_change", p_entity_id: fixture.workflowIds.profileChangeId });
  console.log(JSON.stringify({ adminProbe: { rows: probe.data?.length ?? 0, error: probe.error?.message ?? null } }));
  assert.ifError(probe.error);
  globalThis.fetch = async (input, init) => {
    if (String(input) !== "https://api.resend.com/emails") return realFetch(input, init);
    calls.push({ url: String(input), body: init?.body ? JSON.parse(String(init.body)) : null });
    return new Response(JSON.stringify({ id: "d017-provider-success" }), { status: 200, headers: { "content-type": "application/json" } });
  };
  const { sendStage1Status, sendStage2Outcome } = await import("../src/lib/communications/stage1-status");
  const sent = await sendStage1Status("profile_change", fixture.workflowIds.profileChangeId);
  assert.deepEqual(sent, { sent: true, reason: "sent" });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.resend.com/emails");
  assert.equal((calls[0].body as { to: string[] }).to.length, 1);
  const delivered = await service.from("communication_deliveries").select("delivery_status, provider_message_id").eq("entity_id", fixture.workflowIds.profileChangeId).single();
  assert.ifError(delivered.error);
  assert.equal(delivered.data.delivery_status, "sent");
  assert.equal(delivered.data.provider_message_id, "d017-provider-success");

  globalThis.fetch = async (input, init) => String(input) === "https://api.resend.com/emails"
    ? new Response(JSON.stringify({ message: "Controlled provider rejection" }), { status: 503, headers: { "content-type": "application/json" } })
    : realFetch(input, init);
  const failed = await sendStage2Outcome("contact_request", fixture.workflowIds.contactRequestId);
  assert.deepEqual(failed, { sent: false, reason: "failed" });
  const failure = await service.from("communication_deliveries").select("delivery_status, provider_error").eq("entity_id", fixture.workflowIds.contactRequestId).single();
  assert.ifError(failure.error);
  assert.equal(failure.data.delivery_status, "failed");
  assert.match(failure.data.provider_error ?? "", /Controlled provider rejection/);
  const result = { assertions: ["permitted status delivery records provider success", "controlled provider failure is retained while in-product workflow data remains independent"], fixturePrefix: fixture.fixturePrefix };
  if (evidencePath) await writeFile(evidencePath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(result, null, 2));
  } finally {
    globalThis.fetch = realFetch;
    (Module as unknown as { _load: (...args: unknown[]) => unknown })._load = originalLoad;
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
