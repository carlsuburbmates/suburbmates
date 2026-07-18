import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";
import { decideListingAction, saveListingDraftAction } from "../actions";

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
  tier: string;
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

export default async function OpsListingDetailPage({ params, searchParams }: {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { vendorId } = await params;
  const message = await searchParams;
  const { supabase } = await verifyOpsAdmin(`/ops/listings/${vendorId}`);
  const [{ data, error }, categoriesResult, suburbsResult, evidenceResult, routeResult] = await Promise.all([
    supabase.rpc("ops_list_listings", { p_status: "all", p_query: null, p_vendor_id: vendorId, p_limit: 1, p_offset: 0 }),
    supabase.from("categories").select("name, slug").order("name"),
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase.rpc("ops_list_listing_evidence", { p_vendor_id: vendorId }),
    supabase.rpc("resolve_public_vendor_route", { p_route_key: vendorId }),
  ]);
  if (error || categoriesResult.error || suburbsResult.error || evidenceResult.error) throw new Error("The listing could not be loaded.");
  const listing = data?.[0] as Listing | undefined;
  if (!listing) notFound();
  const values = listing.draft_values ?? listing;
  const status = listing.listing_status;
  const evidence = (evidenceResult.data ?? []) as ListingEvidence[];
  const publicSlug = routeResult.data?.[0]?.current_slug as string | undefined;
  const successfulAction = ["draft", "publish", "approve_changes", "reject", "unpublish", "restore"].includes(message.success ?? "");

  return (
    <div className="space-y-7">
      <Link href="/ops/listings" className="text-sm font-bold underline underline-offset-4">← Back to listings</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Listing review</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">{listing.business_name}</h2>
          <p className="mt-2 text-slate-600">{statusLabel(status ?? "unclassified")} · {listing.ownership_status} · {listing.tier}</p>
        </div>
        {listing.is_published && publicSlug && <Link href={`/vendor/${publicSlug}`} className="btn btn-outline">View public profile</Link>}
      </div>

      {message.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-800">{message.error === "draft" ? "The draft could not be saved. Check required fields and formats." : "The action failed. Refresh and check the listing state, draft and reason."}</p>}
      {successfulAction && <p className="rounded-xl border border-green-300 bg-green-50 p-4 font-semibold text-green-800">{message.success === "draft" ? "Operator draft saved. The public listing and sitemap were not changed." : "Decision recorded with an audit event."}</p>}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Source evidence</h3>
        <p className="mt-2 text-sm text-slate-600">Original submitted or imported facts remain separate from the operator draft and public decision.</p>
        {evidence.length === 0 ? <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm text-slate-600">No structured evidence record exists for this legacy listing.</p> : (
          <div className="mt-5 space-y-4">{evidence.map((item) => <EvidenceCard key={item.evidence_id} evidence={item} />)}</div>
        )}
      </section>

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
        <p className="mt-2 text-sm text-slate-600">Publication is your explicit decision. Ownership, ABN, payment and tier remain unchanged. Your decision note becomes a permanent record.</p>
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
  return <form action={decideListingAction} className="mt-8 space-y-4 border-t border-slate-200 pt-6"><p className="text-sm text-slate-600">{outcome}</p><input type="hidden" name="vendorId" value={vendorId} /><input type="hidden" name="decision" value={decision} /><label className="block text-sm font-bold">Reason<select name="reasonCode" required className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="">Select a reason</option>{reasons.map((reason) => <option key={reason.value} value={reason.value}>{reason.label}</option>)}</select></label><label className="block text-sm font-bold">Operator note<textarea name="operatorNote" required maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><button className="btn btn-outline">{label}</button></form>;
}

function value(source: Listing | Record<string, string | null>, key: string) {
  const result = (source as Record<string, unknown>)[key];
  return typeof result === "string" ? result : "";
}

function statusLabel(status: string) {
  if (status === "unclassified") return "Needs classification";
  return status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
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
  { value: "payment_presentation_correction", label: "Premium presentation correction only" }, { value: "other", label: "Other" },
] as const;
