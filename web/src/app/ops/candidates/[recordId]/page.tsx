import Link from "next/link";
import { notFound } from "next/navigation";
import { createOpsDataClient } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";
import { resolveCandidateExceptionAction } from "../actions";

type CandidateException = {
  record_id: string;
  source: string;
  source_record_key: string;
  candidate_data: Record<string, unknown>;
  qualification_reasons: string[];
  duplicate_vendor_id: string | null;
  exception_status: string;
  resolution_note: string | null;
  created_at: string;
};

export default async function CandidateDetailPage({ params, searchParams }: { params: Promise<{ recordId: string }>; searchParams: Promise<{ error?: string; success?: string }> }) {
  const { recordId } = await params;
  const message = await searchParams;
  const supabase = await createOpsDataClient();
  const { data, error } = await supabase.rpc("ops_list_candidate_handoff_records", { p_status: "all", p_limit: 1, p_offset: 0, p_record_id: recordId });
  if (error) throw new Error("The candidate evidence could not be loaded.");
  const record = data?.[0] as CandidateException | undefined;
  if (!record) notFound();
  const candidate = record.candidate_data;

  return <div className="space-y-7">
    <Link href="/ops" className="text-sm font-bold underline underline-offset-4">← Back to Work</Link>
    <header><p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Possible duplicate discovery</p><h2 className="mt-2 text-4xl font-black tracking-tight">{text(candidate.business_name) || "Possible business from an approved source"}</h2><p className="mt-3 max-w-3xl text-slate-600">This private discovery is not a Business and has not been published. Review the evidence, then record one safe outcome.</p></header>
    {message.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">The decision could not be recorded. Refresh and try again.</p>}
    {message.success && <p className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800">Decision recorded. This did not publish, claim or edit a business listing.</p>}
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-bold">Evidence</h3><p className="mt-1 text-sm text-slate-600">{text(candidate.category_slug) || "No category"} · {text(candidate.suburb_slug) || "No location"} · source: {label(record.source)}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">{label(record.exception_status)}</span></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Field label="Address" value={text(candidate.street_address)} /><Field label="Email" value={text(candidate.contact_email)} /><Field label="Phone" value={text(candidate.phone)} /><Field label="Website" value={text(candidate.website)} /></div><div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="font-bold">Why this needs your decision</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{record.qualification_reasons.map((reason) => <li key={reason}>{reasonLabel(reason)}</li>)}</ul></div>{record.duplicate_vendor_id && <p className="mt-4 text-sm"><Link className="font-bold underline" href={`/ops/listings/${record.duplicate_vendor_id}`}>Review the possible matching business</Link></p>}<p className="mt-4 text-xs text-slate-500">Received {formatOpsDateTime(record.created_at)} · reference {record.source_record_key}</p></section>
    {record.resolution_note ? <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6"><p className="font-bold">Recorded decision</p><p className="mt-2 text-sm text-slate-700">{record.resolution_note}</p></section> : <form action={resolveCandidateExceptionAction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><input type="hidden" name="recordId" value={record.record_id} /><label className="block text-sm font-bold">Decision note<textarea name="note" required maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><div className="mt-5 flex flex-wrap gap-3"><button name="action" value="acknowledge" className="btn btn-outline">Acknowledge for follow-up</button><button name="action" value="dismiss" className="btn btn-outline">Dismiss as unsuitable</button></div></form>}
  </div>;
}

function Field({ label, value }: { label: string; value: string }) { return value ? <p><span className="font-semibold text-slate-500">{label}:</span> {value}</p> : null; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function label(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function reasonLabel(reason: string) { return ({ possible_duplicate: "It may match an existing business and needs a human check." } as Record<string, string>)[reason] ?? label(reason); }
