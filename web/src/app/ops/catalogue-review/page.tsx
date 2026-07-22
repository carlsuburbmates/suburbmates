import Link from "next/link";
import { createOpsDataClient } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";

const statuses = ["open", "acknowledged", "all"] as const;
type Status = (typeof statuses)[number];

type CatalogueException = {
  run_id: string;
  run_completed_at: string;
  record_id: string;
  vendor_id: string;
  business_name: string;
  category_slug: string;
  suburb_slug: string;
  qualification_reasons: string[];
  duplicate_vendor_id: string | null;
  exception_status: string;
  created_at: string;
};

export default async function CatalogueReviewPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const status = statuses.includes(params.status as Status) ? (params.status as Status) : "open";
  const supabase = await createOpsDataClient();
  const { data, error } = await supabase.rpc("ops_list_existing_catalogue_requalification_exceptions", {
    p_status: status,
    p_limit: 100,
    p_offset: 0,
  });
  if (error) throw new Error("The catalogue requalification exceptions could not be loaded.");
  const records = (data ?? []) as CatalogueException[];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Existing catalogue</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Records needing evidence or a decision</h2>
        <p className="mt-3 max-w-3xl text-slate-600">This is a private evidence review of listings that existed before the current qualification handoff. Seeing a record here does not change its public visibility.</p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Catalogue requalification status filters">
        {statuses.map((item) => <Link key={item} href={`/ops/catalogue-review?status=${item}`} aria-current={item === status ? "page" : undefined} className={`rounded-full border px-4 py-2 text-sm font-bold ${item === status ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}>{label(item)}</Link>)}
      </nav>

      {records.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 shadow-sm">No completed requalification exceptions match this view yet. Running the private evidence pass does not publish, unpublish, claim or edit any business.</section>
      ) : (
        <div className="space-y-5">{records.map((record) => <ExceptionCard key={record.record_id} record={record} />)}</div>
      )}
    </div>
  );
}

function ExceptionCard({ record }: { record: CatalogueException }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h3 className="text-xl font-bold">{record.business_name}</h3><p className="mt-1 text-sm text-slate-600">{record.category_slug} · {record.suburb_slug}</p></div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">Evidence review</span>
      </div>
      <div className="mt-5 rounded-xl bg-amber-50 p-4"><p className="font-bold">Why it needs attention</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{record.qualification_reasons.map((reason) => <li key={reason}>{reasonLabel(reason)}</li>)}</ul></div>
      {record.duplicate_vendor_id && <p className="mt-4 text-sm"><Link className="font-bold underline" href={`/ops/listings/${record.duplicate_vendor_id}`}>Review the possible matching listing</Link></p>}
      <p className="mt-4 text-xs text-slate-500">Evidence pass completed {formatOpsDateTime(record.run_completed_at)}. This page does not make a listing decision.</p>
    </section>
  );
}

function label(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function reasonLabel(reason: string) {
  return ({
    missing_reachable_contact: "There is no usable way for customers to contact the business.",
    unproven_existing_provenance: "The original source evidence is incomplete.",
    unsafe_or_invalid_website: "The stored website address is unsafe or invalid.",
    strong_duplicate: "It matches another listing strongly.",
    possible_duplicate: "It may match another listing and needs a human check.",
    outside_geographic_scope: "It is outside the directory area.",
    unsupported_category: "Its category is not supported.",
    invalid_business_name: "The business name is not usable.",
  } as Record<string, string>)[reason] ?? label(reason);
}
