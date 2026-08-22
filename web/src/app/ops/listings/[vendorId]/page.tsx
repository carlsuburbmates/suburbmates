import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createOpsDataClient } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";
import { decideListingAction, decideMediaProposalAction, deleteRejectedListingAction, runAbnCheckAction, saveListingDraftAction, setBusinessSubmissionStatusAction } from "../actions";
import { createAdminClient } from "@/utils/supabase/admin";

type Listing = {
  vendor_id: string;
  business_name: string;
  category_slug: string | null;
  suburb_slug: string | null;
  street_address: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  listing_status: string | null;
  listing_source: string | null;
  ownership_status: string;
  is_published: boolean;
  moderation_reason: string | null;
  active_draft_id: string | null;
  draft_values: Record<string, string | null> | null;
};

type ListingEvidence = {
  evidence_id: string;
  evidence_type: string;
  source_url: string | null;
  status: string;
  summary: string | null;
  evidence_data: Record<string, unknown>;
  checked_at: string | null;
  created_at: string;
};
type SubmissionStatus = { submission_status: string; operator_message: string | null; updated_at: string };
type MediaProposal = { proposal_id: string; media_kind: string; storage_path: string; content_type: string; byte_size: number; alt_text: string; source_basis: string; proposal_status: string; operator_reason: string | null; created_at: string; decided_at: string | null };

