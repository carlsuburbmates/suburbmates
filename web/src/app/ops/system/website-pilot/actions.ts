"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";

const path = "/ops/system/website-pilot";

export async function decideOfficialWebsiteDomainAction(formData: FormData) {
  const hostName = String(formData.get("hostName") ?? "").trim().toLowerCase();
  const action = String(formData.get("action") ?? "").trim();
  const termsUrl = String(formData.get("termsUrl") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const { supabase } = await verifyOpsAdmin(path);
  if (!/^[a-z0-9][a-z0-9.-]{0,251}[a-z0-9]$/.test(hostName) || !["approve", "block"].includes(action) || reason.length < 1 || reason.length > 2000) redirect(`${path}?error=invalid`);
  const { error } = await supabase.rpc("ops_decide_official_website_domain_review", {
    p_host_name: hostName, p_action: action, p_terms_url: termsUrl || null, p_reason: reason,
  });
  if (error) redirect(`${path}?error=decision`);
  revalidatePath("/ops/system");
  revalidatePath(path);
  redirect(`${path}?success=${action}`);
}
