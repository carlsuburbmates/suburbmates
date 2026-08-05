"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";
import { closeHubSpotDecisionInboxTask } from "@/lib/hubspot/decision-inbox";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function resolveCandidateExceptionAction(formData: FormData) {
  const recordId = String(formData.get("recordId") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const detailPath = `/ops/candidates/${recordId}`;
  const { supabase } = await verifyOpsAdmin(detailPath);
  if (!uuidPattern.test(recordId) || !["acknowledge", "dismiss"].includes(action) || note.length < 1 || note.length > 2000) {
    redirect(`${detailPath}?error=invalid`);
  }
  const { error } = await supabase.rpc("ops_resolve_candidate_handoff_record", {
    p_record_id: recordId,
    p_action: action,
    p_operator_note: note,
  });
  if (error) redirect(`${detailPath}?error=resolve`);
  await closeHubSpotDecisionInboxTask(`candidate:${recordId}`);
  revalidatePath("/ops");
  revalidatePath("/ops/candidates");
  revalidatePath(detailPath);
  redirect(`${detailPath}?success=${action}`);
}
