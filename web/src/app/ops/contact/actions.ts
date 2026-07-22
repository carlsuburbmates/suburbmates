"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";
import { sendStage2Outcome } from "@/lib/communications/stage1-status";

const allowedStatuses = new Set(["new", "in_progress", "resolved", "spam"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewContactAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const status = String(formData.get("status") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const detailPath = `/ops/contact/${requestId}`;
  const { supabase } = await verifyOpsAdmin(detailPath);

  if (!uuidPattern.test(requestId) || !allowedStatuses.has(status) || reason.length < 1 || reason.length > 2000) {
    redirect(`${detailPath}?error=invalid`);
  }

  const { error } = await supabase.rpc("ops_decide_contact_request", {
    p_contact_request_id: requestId,
    p_status: status,
    p_reason: reason,
  });
  if (error) redirect(`${detailPath}?error=decision`);
  if (status === "resolved") await sendStage2Outcome("contact_request", requestId);

  revalidatePath("/ops");
  revalidatePath("/ops/contact");
  revalidatePath(detailPath);
  redirect(`${detailPath}?success=1`);
}
