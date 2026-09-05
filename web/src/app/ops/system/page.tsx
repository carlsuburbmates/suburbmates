import { createOpsDataClient } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";
import Link from "next/link";
import { getDirectoryObservabilitySummary, type DirectoryObservabilitySummary } from "@/lib/directory-observability-summary";
import { getPublicProfileCoverage, type PublicProfileCoverage } from "@/lib/public-profile-coverage";

type Health = {
  integration_name: string;
  status: string;
  last_success_at: string | null;
  last_failure_at: string | null;
  next_expected_sync_at: string | null;
  last_error: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
};
type Job = { job_id: string; job_type: string; status: string; attempt_count: number; max_attempts: number; created_at: string };
type Audit = { event_id: string; actor_type: string; action: string; entity_type: string; reason: string | null; before_state: Record<string, unknown> | null; after_state: Record<string, unknown> | null; evidence_reference: string; created_at: string };
type AttentionItem = { title: string; explanation: string; reference: string };
type WebsitePilot = { source_enabled: boolean; source_automated: boolean; source_contract_version: string; inspection_count: number; eligible_count: number; blocked_count: number; unsupported_count: number; terms_pending_count: number; last_checked_at: string | null };
type ClaimedProfilePilot = { claimed_profiles: number; profiles_with_direct_action: number; profiles_with_three_services: number; profiles_with_owner_summary: number; profiles_with_real_media: number; quality_gate_ready: number };

