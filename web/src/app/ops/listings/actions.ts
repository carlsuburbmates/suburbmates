"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decisions = new Set(["publish", "approve_changes", "reject", "unpublish", "restore"]);

export async function saveListingDraftAction(formData: FormData) {
  const vendorId = String(formData.get("vendorId") ?? "");
  const detailPath = `/ops/listings/${vendorId}`;
  const { supabase } = await verifyOpsAdmin(detailPath);
  if (!uuidPattern.test(vendorId)) redirect(`${detailPath}?error=invalid`);

  const { error } = await supabase.rpc("ops_save_listing_draft", {
    p_vendor_id: vendorId,
    p_business_name: String(formData.get("businessName") ?? ""),
    p_category_slug: String(formData.get("categorySlug") ?? ""),
    p_suburb_slug: String(formData.get("suburbSlug") ?? ""),
    p_street_address: nullable(formData.get("streetAddress")),
    p_contact_email: nullable(formData.get("contactEmail")),
    p_phone: nullable(formData.get("phone")),
    p_website: nullable(formData.get("website")),
    p_description: nullable(formData.get("description")),
    p_operator_note: nullable(formData.get("operatorNote")),
  });
  if (error) redirect(`${detailPath}?error=draft`);
  revalidatePath("/ops");
  revalidatePath("/ops/listings");
  revalidatePath(detailPath);
  redirect(`${detailPath}?success=draft`);
}

export async function decideListingAction(formData: FormData) {
  const vendorId = String(formData.get("vendorId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reasonCode = nullable(formData.get("reasonCode"));
  const note = String(formData.get("operatorNote") ?? "").trim();
  const detailPath = `/ops/listings/${vendorId}`;
  const { supabase } = await verifyOpsAdmin(detailPath);
  if (!uuidPattern.test(vendorId) || !decisions.has(decision) || note.length < 1 || note.length > 2000) {
    redirect(`${detailPath}?error=invalid`);
  }
  const { error } = await supabase.rpc("ops_decide_listing", {
    p_vendor_id: vendorId,
    p_action: decision,
    p_reason_code: reasonCode,
    p_operator_note: note,
  });
  if (error) redirect(`${detailPath}?error=decision`);

  revalidatePath("/ops");
  revalidatePath("/ops/listings");
  revalidatePath(detailPath);
  revalidatePath("/");
  revalidatePath("/businesses");
  revalidatePath(`/vendor/${vendorId}`);
  revalidatePath("/sitemap.xml");
  redirect(`${detailPath}?success=${encodeURIComponent(decision)}`);
}

function nullable(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
