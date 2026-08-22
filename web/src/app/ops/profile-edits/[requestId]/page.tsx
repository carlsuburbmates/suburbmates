import Link from "next/link";
import { notFound } from "next/navigation";
import { createOpsDataClient } from "@/lib/ops/auth";
import { DecisionReasonField } from "@/components/ops/DecisionReasonField";
import { reviewProfileChangeAction } from "../actions";

const fieldLabels: Record<string, string> = {
  business_name: "Business name",
  street_address: "Street address",
  contact_email: "Contact email",
  phone: "Phone",
  website: "Website",
  description: "Description",
};

type ProfileChange = {
  change_request_id: string;
  business_name: string;
  suburb_slug: string;
  category_slug: string;
  change_status: string;
  is_published: boolean;
  ownership_status: string;
  base_values: Record<string, string | null>;
  proposed_changes: Record<string, string | null>;
  current_values: Record<string, string | null>;
  submitter_note: string | null;
  operator_note: string | null;
  created_at: string;
};

export default async function OpsProfileEditDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { requestId } = await params;
  const message = await searchParams;
  const supabase = await createOpsDataClient();
  const { data, error } = await supabase.rpc("ops_list_profile_changes", {
    p_status: null,
    p_change_request_id: requestId,
    p_limit: 1,
    p_offset: 0,
  });
  if (error) throw new Error("The profile edit request could not be loaded.");
  const request = data?.[0] as ProfileChange | undefined;
  if (!request) notFound();

  const changedFields = Object.keys(request.proposed_changes).filter(
    (key) => request.proposed_changes[key] !== request.base_values[key],
  );
  const isStale = Object.keys(fieldLabels).some(
    (field) => request.current_values[field] !== request.base_values[field],
  );
  const successfulAction = ["approve", "reject"].includes(message.success ?? "");

  return (
    <div className="space-y-7">
      <Link href={`/ops/profile-edits?status=${request.change_status}`} className="text-sm font-bold underline underline-offset-4">← Back to profile edits</Link>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Review profile changes</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">{request.business_name}</h2>
        <p className="mt-2 text-slate-600">{request.category_slug} in {request.suburb_slug} · {request.is_published ? "Published" : "Unpublished"}</p>
      </div>

      {isStale && <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 font-semibold text-amber-900">The public listing changed after this request was submitted. Approval is blocked; reject it so the owner can submit a fresh request.</p>}
      {!isStale && <p className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-900">● Live state: no conflicts</p>}
      {message.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-800">{message.error === "invalid" ? "Enter a decision reason." : "The decision failed. Check whether the request is stale or already decided."}</p>}
      {successfulAction && <p className="rounded-xl border border-green-300 bg-green-50 p-4 font-semibold text-green-800">Decision recorded with an immutable audit event.</p>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[10rem_1fr_1fr] gap-4 bg-slate-100 px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-600">
          <span>Field</span><span>Current approved</span><span>Owner proposed</span>
        </div>
        {changedFields.map((field) => (
          <div key={field} className="grid grid-cols-[10rem_1fr_1fr] gap-4 border-t border-slate-200 px-5 py-4 text-sm">
            <span className="font-bold">{fieldLabels[field] ?? field}</span>
            <span className="whitespace-pre-wrap text-slate-600">{request.current_values[field] || "—"}</span>
            <span className="whitespace-pre-wrap font-semibold">{request.proposed_changes[field] || "—"}</span>
          </div>
        ))}
      </section>

      {request.submitter_note && <section className="rounded-2xl border bg-white p-6"><h3 className="font-bold">Owner note</h3><p className="mt-2 text-sm">{request.submitter_note}</p></section>}
      {request.operator_note && <section className="rounded-2xl border bg-white p-6"><h3 className="font-bold">Operator note</h3><p className="mt-2 text-sm">{request.operator_note}</p></section>}

      {request.change_status === "pending" && (
        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-600">Approval updates only these public fields. Rejection makes no public change. Publication, ownership, tier, ABN and payment state remain unchanged. Your reason is recorded permanently.</p>
          <form action={reviewProfileChangeAction} className="mt-5 space-y-4">
            <input type="hidden" name="requestId" value={request.change_request_id} />
            <DecisionReasonField
              id="profile-reason"
              label="Decision basis or reason"
              presets={[
                { label: "Standard contact update", value: "The proposed contact details and trading information are consistent with the approved listing evidence." },
                { label: "Business description refinement", value: "The proposed description is a supported refinement of the existing public business information." },
                { label: "Reject: inconsistent or unverified rebranding", value: "The proposed rebranding is inconsistent with the available public evidence and cannot be approved yet." },
              ]}
            />
            <div className="flex flex-wrap gap-3">
              <button name="decision" value="reject" className="btn border-red-300 bg-red-50 text-red-800 hover:bg-red-100">Reject changes</button>
              <button name="decision" value="approve" disabled={isStale} className="btn btn-primary">Approve public changes</button>
            </div>
          </form>
        </section>
      )}
      <Link href={`/ops/profile-edits?status=${request.change_status}`} className="inline-block text-sm font-bold underline underline-offset-4">← Back to profile edits</Link>
    </div>
  );
}