export default async function OpsSystemPage() {
  const supabase = await createOpsDataClient();
  const [healthResult, jobsResult, auditResult, directoryObservability, profileCoverage, websitePilotResult, websiteDomainReviewsResult, claimedProfilePilotResult, categoryContextResult] = await Promise.all([
    supabase.rpc("ops_list_integration_health"),
    supabase.rpc("ops_list_automation_jobs", { p_limit: 200 }),
    supabase.rpc("ops_list_audit_events", { p_limit: 200 }),
    getDirectoryObservabilitySummary(),
    getPublicProfileCoverage(supabase),
    supabase.rpc("ops_get_official_website_pilot_summary"),
    supabase.rpc("ops_list_official_website_domain_reviews", { p_status: null }),
    supabase.rpc("ops_get_claimed_profile_pilot_summary"),
    supabase.from("licensed_category_context_images").select("category_slug", { count: "exact", head: true }).eq("active", true),
  ]);
  if (healthResult.error || jobsResult.error || auditResult.error || websitePilotResult.error || websiteDomainReviewsResult.error || claimedProfilePilotResult.error || categoryContextResult.error) throw new Error("System health could not be loaded.");
  const health = (healthResult.data ?? []) as Health[];
  const jobs = (jobsResult.data ?? []) as Job[];
  const events = (auditResult.data ?? []) as Audit[];
  const attention = attentionItems(health, jobs);
  const dormant = health.filter((item) => item.status === "disabled" || item.status === "unknown");
  const activeSourceRefreshes = health.filter((item) => item.status === "running" && item.integration_name.endsWith("_source"));
  const websitePilot = websitePilotResult.data?.[0] as WebsitePilot | undefined;
  const approvedWebsiteDomains = (websiteDomainReviewsResult.data ?? []).filter((review: { review_status: string }) => review.review_status === "approved").length;
  const claimedProfilePilot = claimedProfilePilotResult.data?.[0] as ClaimedProfilePilot | undefined;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">System</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Is anything needing attention?</h2>
        <p className="mt-3 max-w-3xl text-slate-600">This page does not run or change anything. It simply tells you when an automated check needs help.</p>
      </div>

      <section className={`rounded-2xl border p-6 shadow-sm ${attention.length === 0 ? "border-green-200 bg-green-50" : "border-amber-300 bg-amber-50"}`}>
        <h3 className="text-xl font-bold">{attention.length === 0 ? "All clear" : `${attention.length} item${attention.length === 1 ? "" : "s"} need attention`}</h3>
        {attention.length === 0 ? <><p className="mt-2 text-slate-700">Everything currently monitored is operating normally. You do not need to do anything.</p>{activeSourceRefreshes.length > 0 && <p className="mt-3 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-950">{activeSourceRefreshes.map((item) => label(item.integration_name)).join(", ")} refresh {activeSourceRefreshes.length === 1 ? "is" : "are"} in progress. It does not need an operator decision.</p>}</> : <div className="mt-4 space-y-3">{attention.map((item) => <article id={item.reference} key={item.reference} className="scroll-mt-6 rounded-xl border border-amber-200 bg-white p-4"><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-slate-700">{item.explanation}</p><p className="mt-2 text-sm font-semibold text-slate-800">What to do: ask for technical help and quote reference {item.reference}.</p></article>)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">What is deliberately not active</h3>
        <p className="mt-1 text-sm text-slate-600">These are planned or optional services. They are not faults and do not need action unless you decide to introduce them.</p>
        {dormant.length === 0 ? <p className="mt-4 text-sm text-slate-600">No deliberately inactive services are currently recorded.</p> : <ul className="mt-4 space-y-2 text-sm text-slate-700">{dormant.map((item) => <li key={item.integration_name}><span className="font-semibold">{label(item.integration_name)}:</span> {dormantMessage(item)}</li>)}</ul>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Commercial readiness</h3>
        <p className="mt-2 text-sm text-slate-600">Billing is off. No paid offer is configured, and there is no payment action for you to take here.</p>
        <p className="mt-3 text-sm text-slate-600">Future activation needs an approved benefit, price, entitlement rules, cancellation and refund handling, reconciliation, and verified implementation.</p>
      </section>

      <DirectoryObservability summary={directoryObservability} />
      <PublicProfileCoverageSummary coverage={profileCoverage} />
      <OfficialWebsitePilotSummary pilot={websitePilot} approvedDomains={approvedWebsiteDomains} />
      <ClaimedProfilePilotSummary pilot={claimedProfilePilot} />
      <LicensedCategoryContextSummary activeCount={categoryContextResult.count ?? 0} providerConfigured={Boolean(process.env.PEXELS_API_KEY)} />

      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer p-5 text-lg font-bold">Technical details and recent checks</summary>
        <div className="border-t border-slate-200 p-5">
          <p className="text-sm text-slate-600">Use these details only when investigating an item above with technical help. A warning never publishes a listing or changes ownership by itself.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{health.map((item) => <article key={item.integration_name} className="rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><h4 className="font-bold">{label(item.integration_name)}</h4><Status value={item.status} /></div><p className="mt-2 text-sm text-slate-700">{healthMessage(item)}</p><p className="mt-3 text-xs text-slate-500">Last checked {date(item.updated_at)}</p>{item.last_success_at && <p className="mt-1 text-xs text-slate-500">Last successful check {date(item.last_success_at)}</p>}{item.last_failure_at && <p className="mt-1 text-xs text-slate-500">Last failure {date(item.last_failure_at)}</p>}{item.last_error && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-950">Technical note: {item.last_error}</p>}<HealthDetails item={item} /></article>)}</div>
          <JobDetails jobs={jobs} />
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer p-5 text-lg font-bold">Data safeguards and decision record</summary>
        <div className="border-t border-slate-200 p-5"><RetentionDetails health={health.find((item) => item.integration_name === "contact_retention")} /><DecisionRecord events={events} /></div>
      </details>
    </div>
  );
}

function LicensedCategoryContextSummary({ activeCount, providerConfigured }: { activeCount: number; providerConfigured: boolean }) {
  const held = !providerConfigured || activeCount === 0;
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><h3 className="text-xl font-bold">Licensed category context</h3><p className="mt-1 text-sm text-slate-600">Credited category artwork for otherwise media-free unclaimed profiles. It never depicts, verifies or ranks a business.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${held ? "bg-slate-100 text-slate-700" : "bg-green-100 text-green-800"}`}>{held ? "Held" : "Active"}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Metric label="Active licensed category images" value={String(activeCount)} /><Metric label="Provider connection" value={providerConfigured ? "Configured" : "Awaiting key"} /></div><p className="mt-5 text-xs leading-5 text-slate-500">The daily automated fill runs quietly in bounded batches and leaves active images stable for at least 90 days. A missing credential or empty catalogue creates no Work and changes no profile; owner-approved listing media always takes precedence.</p></section>;
}

function ClaimedProfilePilotSummary({ pilot }: { pilot: ClaimedProfilePilot | undefined }) {
  if (!pilot) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold">Claimed-profile pilot readiness</h3>
          <p className="mt-1 text-sm text-slate-600">A real-owner cohort grows only through genuine claims and approved profile improvements. It never enrols an owner or creates Work.</p>
        </div>
        <p className="text-sm font-bold text-slate-700">Target: 25–50 quality-ready profiles</p>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Metric label="Claimed profiles" value={String(pilot.claimed_profiles)} />
        <Metric label="Direct action" value={String(pilot.profiles_with_direct_action)} />
        <Metric label="3+ services" value={String(pilot.profiles_with_three_services)} />
        <Metric label="Owner summary" value={String(pilot.profiles_with_owner_summary)} />
        <Metric label="Real media" value={String(pilot.profiles_with_real_media)} />
        <Metric label="Quality-gate ready" value={String(pilot.quality_gate_ready)} />
      </div>
      <p className="mt-5 text-xs leading-5 text-slate-500">Ready means direct action, reported hours, at least three services, a summary and approved real business media. It is a quality target, not a payment or publication gate.</p>
    </section>
  );
}

function OfficialWebsitePilotSummary({ pilot, approvedDomains }: { pilot: WebsitePilot | undefined; approvedDomains: number }) {
  if (!pilot) return null;
  const held = !pilot.source_enabled || !pilot.source_automated;
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><h3 className="text-xl font-bold">Official-website enrichment pilot</h3><p className="mt-1 text-sm text-slate-600">A quiet safety/readiness view. It does not start collection, create Work, or expose website pages or facts.</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${held ? "bg-slate-100 text-slate-700" : "bg-sky-100 text-sky-900"}`}>{held ? "Held" : "Controlled pilot active"}</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6"><Metric label="Operator-approved overrides" value={String(approvedDomains)} /><Metric label="Recorded inspections" value={String(pilot.inspection_count)} /><Metric label="Eligible" value={String(pilot.eligible_count)} /><Metric label="Safely blocked" value={String(pilot.blocked_count)} /><Metric label="Unsupported" value={String(pilot.unsupported_count)} /><Metric label="Terms review needed" value={String(pilot.terms_pending_count)} /></div><p className="mt-5 text-xs leading-5 text-slate-500">Contract {pilot.source_contract_version}. {pilot.last_checked_at ? `Last retained inspection ${date(pilot.last_checked_at)}.` : "No retained website inspection yet."} The bounded runner checks robots and clearly linked same-domain terms automatically. Possible restrictions remain held; an operator block always wins.</p><Link href="/ops/system/website-pilot" className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-teal-900 underline decoration-teal-800/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800">Review website-domain exceptions</Link></section>;
}

function DirectoryObservability({ summary }: { summary: DirectoryObservabilitySummary }) {
  const eventCount = (event: keyof DirectoryObservabilitySummary["events"]) => summary.events[event] ?? 0;
  const outbound = ["outbound_website", "outbound_booking", "outbound_menu", "outbound_phone", "outbound_email", "outbound_directions"] as const;
  const forms = ["claim_completed", "missing_business_submission_completed", "contact_request_completed"] as const;
  const labels: Record<(typeof outbound)[number] | (typeof forms)[number], string> = { outbound_website: "Website", outbound_booking: "Booking", outbound_menu: "Menu", outbound_phone: "Phone", outbound_email: "Email", outbound_directions: "Directions", claim_completed: "Claims", missing_business_submission_completed: "Missing businesses", contact_request_completed: "Contact requests" };
  const richViews = eventCount("profile_cohort_rich_view"); const baselineViews = eventCount("profile_cohort_baseline_view"); const richContact = eventCount("profile_cohort_rich_contact"); const baselineContact = eventCount("profile_cohort_baseline_contact");
  const enrichedViews = eventCount("profile_cohort_website_enriched_view"); const unchangedViews = eventCount("profile_cohort_website_unchanged_view"); const enrichedContact = eventCount("profile_cohort_website_enriched_contact"); const unchangedContact = eventCount("profile_cohort_website_unchanged_contact");
  const rate = (contact: number, views: number) => views > 0 ? `${((contact / views) * 100).toFixed(1)}%` : "Awaiting views";
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><h3 className="text-xl font-bold">Directory activity (last 7 days)</h3><p className="mt-1 text-sm text-slate-600">A quiet, aggregate view of whether visitors are finding a useful next step. It creates no work or alerts.</p></div><p className="text-xs text-slate-500">Read {date(summary.readAt)}</p></div><p className="mt-4 text-sm text-slate-600">Reporting range {date(summary.rangeStart)} to {date(summary.rangeEnd)}. Cloudflare Web Analytics is cookie-free and excludes bots here; it provides visits, not a privacy-safe unique-person count.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Visits" value={summary.visits === null ? "Unavailable" : String(summary.visits)} /><Metric label="Directory searches" value={String(eventCount("directory_search"))} /><Metric label="Business-profile views" value={String(eventCount("business_profile_view"))} /><Metric label="Search → profile" value={`${eventCount("directory_search")} → ${eventCount("business_profile_view")}`} /></div><SummaryGroup title="Top entry pages" empty="No privacy-safe entry activity has been recorded yet.">{summary.topEntries.map((entry) => <Metric key={entry.label} label={entry.label} value={String(entry.count)} />)}</SummaryGroup><SummaryGroup title="Outbound contact actions" empty="No outbound contact action has been recorded yet.">{outbound.map((event) => <Metric key={event} label={labels[event]} value={String(eventCount(event))} />)}</SummaryGroup><section className="mt-6"><h4 className="font-bold">Official-website enrichment comparison</h4><p className="mt-1 text-sm text-slate-600">Compares profiles displaying at least one fact supplied by the controlled official-website pipeline with profiles it has not changed. These are anonymous aggregate cohorts, not people or listings.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Enriched views" value={String(enrichedViews)} /><Metric label="Enriched contact rate" value={rate(enrichedContact, enrichedViews)} /><Metric label="Unchanged views" value={String(unchangedViews)} /><Metric label="Unchanged contact rate" value={rate(unchangedContact, unchangedViews)} /></div></section><section className="mt-6"><h4 className="font-bold">Rich-profile pilot comparison</h4><p className="mt-1 text-sm text-slate-600">A rich profile has a summary, three services, reported hours and approved real media. These are anonymous aggregate cohorts, not people or listings.</p><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Rich views" value={String(richViews)} /><Metric label="Rich contact rate" value={rate(richContact, richViews)} /><Metric label="Baseline views" value={String(baselineViews)} /><Metric label="Baseline contact rate" value={rate(baselineContact, baselineViews)} /></div></section><SummaryGroup title="Completed protected forms" empty="No completed protected form has been recorded yet.">{forms.map((event) => <Metric key={event} label={labels[event]} value={String(eventCount(event))} />)}</SummaryGroup>{summary.collectionFailures.length > 0 && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-bold">Collection status</p>{summary.collectionFailures.map((failure) => <p key={failure} className="mt-1">{failure}</p>)}</div>}<p className="mt-6 text-xs text-slate-500">These are separate aggregate counts, not a person-level funnel. Search text, listing IDs, form content, names, emails, IP addresses, cookies, and fingerprints are not collected.</p></section>;
}

