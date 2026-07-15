"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function reviewProfileChangeAction(formData: FormData) {
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const detailPath = `/ops/profile-edits/${requestId}`;
  const { supabase } = await verifyOpsAdmin(detailPath);

  if (!uuidPattern.test(requestId) || !["approve", "reject"].includes(decision) || reason.length < 1 || reason.length > 2000) {
    redirect(`${detailPath}?error=invalid`);
  }

  const { data, error } = await supabase.rpc("ops_decide_profile_change", {
    p_change_request_id: requestId,
    p_action: decision,
    p_reason: reason,
  });

  if (error) redirect(`${detailPath}?error=decision`);

  const vendorId = data?.[0]?.vendor_id;
  revalidatePath("/ops");
  revalidatePath("/ops/profile-edits");
  revalidatePath(detailPath);
  revalidatePath("/dashboard");
  revalidatePath("/businesses");
  if (vendorId) revalidatePath(`/vendor/${vendorId}`);
  redirect(`${detailPath}?success=${encodeURIComponent(decision)}`);
}
