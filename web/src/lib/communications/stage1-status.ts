import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";
import { runtimeEnv } from "@/lib/runtime-env";

export async function sendStage1Status(entityType: "claim_request" | "profile_change", entityId: string) {
  // This is deliberately hard-off until the public launch and this stage are
  // explicitly accepted. Missing or any value other than true means no send.
  if (runtimeEnv("TRANSACTIONAL_STATUS_EMAILS_ENABLED") !== "true") return { sent: false, reason: "disabled" as const };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("prepare_stage1_status_communication", { p_entity_type: entityType, p_entity_id: entityId });
  if (error || !data?.[0]) return { sent: false, reason: "preparation_failed" as const };
  const message = data[0] as { communication_delivery_id: string; recipient_email: string; request_status: string; business_name: string; message_type: string };
  const apiKey = runtimeEnv("RESEND_API_KEY");
  const from = runtimeEnv("TRANSACTIONAL_STATUS_FROM");
  if (!apiKey || !from) return recordFailure(admin, message.communication_delivery_id, "Status email is enabled but sender configuration is missing.");
  const title = message.message_type === "claim_status" ? "Your SuburbMates ownership request" : "Your SuburbMates profile update";
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [message.recipient_email], subject: title, text: `${message.business_name}: your request is ${message.request_status.replaceAll("_", " ")}. Sign in to SuburbMates to view the current status and next step.` }) });
  const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !body.id) return recordFailure(admin, message.communication_delivery_id, body.message || "Status email provider rejected the message.");
  await admin.rpc("record_communication_delivery", { p_communication_delivery_id: message.communication_delivery_id, p_provider_message_id: body.id, p_provider_error: null });
  return { sent: true, reason: "sent" as const };
}

async function recordFailure(admin: ReturnType<typeof createAdminClient>, deliveryId: string, message: string) {
  await admin.rpc("record_communication_delivery", { p_communication_delivery_id: deliveryId, p_provider_message_id: null, p_provider_error: message.slice(0, 1000) });
  return { sent: false, reason: "failed" as const };
}
