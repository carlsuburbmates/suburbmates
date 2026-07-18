import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";
import { reviewContactAction } from "../actions";

type ContactRequest = {
  contact_request_id: string;
  topic: string;
  requester_name: string;
  requester_email: string;
  business_name: string | null;
  message: string;
  contact_status: "new" | "in_progress" | "resolved" | "spam";
  operator_note: string | null;
  decided_at: string | null;
  created_at: string;
};

const transitions: Record<ContactRequest["contact_status"], Array<{ status: string; label: string }>> = {
  new: [{ status: "in_progress", label: "Start work" }, { status: "resolved", label: "Resolve" }, { status: "spam", label: "Mark as spam" }],
  in_progress: [{ status: "new", label: "Return to new" }, { status: "resolved", label: "Resolve" }, { status: "spam", label: "Mark as spam" }],
  resolved: [{ status: "in_progress", label: "Reopen" }],
  spam: [{ status: "new", label: "Restore as genuine" }],
};

export default async function OpsContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { requestId } = await params;
  const message = await searchParams;
  const { supabase } = await verifyOpsAdmin(`/ops/contact/${requestId}`);
  const { data, error } = await supabase.rpc("ops_list_contact_requests", {
    p_status: null,
    p_contact_request_id: requestId,
    p_limit: 1,
    p_offset: 0,
  });
  if (error) throw new Error("The contact request could not be loaded.");
  const request = data?.[0] as ContactRequest | undefined;
  if (!request) notFound();
  const successfulAction = message.success === "1";

  return (
    <div className="space-y-7">
      <Link href={`/ops/contact?status=${request.contact_status}`} className="text-sm font-bold underline underline-offset-4">← Back to contact queue</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">{formatStatus(request.topic)}</p><h2 className="mt-2 text-4xl font-black tracking-tight">{request.requester_name}</h2><p className="mt-2 text-slate-600">Received {formatOpsDateTime(request.created_at)}</p></div>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">{formatStatus(request.contact_status)}</span>
      </div>

      {message.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">{message.error === "invalid" ? "Choose a valid action and enter a reason." : "The status could not be changed. Refresh and check its current state."}</p>}
      {successfulAction && <p className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800">Status and audit history updated.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Contact details"><InfoRow label="Reply email" value={request.requester_email} /><InfoRow label="Business" value={request.business_name ?? "Not provided"} /></InfoCard>
        <InfoCard title="Request state"><InfoRow label="Topic" value={formatStatus(request.topic)} /><InfoRow label="Status" value={formatStatus(request.contact_status)} /><InfoRow label="Last decision" value={request.decided_at ? formatOpsDateTime(request.decided_at) : "Not reviewed"} /></InfoCard>
      </div>

      <InfoCard title="Message"><p className="whitespace-pre-wrap break-words text-sm leading-7">{request.message}</p></InfoCard>
      {request.operator_note && <InfoCard title="Latest operator note"><p className="whitespace-pre-wrap">{request.operator_note}</p></InfoCard>}

      <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Update request</h3>
        <p className="mt-2 text-sm text-slate-600">Record what was done. The status change and reason are written permanently. This never changes a listing or ownership.</p>
        <form action={reviewContactAction} className="mt-5 space-y-4">
          <input type="hidden" name="requestId" value={request.contact_request_id} />
          <label className="block text-sm font-bold" htmlFor="reason">Action taken or review note</label>
          <textarea id="reason" name="reason" required maxLength={2000} rows={4} className="w-full rounded-xl border border-slate-300 p-3" />
          <div className="flex flex-wrap gap-3">{transitions[request.contact_status].map((transition) => <button key={transition.status} name="status" value={transition.status} className={transition.status === "resolved" ? "btn btn-primary" : "btn btn-outline"}>{transition.label}</button>)}</div>
          <p className="text-sm text-slate-600">Start work keeps the request active. Resolve records that you finished it. Mark as spam hides a non-genuine request from normal work; it can be restored later.</p>
        </form>
      </section>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="mb-4 text-lg font-bold">{title}</h3>{children}</section>;
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[8rem_1fr] gap-3 border-t border-slate-100 py-3 first:border-t-0"><span className="text-sm font-semibold text-slate-500">{label}</span><span className="break-words text-sm font-medium">{value}</span></div>;
}
function formatStatus(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