function PublicProfileCoverageSummary({ coverage }: { coverage: PublicProfileCoverage }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-baseline justify-between gap-3"><div><h3 className="text-xl font-bold">Public profile coverage</h3><p className="mt-1 text-sm text-slate-600">A quiet count of which useful profile details are already present. It does not read private requests, create work or change a listing.</p></div><p className="text-xs text-slate-500">Read {date(coverage.readAt)}</p></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Published profiles" value={String(coverage.total)} /><Metric label="Street address" value={`${coverage.streetAddress} / ${coverage.total}`} /><Metric label="Direct contact" value={`${coverage.directContact} / ${coverage.total}`} /><Metric label="Description" value={`${coverage.description} / ${coverage.total}`} /><Metric label="Reported hours" value={`${coverage.tradingHours} / ${coverage.total}`} /></div><p className="mt-5 text-xs leading-5 text-slate-500">These are presence counts, not a quality score or a claim that a detail is current. They come only from the public directory projection; source and owner evidence remain governed by the existing review rules.</p></section>;
}

function SummaryGroup({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : [children].filter(Boolean);
  return <section className="mt-6"><h4 className="font-bold">{title}</h4>{items.length === 0 ? <p className="mt-2 text-sm text-slate-600">{empty}</p> : <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{items}</div>}</section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p></div>;
}

function attentionItems(health: Health[], jobs: Job[]): AttentionItem[] {
  const healthItems = health.filter((item) => ["failed", "degraded", "stale"].includes(item.status)).map((item) => ({ title: `${label(item.integration_name)} needs attention`, explanation: healthMessage(item), reference: `health-${item.integration_name}` }));
  const jobItems = jobs.filter((job) => job.status === "failed").map((job) => ({ title: `${label(job.job_type)} did not complete`, explanation: "No listing, claim, or request was changed automatically. Technical help is needed before relying on this run.", reference: `job-${job.job_id.slice(0, 8)}` }));
  return [...healthItems, ...jobItems];
}
function Status({ value }: { value: string }) { const colour = value === "healthy" || value === "succeeded" ? "bg-green-100 text-green-800" : value === "running" ? "bg-sky-100 text-sky-900" : value === "failed" ? "bg-red-100 text-red-800" : value === "degraded" || value === "stale" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700"; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${colour}`}>{label(value)}</span>; }
function healthMessage(item: Health) { if (item.status === "healthy") return "This check is working normally."; if (item.status === "running") return "An approved source refresh is in progress. It does not need an operator decision."; if (item.status === "disabled") return dormantMessage(item); if (item.status === "degraded" || item.status === "stale") return "This information may be out of date. Nothing has changed automatically."; if (item.status === "failed" && item.metadata?.action === "source_contract_held") return `The approved ${catalogueSourceName(text(item.metadata?.source))} source contract or registry approval changed. Candidate processing is safely held; no listing changed.`; if (item.status === "failed") return "The latest check did not finish. Nothing has changed automatically."; return "This is not connected to automatic monitoring yet."; }
function dormantMessage(item: Health) { const reason = text(item.metadata?.reason); return reason ? `Intentionally disabled — ${reason}` : item.status === "unknown" ? "Not connected to automatic monitoring yet." : "Intentionally disabled until it is explicitly approved."; }
function JobDetails({ jobs }: { jobs: Job[] }) { return <section className="mt-6"><h4 className="font-bold">Automated work</h4>{jobs.length === 0 ? <p className="mt-2 text-sm text-slate-600">No automated work has run yet.</p> : <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">{jobs.map((job) => <div key={job.job_id} className="flex flex-wrap items-center justify-between gap-4 p-4 text-sm"><div><p className="font-semibold">{label(job.job_type)}</p><p className="mt-1 text-slate-600">{job.status === "failed" ? `Stopped after ${job.attempt_count} of ${job.max_attempts} attempts.` : "Completed or still being handled without changing business state."}</p></div><Status value={job.status} /></div>)}</div>}</section>; }
function RetentionDetails({ health }: { health: Health | undefined }) { const metadata = health?.metadata ?? {}; const resolved = text(metadata.resolved_retention) ?? "12 months"; const spam = text(metadata.spam_retention) ?? "30 days"; const deleted = number(metadata.last_deleted_count); return <section><h4 className="font-bold">Contact request retention</h4><p className="mt-1 text-sm text-slate-600">Private contact content is removed after it is no longer needed. The permanent audit record keeps only the request ID and status history.</p><div className="mt-3 grid gap-1 text-sm text-slate-700"><p><span className="font-semibold">Resolved requests:</span> {resolved}</p><p><span className="font-semibold">Spam requests:</span> {spam}</p>{deleted !== null && <p><span className="font-semibold">Last retention run:</span> removed {deleted} private request{deleted === 1 ? "" : "s"}.</p>}</div></section>; }
function DecisionRecord({ events }: { events: Audit[] }) { return <section className="mt-7"><h4 className="font-bold">Recent decision record</h4>{events.length === 0 ? <p className="mt-2 text-sm text-slate-600">No decisions have been recorded yet.</p> : <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">{events.map((event) => <article key={event.event_id} className="grid gap-2 p-4 text-sm md:grid-cols-[1fr_10rem]"><div><p className="font-semibold">{label(event.action)}</p><p className="mt-1 text-slate-600">{event.reason ?? `Recorded against ${label(event.entity_type)}.`}</p><AuditState label="Before" value={event.before_state} /><AuditState label="After" value={event.after_state} /><p className="mt-2 text-xs text-slate-500">Evidence reference {shortReference(event.evidence_reference)}.</p></div><time className="text-xs text-slate-500 md:text-right">{date(event.created_at)}</time></article>)}</div>}</section>; }
function HealthDetails({ item }: { item: Health }) { const details = safeHealthDetails(item.metadata); return details.length === 0 ? null : <dl className="mt-3 grid gap-1 text-xs text-slate-600">{details.map(([name, value]) => <div key={name} className="flex gap-2"><dt className="font-semibold">{name}:</dt><dd>{value}</dd></div>)}</dl>; }
function AuditState({ label: title, value }: { label: string; value: Record<string, unknown> | null }) { const entries = Object.entries(value ?? {}); return entries.length === 0 ? null : <p className="mt-2 text-xs text-slate-600"><span className="font-semibold">{title}:</span> {entries.map(([key, entry]) => `${label(key)} ${formatValue(entry)}`).join("; ")}</p>; }
function safeHealthDetails(metadata: Record<string, unknown> | null) { if (!metadata) return [] as Array<[string, string]>; const labels: Record<string, string> = { monitoring: "Monitoring", mode: "Mode", schedule: "Schedule", domain: "Domain", failed_jobs: "Failed jobs", overdue_jobs: "Overdue jobs", listings_needing_review: "Listings needing review", pending_claims: "Pending claims", pending_profile_changes: "Pending profile edits" }; return Object.entries(labels).flatMap(([key, name]) => { const value = metadata[key]; return value === undefined ? [] : [[name, formatValue(value)] as [string, string]]; }); }
function date(value: string) { return formatOpsDateTime(value); }
function label(value: string) { return value === "abr_lookup" ? "Bulk ABN checks" : value === "openstreetmap_source" ? "OpenStreetMap source" : value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function catalogueSourceName(value: string | null) { return value === "openstreetmap" ? "OpenStreetMap" : value === "victorian_liquor_licences" ? "Victorian liquor-licence" : "catalogue"; }
function text(value: unknown) { return typeof value === "string" && value.trim() ? value : null; }
function number(value: unknown) { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function formatValue(value: unknown): string { return Array.isArray(value) ? value.map(formatValue).join(", ") : typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "recorded"; }
function shortReference(value: string) { return value.slice(0, 8); }
