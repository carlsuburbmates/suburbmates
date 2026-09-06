import Link from "next/link";
import { createOpsDataClient } from "@/lib/ops/auth";
import { formatOpsDateTime } from "@/lib/ops/date";
import { decideOfficialWebsiteDomainAction, rollbackOfficialWebsiteEnrichmentAction } from "./actions";

type Review = { host_name: string; review_status: string; terms_url: string | null; review_reason: string; reviewed_at: string | null; updated_at: string };
type EnrichmentApplication = { enrichment_run_id: string; vendor_id: string; business_name: string; applied_fields: string[]; applied_at: string; rollback_available: boolean };

export default async function OfficialWebsitePilotPage({ searchParams }: { searchParams: Promise<{ error?: string; success?: string }> }) {
  const [query, supabase] = await Promise.all([searchParams, createOpsDataClient()]);
  const [{ data, error }, { data: applicationData, error: applicationError }] = await Promise.all([
    supabase.rpc("ops_list_official_website_domain_reviews", { p_status: null }),
    supabase.rpc("ops_list_rollbackable_website_enrichments", { p_limit: 20 }),
  ]);
  if (error || applicationError) throw new Error("Website-pilot controls could not be loaded.");
  const reviews = (data ?? []) as Review[];
  const applications = (applicationData ?? []) as EnrichmentApplication[];
  return (
    <div className="space-y-7">
      <Link href="/ops/system" className="text-sm font-bold underline underline-offset-4">← Back to System</Link>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Official-website pilot</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Review website-domain exceptions</h2>
        <p className="mt-3 max-w-3xl text-slate-600">The bounded runner automatically checks robots and clearly linked same-domain terms before extracting structured public business facts. Possible restrictions stay held here for judgment, and an operator block always wins. It never creates or publishes a business, imports media or page copy, or creates Work.</p>
      </div>
      {query.success && <p role="status" className="rounded-xl border border-green-300 bg-green-50 p-4 font-semibold text-green-800">Decision recorded with an immutable audit event. {query.success === "rollback" ? "The unchanged automated values were safely restored and the source evidence was retained." : "This override now controls the reviewed hostname."}</p>}
      {query.error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-800">{query.error === "invalid" ? "Enter a valid hostname, action and decision reason." : query.error === "rollback-invalid" ? "Choose a valid enrichment and enter a specific rollback reason of at least 8 characters." : query.error === "rollback-guard" ? "Nothing was rolled back. The listing is claimed, was already rolled back, or one of its enriched values has since changed." : "The website-domain decision could not be recorded. Check the terms record and try again."}</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Record a domain override</h3>
        <form action={decideOfficialWebsiteDomainAction} className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-bold">Hostname<input name="hostName" required placeholder="example.com" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="text-sm font-bold">Decision<select name="action" required className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="">Choose one</option><option value="approve">Approve factual reuse</option><option value="block">Block this domain</option></select></label>
          <label className="sm:col-span-2 text-sm font-bold">Terms or permission record URL<span className="mt-1 block text-xs font-normal text-slate-600">Required for approval. Use an HTTPS terms page or written permission record.</span><input name="termsUrl" type="url" placeholder="https://…" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <label className="sm:col-span-2 text-sm font-bold">Decision reason<textarea name="reason" required maxLength={2000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>
          <div className="sm:col-span-2"><button className="btn btn-primary">Record domain override</button></div>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Safe enrichment rollback</h3>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">Use this only when a recently imported website fact is wrong. Rollback is available only while the business remains unclaimed and every imported value is unchanged. It preserves the evidence and records your reason.</p>
        {applications.length === 0 ? <p className="mt-4 text-sm text-slate-600">No atomic website-enrichment applications are awaiting a possible rollback.</p> : <div className="mt-4 divide-y divide-slate-200">{applications.map((application) => <article key={`${application.enrichment_run_id}:${application.vendor_id}`} className="py-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{application.business_name}</p><p className="mt-1 text-xs text-slate-500">Applied {formatOpsDateTime(application.applied_at)} · {application.applied_fields.join(", ")}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${application.rollback_available ? "bg-amber-100 text-amber-950" : "bg-slate-100 text-slate-600"}`}>{application.rollback_available ? "Rollback available" : "Protected from rollback"}</span></div>{application.rollback_available && <form action={rollbackOfficialWebsiteEnrichmentAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><input type="hidden" name="enrichmentRunId" value={application.enrichment_run_id} /><input type="hidden" name="vendorId" value={application.vendor_id} /><label className="text-sm font-bold">Why is this data wrong?<input name="reason" required minLength={8} maxLength={2000} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 p-3 font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800" placeholder="Example: The official site describes a different location." /></label><button className="btn min-h-11 self-end border border-red-300 bg-white text-red-800 hover:bg-red-50">Roll back unchanged imported fields</button></form>}</article>)}</div>}
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold">Recorded domain overrides</h3>
        {reviews.length === 0 ? <p className="mt-4 text-sm text-slate-600">No operator overrides are recorded. The automatic runner still applies its robots and linked-terms safety checks.</p> : <div className="mt-4 divide-y divide-slate-200">{reviews.map((review) => <article key={review.host_name} className="py-4"><div className="flex flex-wrap items-baseline justify-between gap-3"><p className="font-bold">{review.host_name}</p><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{review.review_status}</span></div><p className="mt-2 text-sm text-slate-600">{review.review_reason}</p>{review.terms_url && <a href={review.terms_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold underline underline-offset-4">Terms record</a>}<p className="mt-2 text-xs text-slate-500">Updated {formatOpsDateTime(review.updated_at)}</p></article>)}</div>}
      </section>
      <Link href="/ops/system" className="inline-block text-sm font-bold underline underline-offset-4">← Back to System</Link>
    </div>
  );
}
