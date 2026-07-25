import Link from "next/link";
import { createOpsDataClient } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";
import { resolveCandidateExceptionAction } from "./actions";

const statuses = ["open", "acknowledged", "dismissed", "all"] as const;
type Status = (typeof statuses)[number];

type CandidateException = {
  record_id: string;
  run_id: string;
  source: string;
  source_record_key: string;
  candidate_data: Record<string, unknown>;
  qualification_reasons: string[];
  duplicate_vendor_id: string | null;
  exception_status: string;
  resolution_note: string | null;
  resolved_at: string | null;
  created_at: string;
};

export default async function OpsCandidatesPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string; success?: string }> }) {
  const params = await searchParams;
  const status = statuses.includes(params.status as Status) ? (params.status as Status) : "open";
  const supabase = await createOpsDataClient();
  const { data, error } = await supabase.rpc("ops_list_candidate_handoff_records", { p_status: status, p_limit: 100, p_offset: 0, p_record_id: null });
  if (error) throw new Error("The candidate exceptions could not be loaded.");
  const records = (data ?? []) as CandidateException[];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Candidate handoff</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Items needing a human decision</h2>
        <p className="mt-3 max-w-3xl text-slate-600">These are approved-source discoveries that did not meet the automatic qualification rule. They are private. Nothing here is public simply because it was discovered.</p>
      </div>

      {params.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">The exception could not be updated. Refresh and try again.</p>}
      {params.success && <p className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800">Decision recorded. This did not publish, claim or edit a business listing.</p>}

      <nav className="flex flex-wrap gap-2" aria-label="Candidate exception status filters">
        {statuses.map((item) => <Link key={item} href={`/ops/candidates?status=${item}`} aria-current={item === status ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm font-bold ${item === status ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}>{label(item)}</Link>)}
      </nav>

      {records.length === 0 ? <section className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">No candidate exceptions match this view.</section> : <div className="space-y-5">{records.map((record) => <CandidateCard key={record.record_id} record={record} />)}</div>}
    </div>
  );
}

function CandidateCard({ record }: { record: CandidateException }) {
  const candidate = record.candidate_data;
  const website = text(candidate.website);
  const phone = text(candidate.phone);
  const email = text(candidate.contact_email);
  const address = text(candidate.street_address);
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="text-xl font-bold">{text(candidate.business_name) || "Unnamed candidate"}</h3><p className="mt-1 text-sm text-slate-600">{text(candidate.category_slug) || "No category"} · {text(candidate.suburb_slug) || "No location"} · source: {label(record.source)}</p></div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">{label(record.exception_status)}</span></div>
    <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">{address && <Field label="Address" value={address} />}{email && <Field label="Email" value={email} />}{phone && <Field label="Phone" value={phone} />}{website && <Field label="Website" value={website} />}</div>
    <div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="font-bold">Why it needs attention</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{record.qualification_reasons.map((reason) => <li key={reason}>{reasonLabel(reason)}</li>)}</ul></div>
    {record.duplicate_vendor_id && <p className="mt-4 text-sm"><Link className="font-bold underline" href={`/ops/listings/${record.duplicate_vendor_id}`}>Review the possible matching listing</Link></p>}
    <p className="mt-4 text-xs text-slate-500">Received {formatOpsDateTime(record.created_at)} · reference {record.source_record_key}</p>
    {record.resolution_note ? <p className="mt-4 rounded-xl bg-slate-100 p-4 text-sm"><span className="font-bold">Latest decision:</span> {record.resolution_note}</p> : <form action={resolveCandidateExceptionAction} className="mt-5 space-y-3 border-t border-slate-200 pt-5"><input type="hidden" name="recordId" value={record.record_id} /><label className="block text-sm font-bold">Decision note<textarea name="note" required maxLength={2000} rows={3} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label><div className="flex flex-wrap gap-3"><button name="action" value="acknowledge" className="btn btn-outline">Acknowledge for follow-up</button><button name="action" value="dismiss" className="btn btn-outline">Dismiss as unsuitable</button></div></form>}
  </section>;
}

function Field({ label, value }: { label: string; value: string }) { return <p><span className="font-semibold text-slate-500">{label}:</span> {value}</p>; }
function text(value: unknown) { return typeof value === "string" ? value : ""; }
function label(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function reasonLabel(reason: string) { return ({ unapproved_source: "The source is not approved.", invalid_business_name: "The business name is not usable.", outside_geographic_scope: "It is outside the directory area.", unsupported_category: "The business category is not supported.", missing_reachable_contact: "There is no usable way for customers to contact the business.", unsafe_or_invalid_website: "The website address is unsafe or invalid.", unsafe_or_broken_destination: "Existing evidence says the website is unsafe or materially broken.", strong_duplicate: "It matches an existing business strongly.", possible_duplicate: "It may match an existing business and needs a human check." } as Record<string, string>)[reason] ?? label(reason); }
