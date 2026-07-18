import { verifyOpsAdmin } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";

type Health = {
  integration_name: string;
  status: string;
  last_success_at: string | null;
  next_expected_sync_at: string | null;
  updated_at: string;
};
type Job = { job_id: string; job_type: string; status: string; attempt_count: number; max_attempts: number; created_at: string };
type Audit = { event_id: string; actor_type: string; action: string; entity_type: string; reason: string | null; created_at: string };

export default async function OpsSystemPage() {
  const { supabase } = await verifyOpsAdmin("/ops/system");
  const [healthResult, jobsResult, auditResult] = await Promise.all([
    supabase.rpc("ops_list_integration_health"),
    supabase.rpc("ops_list_automation_jobs", { p_limit: 200 }),
    supabase.rpc("ops_list_audit_events", { p_limit: 200 }),
  ]);
  if (healthResult.error || jobsResult.error || auditResult.error) throw new Error("System health could not be loaded.");
  const health = (healthResult.data ?? []) as Health[];
  const jobs = (jobsResult.data ?? []) as Job[];
  const events = (auditResult.data ?? []) as Audit[];

  return (
    <div className="space-y-9">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">System</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Health and decision record</h2>
        <p className="mt-3 max-w-3xl text-slate-600">Use this page to notice a problem and confirm that your decisions were recorded. A warning never changes a listing, claim, or contact request by itself.</p>
      </div>

      <section>
        <h3 className="text-xl font-bold">Service checks</h3>
        {health.length === 0 ? <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No automated checks have reported yet. This is not an action request.</p> : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {health.map((item) => <article key={item.integration_name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3"><h4 className="font-bold">{label(item.integration_name)}</h4><Status value={item.status} /></div>
              <p className="mt-3 text-sm text-slate-700">{healthMessage(item.status)}</p>
              <p className="mt-3 text-xs text-slate-500">Last checked {date(item.updated_at)}</p>
              {item.last_success_at && <p className="mt-1 text-xs text-slate-500">Last successful check {date(item.last_success_at)}</p>}
              {item.next_expected_sync_at && <p className="mt-1 text-xs text-slate-500">Next check expected {date(item.next_expected_sync_at)}</p>}
            </article>)}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5"><h3 className="text-xl font-bold">Automated work</h3><p className="mt-1 text-sm text-slate-600">These checks prepare information only. They do not publish listings or change ownership.</p></div>
        {jobs.length === 0 ? <p className="p-8 text-slate-600">No automated work has run yet. Nothing needs your attention.</p> : <div className="divide-y divide-slate-200">{jobs.map((job) => <div key={job.job_id} className="flex flex-wrap items-center justify-between gap-4 p-5 text-sm"><div><p className="font-bold">{label(job.job_type)}</p><p className="mt-1 text-slate-600">{jobMessage(job.status, job.attempt_count, job.max_attempts)}</p><p className="mt-1 text-xs text-slate-500">Started {date(job.created_at)}</p></div><Status value={job.status} /></div>)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5"><h3 className="text-xl font-bold">Decision record</h3><p className="mt-1 text-sm text-slate-600">This is the permanent record of recent operator and system actions.</p></div>
        {events.length === 0 ? <p className="p-8 text-slate-600">No decisions have been recorded yet.</p> : <div className="divide-y divide-slate-200">{events.map((event) => <article key={event.event_id} className="grid gap-2 p-5 text-sm md:grid-cols-[1fr_12rem]"><div><p className="font-bold">{label(event.action)}</p><p className="mt-1 text-slate-600">{event.reason ?? `Recorded against ${label(event.entity_type)}.`}</p><p className="mt-1 text-xs text-slate-500">Recorded permanently by {label(event.actor_type)}.</p></div><time className="text-xs text-slate-500 md:text-right">{date(event.created_at)}</time></article>)}</div>}
      </section>
    </div>
  );
}

function Status({ value }: { value: string }) {
  const colour = value === "healthy" || value === "succeeded" ? "bg-green-100 text-green-800" : value === "failed" ? "bg-red-100 text-red-800" : value === "degraded" || value === "stale" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colour}`}>{label(value)}</span>;
}
function healthMessage(status: string) {
  if (status === "healthy") return "This check is working normally. No action is needed.";
  if (status === "degraded" || status === "stale") return "This information may be out of date. Record the issue and ask for technical help if it persists.";
  if (status === "failed") return "The latest check did not finish. No listing or request has changed automatically. Record the issue and ask for technical help.";
  return "No current automatic check is available. This does not mean there is a problem.";
}
function jobMessage(status: string, attempt: number, maxAttempts: number) {
  if (status === "succeeded") return "Completed successfully. No action is needed.";
  if (status === "failed") return `Did not complete after ${attempt} of ${maxAttempts} attempts. Record the issue and ask for technical help.`;
  if (status === "running" || status === "queued") return `Still being handled automatically (attempt ${attempt} of ${maxAttempts}). No listing has changed automatically.`;
  return "This task has an updated status. No listing has changed automatically.";
}
function date(value: string) { return formatOpsDateTime(value); }
function label(value: string) { return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
