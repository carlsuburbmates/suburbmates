"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";
import { checkAbn, normalizeAbn } from "@/lib/automation/abn-lookup";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decisions = new Set(["publish", "approve_changes", "reject", "unpublish", "restore"]);
const submissionOutcomes = new Set(["needs_information", "approved", "declined"]);
const mediaActions = new Set(["approve", "reject", "remove"]);

export async function decideMediaProposalAction(formData: FormData) {
  const vendorId = String(formData.get("vendorId") ?? "");
  const proposalId = String(formData.get("proposalId") ?? "");
  const action = String(formData.get("action") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const detailPath = `/ops/listings/${vendorId}`;
  const { supabase } = await verifyOpsAdmin(detailPath);
  if (!uuidPattern.test(vendorId) || !uuidPattern.test(proposalId) || !mediaActions.has(action) || reason.length < 1 || reason.length > 2000) redirect(`${detailPath}?error=media`);
  const { error } = await supabase.rpc("ops_decide_media_proposal", { p_proposal_id: proposalId, p_action: action, p_reason: reason });
  if (error) redirect(`${detailPath}?error=media`);
  revalidatePath("/ops"); revalidatePath("/ops/listings"); revalidatePath(detailPath); revalidatePath("/dashboard");
  redirect(`${detailPath}?success=media_${action}`);
}

export async function runAbnCheckAction(formData: FormData) {
  const vendorId = String(formData.get("vendorId") ?? "");
  const abn = normalizeAbn(String(formData.get("abn") ?? ""));
  const detailPath = `/ops/listings/${vendorId}`;
  const { supabase } = await verifyOpsAdmin(detailPath);
  if (!uuidPattern.test(vendorId) || !/^\d{11}$/.test(abn)) redirect(`${detailPath}?error=abn`);

  const result = await checkAbn(abn);
  const { error } = await supabase.rpc("ops_record_abn_check", {
    p_vendor_id: vendorId,
    p_submitted_abn: abn,
    p_abn_status: result.abnStatus,
    p_entity_status: result.entityStatus,
    p_official_names: result.officialNames,
    p_checked_at: result.checkedAt,
    p_error_message: result.errorMessage,
  });
  if (error) redirect(`${detailPath}?error=abn`);
  revalidatePath("/ops");
  revalidatePath("/ops/listings");
  revalidatePath(detailPath);
  redirect(`${detailPath}?success=abn_${result.abnStatus}`);
}

export async function setBusinessSubmissionStatusAction(formData: FormData) {
  const vendorId = String(formData.get("vendorId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const message = String(formData.get("message") ?? "").trim();
  const detailPath = `/ops/listings/${vendorId}`;
  const { supabase } = await verifyOpsAdmin(detailPath);
  if (!uuidPattern.test(vendorId) || !submissionOutcomes.has(outcome) || message.length < 1 || message.length > 2000) redirect(`${detailPath}?error=submission_status`);
  const { error } = await supabase.rpc("ops_set_business_submission_status", { p_vendor_id: vendorId, p_status: outcome, p_message: message });
  if (error) redirect(`${detailPath}?error=submission_status`);
  revalidatePath("/dashboard"); revalidatePath(detailPath);
  redirect(`${detailPath}?success=submission_status`);
}

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
  const { data: beforeRoute } = await supabase.rpc("resolve_public_vendor_route", { p_route_key: vendorId });
  const { error } = await supabase.rpc("ops_decide_listing", {
    p_vendor_id: vendorId,
    p_action: decision,
    p_reason_code: reasonCode,
    p_operator_note: note,
  });
  if (error) redirect(`${detailPath}?error=decision`);
  const { data: afterRoute } = await supabase.rpc("resolve_public_vendor_route", { p_route_key: vendorId });

  revalidatePath("/ops");
  revalidatePath("/ops/listings");
  revalidatePath(detailPath);
  revalidatePath("/");
  revalidatePath("/businesses");
  revalidatePath(`/vendor/${vendorId}`);
  for (const slug of new Set([beforeRoute?.[0]?.current_slug, afterRoute?.[0]?.current_slug].filter(Boolean))) {
    revalidatePath(`/vendor/${slug}`);
  }
  revalidatePath("/sitemap.xml");
  redirect(`${detailPath}?success=${encodeURIComponent(decision)}`);
}

function nullable(value: FormDataEntryValue | null) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
