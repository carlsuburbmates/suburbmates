"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";
import { sendStage1Status } from "@/lib/communications/stage1-status";

const allowedActions = new Set(["needs_information", "approve", "reject", "revoke"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewClaimAction(formData: FormData) {
  const claimId = String(formData.get("claimId") ?? "");
  const action = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const detailPath = `/ops/claims/${claimId}`;

  const { supabase } = await verifyOpsAdmin(detailPath);

  if (!uuidPattern.test(claimId) || !allowedActions.has(action) || reason.length < 1 || reason.length > 2000) {
    redirect(`${detailPath}?error=invalid`);
  }

  const { error } = await supabase.rpc("ops_decide_claim", {
    p_claim_request_id: claimId,
    p_action: action,
    p_reason: reason,
  });

  if (error) {
    redirect(`${detailPath}?error=decision`);
  }
  await sendStage1Status("claim_request", claimId);

  revalidatePath("/ops");
  revalidatePath("/ops/claims");
  revalidatePath(detailPath);
  redirect(`${detailPath}?success=${encodeURIComponent(action)}`);
}