export default async function OpsListingDetailPage({ params, searchParams }: {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { vendorId } = await params;
  const message = await searchParams;
  const supabase = await createOpsDataClient();
  const [{ data, error }, categoriesResult, suburbsResult, evidenceResult, routeResult, submissionResult, mediaResult] = await Promise.all([
    supabase.rpc("ops_list_listings", { p_status: "all", p_query: null, p_vendor_id: vendorId, p_ownership_status: null, p_listing_source: null, p_limit: 1, p_offset: 0 }),
    supabase.from("categories").select("name, slug").order("name"),
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase.rpc("ops_list_listing_evidence", { p_vendor_id: vendorId }),
    supabase.rpc("resolve_public_vendor_route", { p_route_key: vendorId }),
    supabase.rpc("ops_get_business_submission_status", { p_vendor_id: vendorId }),
    supabase.rpc("ops_list_media_proposals", { p_status: null, p_vendor_id: vendorId }),
  ]);
  if (error || categoriesResult.error || suburbsResult.error || evidenceResult.error) throw new Error("The listing could not be loaded.");
  const listing = data?.[0] as Listing | undefined;
  if (!listing) notFound();
  const values = listing.draft_values ?? listing;
  const status = listing.listing_status;
  const evidence = (evidenceResult.data ?? []) as ListingEvidence[];
  const publicSlug = routeResult.data?.[0]?.current_slug as string | undefined;
  const submission = submissionResult.data?.[0] as SubmissionStatus | undefined;
  const media = (mediaResult.data ?? []) as MediaProposal[];
  const admin = createAdminClient();
  const mediaPreviews = new Map<string, string>();
  await Promise.all(media.map(async (proposal) => {
    const { data: signed } = await admin.storage.from("owner-media-proposals").createSignedUrl(proposal.storage_path, 60);
    if (signed?.signedUrl) mediaPreviews.set(proposal.proposal_id, signed.signedUrl);
  }));
  const success = message.success ?? "";
  const abnStatus = success.startsWith("abn_") ? success.slice(4) : null;
  const successfulAction = ["draft", "submission_status", "publish", "approve_changes", "reject", "unpublish", "restore"].includes(success) || success.startsWith("media_");

  return (
    <div className="space-y-7">
      <Link href="/ops/listings" className="text-sm font-bold underline underline-offset-4">← Back to businesses</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Listing review</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">{listing.business_name}</h2>
          <p className="mt-2 text-slate-600">{statusLabel(status ?? "unclassified")} · {listing.ownership_status}</p>
        </div>
        {listing.is_published && publicSlug && <Link href={`/vendor/${publicSlug}`} className="btn btn-outline">View public profile</Link>}
      </div>

      {message.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-800">{message.error === "draft" ? "The draft could not be saved. Check required fields and formats." : message.error === "abn" ? "The ABN check could not be recorded. Enter 11 digits and try again." : message.error === "delete" ? "This record could not be deleted. Only a never-public rejected listing with no linked operational records can be permanently deleted." : "The action failed. Refresh and check the listing state, draft and reason."}</p>}
      {abnStatus && <AbnResult status={abnStatus} />}
      {successfulAction && <p className="rounded-xl border border-green-300 bg-green-50 p-4 font-semibold text-green-800">{success === "draft" ? "Operator draft saved. The public listing and sitemap were not changed." : success === "submission_status" ? "Private submitter status saved. Publication was not changed." : "Decision recorded with an immutable audit event."}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Source evidence</h3>
        <p className="mt-2 text-sm text-slate-600">Original submitted or imported facts remain separate from the operator draft and public decision.</p>
        {evidence.length === 0 ? <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">No structured evidence record exists for this legacy listing.</p> : (
          <div className="mt-5 space-y-4">{evidence.map((item) => <EvidenceCard key={item.evidence_id} evidence={item} />)}</div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Owner media proposals</h3>
        <p className="mt-2 text-sm text-slate-600">These files remain private unless you approve them. Approval does not publish the listing or change ownership.</p>
        {media.length === 0 ? <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">No owner media has been proposed.</p> : <div className="mt-5 space-y-5">{media.map((proposal) => <article key={proposal.proposal_id} className="rounded-xl border border-slate-200 p-4"><div className="grid gap-4 sm:grid-cols-[11rem_1fr]"><div>{mediaPreviews.get(proposal.proposal_id) ? <Image src={mediaPreviews.get(proposal.proposal_id)!} alt={proposal.alt_text} width={352} height={160} unoptimized className="h-40 w-full rounded-lg object-contain bg-slate-100" /> : <div className="flex h-40 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">Preview unavailable</div>}</div><div><p className="font-bold">{proposal.media_kind === "logo" ? "Logo" : "Listing image"} · {statusLabel(proposal.proposal_status)}</p><p className="mt-2 text-sm">Image description: {proposal.alt_text}</p><p className="mt-2 text-sm text-slate-600">Permission: {proposal.source_basis}</p><p className="mt-2 text-xs text-slate-500">Submitted {formatOpsDateTime(proposal.created_at)} · {Math.ceil(proposal.byte_size / 1024)} KB</p>{proposal.operator_reason && <p className="mt-2 text-sm"><span className="font-semibold">Decision note:</span> {proposal.operator_reason}</p>}</div></div>{proposal.proposal_status === "pending" && <MediaDecisionForm vendorId={vendorId} proposalId={proposal.proposal_id} />}{proposal.proposal_status === "approved" && <MediaDecisionForm vendorId={vendorId} proposalId={proposal.proposal_id} action="remove" />}</article>)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">ABN check</h3>
        <p className="mt-2 text-sm text-slate-600">Use this only for a supplied ABN. The result is private evidence. It never publishes a listing, confirms ownership, changes ranking or changes commercial status.</p>
        <form action={runAbnCheckAction} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input type="hidden" name="vendorId" value={vendorId} />
          <label className="block flex-1 text-sm font-bold">ABN<input name="abn" inputMode="numeric" pattern="[0-9 ]{11,20}" maxLength={20} required placeholder="11 digits" className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <button className="btn btn-outline">Check ABN</button>
        </form>
        <p className="mt-3 text-xs text-slate-500">Only a latest active result less than 90 days old may show “ABN checked” publicly. The ABN number itself stays private.</p>
      </section>

      {submission && <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-xl font-bold">Private submitter status</h3><p className="mt-2 text-sm text-slate-600">This saves a private, signed-in status and does not change publication. If approved status messages are enabled, the system also attempts to notify the submitter.</p><p className="mt-4 font-semibold">Current status: {statusLabel(submission.submission_status)}</p>{submission.operator_message && <p className="mt-2 text-sm">Current message: {submission.operator_message}</p>}{!['approved','declined'].includes(submission.submission_status) && <form action={setBusinessSubmissionStatusAction} className="mt-5 space-y-4"><input type="hidden" name="vendorId" value={vendorId} /><label className="block text-sm font-bold">Outcome<select name="outcome" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="">Choose one</option><option value="needs_information">Needs information</option><option value="approved">Approved</option><option value="declined">Declined</option></select></label><label className="block text-sm font-bold">Plain-language message<textarea name="message" required maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><button className="btn btn-outline">Save private status</button></form>}</section>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Approved public fields and operator draft</h3>
        <p className="mt-2 text-sm text-slate-600">Saving a draft does not change the public listing or sitemap eligibility.</p>
        <form action={saveListingDraftAction} className="mt-6 grid gap-5 sm:grid-cols-2">
          <input type="hidden" name="vendorId" value={vendorId} />
          <Field label="Business name" name="businessName" required defaultValue={value(values, "business_name")} wide />
          <SelectField label="Category" name="categorySlug" required defaultValue={value(values, "category_slug")} options={categoriesResult.data ?? []} />
          <SelectField label="Location" name="suburbSlug" required defaultValue={value(values, "suburb_slug")} options={suburbsResult.data ?? []} />
          <Field label="Street address" name="streetAddress" defaultValue={value(values, "street_address")} />
          <Field label="Contact email" name="contactEmail" type="email" defaultValue={value(values, "contact_email")} />
          <Field label="Phone" name="phone" defaultValue={value(values, "phone")} />
          <Field label="Website" name="website" type="url" defaultValue={value(values, "website")} />
          <label className="sm:col-span-2 text-sm font-bold">Description<textarea name="description" rows={5} defaultValue={value(values, "description")} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="sm:col-span-2 text-sm font-bold">Draft note<textarea name="operatorNote" rows={3} maxLength={2000} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <div className="sm:col-span-2"><button className="btn btn-primary">Save operator draft</button></div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Lifecycle action</h3>
        <p className="mt-2 text-sm text-slate-600">Publication is your explicit decision. Ownership and ABN evidence remain unchanged. Your decision note becomes a permanent record.</p>
        <form action={decideListingAction} className="mt-5 space-y-4">
          <input type="hidden" name="vendorId" value={vendorId} />
          {(status === "pending_review" || status === "published") && listing.active_draft_id && (
            <input type="hidden" name="reasonCode" value="" />
          )}
          <label className="block text-sm font-bold">Decision basis or note<textarea name="operatorNote" required maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <div className="flex flex-wrap gap-3">
            {(status === null || status === "draft") && <button name="decision" value="restore" className="btn btn-primary">Move to review</button>}
            {(status === "rejected" || status === "unpublished") && <button name="decision" value="restore" className="btn btn-primary">Restore for review</button>}
            {status === "pending_review" && listing.active_draft_id && <button name="decision" value="publish" className="btn btn-primary">Approve &amp; publish</button>}
            {status === "published" && listing.active_draft_id && <button name="decision" value="approve_changes" className="btn btn-primary">Approve changes</button>}
          </div>
          <p className="text-sm text-slate-600">Moving a listing to review keeps it private. Publishing makes the approved listing public. Approving changes updates an already public listing.</p>
        </form>

        {status === "pending_review" && <ReasonDecision vendorId={vendorId} decision="reject" label="Reject listing" reasons={rejectReasons} />}
        {status === "published" && <ReasonDecision vendorId={vendorId} decision="unpublish" label="Unpublish listing" reasons={unpublishReasons} />}
      </section>

      {status === "rejected" && <section className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm">
        <h3 className="text-xl font-bold text-red-950">Permanently delete rejected listing</h3>
        <p className="mt-2 text-sm text-red-900">Use this only when this never-public rejected record is no longer needed. It cannot be restored. Its audit history remains.</p>
        <form action={deleteRejectedListingAction} className="mt-5 space-y-4">
          <input type="hidden" name="vendorId" value={vendorId} />
          <label className="block text-sm font-bold text-red-950">Why delete this record?<textarea name="operatorNote" required maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-red-300 bg-white p-3 font-normal text-slate-950" placeholder="Record why permanent deletion is appropriate." /></label>
          <label className="block text-sm font-bold text-red-950">Type DELETE to confirm<input name="confirmation" required autoComplete="off" className="mt-2 w-full rounded-xl border border-red-300 bg-white p-3 font-normal text-slate-950" /></label>
          <button className="btn border-red-800 bg-red-800 text-white hover:bg-red-900">Permanently delete listing</button>
        </form>
      </section>}
      <Link href="/ops/listings" className="inline-block text-sm font-bold underline underline-offset-4">← Back to businesses</Link>
    </div>
  );
}

function Field({ label, name, defaultValue, required, type = "text", wide = false }: { label: string; name: string; defaultValue: string; required?: boolean; type?: string; wide?: boolean }) {
  return <label className={`text-sm font-bold ${wide ? "sm:col-span-2" : ""}`}>{label}<input name={name} type={type} required={required} defaultValue={defaultValue} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>;
}

function SelectField({ label, name, defaultValue, options, required }: { label: string; name: string; defaultValue: string; options: { name: string; slug: string }[]; required?: boolean }) {
  return <label className="text-sm font-bold">{label}<select name={name} required={required} defaultValue={defaultValue} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal">{options.map((option) => <option key={option.slug} value={option.slug}>{option.name}</option>)}</select></label>;
}

function ReasonDecision({ vendorId, decision, label, reasons }: { vendorId: string; decision: string; label: string; reasons: readonly { value: string; label: string }[] }) {
  const outcome = decision === "unpublish" ? "This removes the listing from public access but keeps the record and its decision history." : "This keeps the listing private and retains the record and its decision history.";
  return <form action={decideListingAction} className="mt-8 space-y-4 border-t border-slate-200 pt-6"><p className="text-sm text-slate-600">{outcome}</p><input type="hidden" name="vendorId" value={vendorId} /><input type="hidden" name="decision" value={decision} /><label className="block text-sm font-bold">Reason<select name="reasonCode" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="">Select a reason</option>{reasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label><label className="block text-sm font-bold">Operator note<textarea name="operatorNote" required maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><button className="btn border-red-300 bg-red-50 text-red-800 hover:bg-red-100">{label}</button></form>;
}

function value(source: Listing | Record<string, string | null>, key: string) {
  const result = (source as Record<string, unknown>)[key];
  return typeof result === "string" ? result : "";
}

function statusLabel(status: string) {
  if (status === "unclassified") return "Needs classification";
  return status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function AbnResult({ status }: { status: string }) {
  const message = {
    active: "ABN is active. The result has been saved as private evidence. It has not changed publication, ownership, ranking or commercial status.",
    inactive: "ABN is not active. The result has been saved as private evidence. Review it alongside the rest of the listing evidence.",
    invalid: "This number did not pass ABN validation. No external lookup was made; the result has been recorded privately.",
    not_found: "ABN Lookup did not find this number. The result has been saved as private evidence for review.",
    provider_failure: "ABN Lookup could not complete the check. Nothing else changed; try again later.",
  }[status] ?? "ABN check recorded. It has not changed publication, ownership, ranking or commercial status.";
  const caution = status !== "active";
  return <p role={caution ? "status" : undefined} className={`rounded-xl border p-4 font-semibold ${caution ? "border-amber-300 bg-amber-50 text-amber-900" : "border-green-300 bg-green-50 text-green-800"}`}>{message}</p>;
}

function MediaDecisionForm({ vendorId, proposalId, action }: { vendorId: string; proposalId: string; action?: "remove" }) {
  const actions = action ? ["remove"] : ["approve", "reject"];
  return <form action={decideMediaProposalAction} className="mt-4 space-y-3 border-t border-slate-200 pt-4"><input type="hidden" name="vendorId" value={vendorId} /><input type="hidden" name="proposalId" value={proposalId} /><label className="block text-sm font-bold">Decision note<textarea name="reason" required maxLength={2000} rows={2} className="mt-2 w-full rounded-lg border border-slate-300 p-3 font-normal" placeholder="Record why you are making this decision." /></label><div className="flex flex-wrap gap-3">{actions.map((choice) => <button key={choice} name="action" value={choice} className={choice === "approve" ? "btn btn-primary" : "btn border-red-300 bg-red-50 text-red-800 hover:bg-red-100"}>{choice.replace(/^./, (letter) => letter.toUpperCase())} media</button>)}</div></form>;
}

function EvidenceCard({ evidence }: { evidence: ListingEvidence }) {
  const fields = Object.entries(evidence.evidence_data).filter(([, value]) => value !== null && value !== "");
  return (
    <article className="rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-bold">{statusLabel(evidence.evidence_type)}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabel(evidence.status)}</span></div>
      {evidence.summary && <p className="mt-3 text-sm text-slate-700">{evidence.summary}</p>}
      {evidence.source_url && <p className="mt-2 break-all text-sm text-slate-600">Source: {evidence.source_url}</p>}
      {fields.length > 0 && <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">{fields.map(([key, fieldValue]) => <div key={key} className="rounded-lg bg-slate-50 p-3"><dt className="font-semibold text-slate-500">{statusLabel(key)}</dt><dd className="mt-1 break-words">{typeof fieldValue === "object" ? JSON.stringify(fieldValue) : String(fieldValue)}</dd></div>)}</dl>}
      <p className="mt-3 text-xs text-slate-500">Recorded {formatOpsDateTime(evidence.created_at)}{evidence.checked_at ? ` · Checked ${formatOpsDateTime(evidence.checked_at)}` : ""}</p>
    </article>
  );
}

const rejectReasons = [
  { value: "obvious_spam", label: "Obvious spam" }, { value: "business_not_found", label: "Business not found" },
  { value: "outside_geographic_scope", label: "Outside geographic scope" }, { value: "unsupported_category", label: "Unsupported category" },
  { value: "malicious_or_misleading_website", label: "Unsafe or misleading website" }, { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "insufficient_evidence", label: "Insufficient evidence" }, { value: "prohibited_content", label: "Prohibited content" },
  { value: "business_closed", label: "Business closed" }, { value: "invalid_submission", label: "Invalid submission" }, { value: "other", label: "Other" },
] as const;
const unpublishReasons = [
  { value: "business_closed", label: "Business closed" }, { value: "unsafe_outbound_url", label: "Unsafe outbound URL" },
  { value: "inaccurate_listing", label: "Inaccurate listing" }, { value: "duplicate_listing", label: "Duplicate listing" },
  { value: "ownership_dispute", label: "Ownership dispute" }, { value: "privacy_or_legal_concern", label: "Privacy or legal concern" },
  { value: "investigation", label: "Investigation" }, { value: "operator_decision", label: "Operator decision" },
  { value: "other", label: "Other" },
] as const;
