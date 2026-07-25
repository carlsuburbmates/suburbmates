import Link from "next/link";
import { formatOpsDate } from "@/lib/ops/date";
import { createOpsDataClient } from "@/lib/ops/auth";
import { composeWorkItems, workPriorityOrder, type WorkItem, type WorkPriority, type WorkSource } from "@/lib/ops/work";

const pageSize = 200;

export default async function OpsWorkPage() {
  const supabase = await createOpsDataClient();
  const [listings, pendingClaims, waitingClaims, profiles, newContacts, activeContacts, candidates, catalogue, health, jobs] = await Promise.all([
    loadAll((offset) => supabase.rpc("ops_list_listings", { p_status: "review", p_query: null, p_vendor_id: null, p_ownership_status: null, p_listing_source: null, p_limit: pageSize, p_offset: offset })),
    loadAll((offset) => supabase.rpc("ops_list_claim_requests", { p_status: "pending", p_claim_request_id: null, p_limit: pageSize, p_offset: offset })),
    loadAll((offset) => supabase.rpc("ops_list_claim_requests", { p_status: "needs_information", p_claim_request_id: null, p_limit: pageSize, p_offset: offset })),
    loadAll((offset) => supabase.rpc("ops_list_profile_changes", { p_status: "pending", p_change_request_id: null, p_limit: pageSize, p_offset: offset })),
    loadAll((offset) => supabase.rpc("ops_list_contact_requests", { p_status: "new", p_contact_request_id: null, p_limit: pageSize, p_offset: offset })),
    loadAll((offset) => supabase.rpc("ops_list_contact_requests", { p_status: "in_progress", p_contact_request_id: null, p_limit: pageSize, p_offset: offset })),
    loadAll((offset) => supabase.rpc("ops_list_candidate_handoff_records", { p_status: "open", p_limit: pageSize, p_offset: offset, p_record_id: null })),
    loadAll((offset) => supabase.rpc("ops_list_existing_catalogue_requalification_exceptions", { p_status: "open", p_limit: pageSize, p_offset: offset })),
    onePage(() => supabase.rpc("ops_list_integration_health")),
    onePage(() => supabase.rpc("ops_list_automation_jobs", { p_limit: pageSize })),
  ]);

  const items = composeWorkItems({
    listings: listings as WorkSource["listings"],
    claims: [...pendingClaims, ...waitingClaims] as WorkSource["claims"],
    profiles: profiles as WorkSource["profiles"],
    contacts: [...newContacts, ...activeContacts] as WorkSource["contacts"],
    candidates: candidates as WorkSource["candidates"],
    catalogue: catalogue as WorkSource["catalogue"],
    health: health as WorkSource["health"],
    jobs: jobs as WorkSource["jobs"],
  });
  const grouped = new Map(workPriorityOrder.map((priority) => [priority, items.filter((item) => item.priority === priority)]));

  return <div className="space-y-8">
    <header className="max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Work</p><h2 className="mt-2 text-4xl font-black tracking-tight">What needs your judgment?</h2><p className="mt-3 text-slate-600">Only real decisions appear here. Background automation is kept out of your way.</p></header>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-sm font-semibold text-slate-600">All open work</p><p className="mt-1 text-4xl font-black tabular-nums">{items.length}</p></div><Link href="#all-work" className="rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Open work list</Link></div></section>
    {items.length === 0 ? <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-7"><h3 className="text-xl font-bold text-emerald-950">Nothing needs your decision right now</h3><p className="mt-2 text-sm text-emerald-900">The monitored queues are clear. Background evidence remains available in System if it is ever needed.</p></section> : <section id="all-work" className="space-y-8" aria-label="All open work">{workPriorityOrder.map((priority) => <WorkGroup key={priority} priority={priority} items={grouped.get(priority) ?? []} />)}</section>}
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600"><p className="font-semibold text-slate-800">Quiet background context</p><p className="mt-1">Automatic exclusions, repeat discoveries and historic evidence gaps are retained for audit and future batch improvement. They are not work for you to process one by one.</p><Link href="/ops/system" className="mt-3 inline-block font-bold underline underline-offset-4">Open System</Link></section>
  </div>;
}

function WorkGroup({ priority, items }: { priority: WorkPriority; items: WorkItem[] }) {
  const copy: Record<WorkPriority, [string, string]> = { act_now: ["Act now", "A real technical, safety, privacy or security issue needs attention."], needs_decision: ["Needs a decision", "Open an item to see its evidence and the safe choices already available."], later_review: ["Later review", "Older possible duplicates are worth reviewing, but they are not urgent."] };
  const [title, detail] = copy[priority];
  if (!items.length) return null;
  return <section><div className="mb-3 flex items-baseline justify-between gap-4"><div><h3 className="text-2xl font-black tracking-tight">{title}</h3><p className="mt-1 text-sm text-slate-600">{detail}</p></div><span className="rounded-full bg-slate-200 px-3 py-1 text-sm font-bold tabular-nums">{items.length}</span></div><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">{items.map((item) => <WorkRow key={item.id} item={item} />)}</div></section>;
}

function WorkRow({ item }: { item: WorkItem }) {
  return <Link href={item.href} className="group flex min-h-28 items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 last:border-b-0 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-[-4px] focus-visible:outline-indigo-600 hover:bg-slate-50"><div className="min-w-0"><p className="font-bold text-slate-950">{item.title}</p><p className="mt-1 text-sm font-semibold text-slate-700">{item.decision}</p><p className="mt-1 text-sm text-slate-600">{item.evidence}</p>{item.createdAt && <p className="mt-2 text-xs text-slate-500">Recorded {formatOpsDate(item.createdAt)}</p>}</div><span aria-hidden="true" className="text-xl font-bold text-slate-400 transition-transform motion-reduce:transition-none group-hover:translate-x-0.5">›</span></Link>;
}

async function onePage<T>(request: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const result = await request();
  if (result.error) throw new Error("The Work list could not be loaded.");
  return result.data ?? [];
}

async function loadAll<T>(request: (offset: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const results: T[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await onePage(() => request(offset));
    results.push(...page);
    if (page.length < pageSize) return results;
  }
}
