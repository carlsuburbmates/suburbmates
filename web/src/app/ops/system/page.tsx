import { verifyOpsAdmin } from "@/lib/ops/auth";

type Health = {
  integration_name: string;
  status: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  next_expected_sync_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
};
type Job = { job_id: string; job_type: string; status: string; attempt_count: number; max_attempts: number; error_message: string | null; created_at: string };
type Audit = { event_id: string; actor_type: string; action: string; entity_type: string; entity_id: string | null; reason: string | null; correlation_id: string; created_at: string };

export default async function OpsSystemPage() {
  const { supabase } = await verifyOpsAdmin("/ops/system");
  const [healthResult, jobsResult, auditResult] = await Promise.all([
    supabase.rpc("ops_list_integration_health"),
    supabase.rpc("ops_list_automation_jobs", { p_limit: 50 }),
    supabase.rpc("ops_list_audit_events", { p_limit: 50 }),
  ]);
  if (healthResult.error || jobsResult.error || auditResult.error) throw new Error("System health could not be loaded.");
  const health = (healthResult.data ?? []) as Health[];
  const jobs = (jobsResult.data ?? []) as Job[];
  const events = (auditResult.data ?? []) as Audit[];

  return (
    <div className="space-y-9">
      <div><p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">System</p><h2 className="mt-2 text-4xl font-black tracking-tight">Health and audit</h2><p className="mt-3 max-w-3xl text-slate-600">Exception-led status only. Unknown means no automated provider check is connected yet; it does not mean healthy.</p></div>

      <section>
        <h3 className="text-xl font-bold">Integrations and internal monitors</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {health.map((item) => <article key={item.integration_name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h4 className="font-bold">{label(item.integration_name)}</h4><Status value={item.status} /></div><p className="mt-3 text-xs text-slate-500">Updated {new Date(item.updated_at).toLocaleString("en-AU")}</p>{item.last_error && <p className="mt-3 text-sm font-semibold text-red-700">{item.last_error}</p>}<dl className="mt-4 space-y-2 text-xs text-slate-600">{Object.entries(item.metadata ?? {}).map(([key, value]) => <div key={key} className="flex justify-between gap-4"><dt>{label(key)}</dt><dd className="text-right font-semibold">{String(value)}</dd></div>)}</dl></article>)}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5"><h3 className="text-xl font-bold">Automation jobs</h3></div>
        {jobs.length === 0 ? <p className="p-8 text-slate-600">No queued or completed automation jobs yet.</p> : <div className="divide-y divide-slate-200">{jobs.map((job) => <div key={job.job_id} className="flex flex-wrap items-center justify-between gap-4 p-5 text-sm"><div><p className="font-bold">{label(job.job_type)}</p><p className="mt-1 text-xs text-slate-500">Attempt {job.attempt_count} of {job.max_attempts} · {new Date(job.created_at).toLocaleString("en-AU")}</p></div><Status value={job.status} />{job.error_message && <p className="w-full text-red-700">{job.error_message}</p>}</div>)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5"><h3 className="text-xl font-bold">Recent audit events</h3></div>
        <div className="divide-y divide-slate-200">{events.map((event) => <div key={event.event_id} className="grid gap-2 p-5 text-sm md:grid-cols-[1fr_12rem]"><div><p className="font-bold">{label(event.action)}</p><p className="mt-1 text-slate-600">{event.reason ?? `${label(event.entity_type)} ${event.entity_id ?? ""}`}</p><p className="mt-1 text-xs text-slate-500">Actor: {label(event.actor_type)} · Correlation: {event.correlation_id}</p></div><time className="text-xs text-slate-500 md:text-right">{new Date(event.created_at).toLocaleString("en-AU")}</time></div>)}</div>
      </section>
    </div>
  );
}

function Status({ value }: { value: string }) {
  const colour = value === "healthy" || value === "succeeded" ? "bg-green-100 text-green-800" : value === "failed" ? "bg-red-100 text-red-800" : value === "degraded" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colour}`}>{label(value)}</span>;
}
function label(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
