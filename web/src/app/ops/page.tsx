import Link from "next/link";
import { createOpsDataClient } from "@/lib/ops/auth";

type ClaimOverview = {
  pending_count: number;
  needs_information_count: number;
  approved_count: number;
  rejected_count: number;
  revoked_count: number;
};

type ProfileChangeOverview = {
  pending_count: number;
  approved_count: number;
  rejected_count: number;
};

type ListingOverview = {
  review_count: number;
  published_count: number;
  rejected_count: number;
  unpublished_count: number;
};

type SystemOverview = {
  failed_count: number;
  degraded_count: number;
  stale_count: number;
  failed_job_count: number;
};

type ContactOverview = {
  new_count: number;
  in_progress_count: number;
  resolved_count: number;
  spam_count: number;
};

type ActionOverview = {
  candidate_manual_review_count: number;
  catalogue_manual_review_count: number;
  candidate_background_unique_count: number;
  candidate_repeated_event_count: number;
  catalogue_background_count: number;
};

export default async function OpsOverviewPage() {
  const supabase = await createOpsDataClient();
  const [listingResult, claimResult, profileResult, contactResult, systemResult, actionResult] = await Promise.all([
    supabase.rpc("ops_listing_overview"),
    supabase.rpc("ops_claim_overview"),
    supabase.rpc("ops_profile_change_overview"),
    supabase.rpc("ops_contact_overview"),
    supabase.rpc("ops_system_overview"),
    supabase.rpc("ops_action_overview"),
  ]);

  if (listingResult.error || claimResult.error || profileResult.error || contactResult.error || systemResult.error || actionResult.error) {
    throw new Error("The operations overview could not be loaded.");
  }

  const overview = (claimResult.data?.[0] ?? {
    pending_count: 0,
    needs_information_count: 0,
    approved_count: 0,
    rejected_count: 0,
    revoked_count: 0,
  }) as ClaimOverview;
  const profileOverview = (profileResult.data?.[0] ?? {
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
  }) as ProfileChangeOverview;
  const listingOverview = (listingResult.data?.[0] ?? {
    review_count: 0,
    published_count: 0,
    rejected_count: 0,
    unpublished_count: 0,
  }) as ListingOverview;
  const systemOverview = (systemResult.data?.[0] ?? {
    failed_count: 0,
    degraded_count: 0,
    stale_count: 0,
    failed_job_count: 0,
  }) as SystemOverview;
  const contactOverview = (contactResult.data?.[0] ?? {
    new_count: 0,
    in_progress_count: 0,
    resolved_count: 0,
    spam_count: 0,
  }) as ContactOverview;
  const actionOverview = (actionResult.data?.[0] ?? {
    candidate_manual_review_count: 0,
    catalogue_manual_review_count: 0,
    candidate_background_unique_count: 0,
    candidate_repeated_event_count: 0,
    catalogue_background_count: 0,
  }) as ActionOverview;

  const systemExceptions = Number(systemOverview.failed_count) + Number(systemOverview.degraded_count) + Number(systemOverview.stale_count) + Number(systemOverview.failed_job_count);
  const openContactCount = Number(contactOverview.new_count) + Number(contactOverview.in_progress_count);
  const claimCount = Number(overview.pending_count) + Number(overview.needs_information_count);
  const attentionCount = Number(listingOverview.review_count) + claimCount + Number(profileOverview.pending_count) + openContactCount + systemExceptions + Number(actionOverview.candidate_manual_review_count) + Number(actionOverview.catalogue_manual_review_count);
  const actions = [
    Number(overview.pending_count) > 0 && { count: Number(overview.pending_count), title: "Review ownership claims", detail: "Decide whether each person has provided enough evidence to own the listed business.", href: "/ops/claims?status=pending", button: "Review claims" },
    Number(overview.needs_information_count) > 0 && { count: Number(overview.needs_information_count), title: "Check claims awaiting more information", detail: "Review new evidence or keep the ownership request waiting. Nothing changes automatically.", href: "/ops/claims?status=needs_information", button: "Open waiting claims" },
    Number(profileOverview.pending_count) > 0 && { count: Number(profileOverview.pending_count), title: "Review owner profile edits", detail: "Approve or reject proposed public listing changes.", href: "/ops/profile-edits?status=pending", button: "Review profile edits" },
    Number(contactOverview.new_count) > 0 && { count: Number(contactOverview.new_count), title: "Read new contact requests", detail: "Classify the request and record the next step. These requests do not change a listing by themselves.", href: "/ops/contact?status=new", button: "Open new requests" },
    Number(listingOverview.review_count) > 0 && { count: Number(listingOverview.review_count), title: "Review listings", detail: "Check the public facts and make the appropriate listing decision.", href: "/ops/listings?status=review", button: "Open listing review" },
    Number(actionOverview.candidate_manual_review_count) > 0 && { count: Number(actionOverview.candidate_manual_review_count), title: "Review possible duplicate discoveries", detail: "These are the only new discoveries without another automatic exclusion. Check whether each is already in the directory.", href: "/ops/candidates?status=open", button: "Review possible duplicates" },
    Number(actionOverview.catalogue_manual_review_count) > 0 && { count: Number(actionOverview.catalogue_manual_review_count), title: "Review possible duplicate listings", detail: "These older listings may duplicate another listing and need a human merge or keep decision.", href: "/ops/catalogue-review?status=open", button: "Review possible duplicates" },
    systemExceptions > 0 && { count: systemExceptions, title: "Resolve system exceptions", detail: "Check the plain-English status, then follow its recommended next step or ask for technical help.", href: "/ops/system", button: "Open system health" },
  ].filter(Boolean) as Array<{ count: number; title: string; detail: string; href: string; button: string }>;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Overview</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Items needing attention</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Routine review stays here. External dashboards are only needed for account setup or exceptional incidents.
        </p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6" aria-label="Operations summary">
        <SummaryCard label="All open work" value={attentionCount} urgent={attentionCount > 0} />
        <SummaryCard label="Listings to review" value={Number(listingOverview.review_count)} />
        <SummaryCard label="Claims to review" value={claimCount} />
        <SummaryCard label="Profile edits" value={Number(profileOverview.pending_count)} />
        <SummaryCard label="Contact requests" value={openContactCount} />
        <SummaryCard label="System exceptions" value={systemExceptions} urgent={systemExceptions > 0} />
      </section>

      {actions.length === 0 ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 shadow-sm">
          <h3 className="text-xl font-bold text-emerald-950">Nothing needs your decision right now</h3>
          <p className="mt-2 text-sm text-emerald-900">The queues are clear and the monitored system checks are normal. You do not need to work through the tabs.</p>
        </section>
      ) : (
        <section aria-label="Next actions" className="space-y-4">
          <div><h3 className="text-2xl font-black">Do these next</h3><p className="mt-1 text-sm text-slate-600">Only queues with real work appear here. Each button opens the exact items that need your decision.</p></div>
          <div className="grid gap-4 lg:grid-cols-2">
            {actions.map((action) => <ActionCard key={`${action.href}-${action.title}`} {...action} />)}
          </div>
        </section>
      )}

      {(Number(actionOverview.candidate_background_unique_count) > 0 || Number(actionOverview.catalogue_background_count) > 0) && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">Background automation and evidence</h3>
          <p className="mt-1 text-sm text-slate-600">These are retained for audit and future batch improvement. They are not a manual to-do list and do not affect publication by themselves.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {Number(actionOverview.candidate_background_unique_count) > 0 && <article className="rounded-xl bg-slate-50 p-4"><p className="font-bold">{Number(actionOverview.candidate_background_unique_count).toLocaleString()} discoveries safely held</p><p className="mt-1 text-sm text-slate-600">They already have an automatic exclusion such as no customer contact method, a confirmed duplicate, or an unsupported category.</p>{Number(actionOverview.candidate_repeated_event_count) > 0 && <p className="mt-2 text-xs text-slate-500">{Number(actionOverview.candidate_repeated_event_count).toLocaleString()} repeat events were collapsed into this summary.</p>}</article>}
            {Number(actionOverview.catalogue_background_count) > 0 && <article className="rounded-xl bg-slate-50 p-4"><p className="font-bold">{Number(actionOverview.catalogue_background_count).toLocaleString()} older listings need later evidence improvement</p><p className="mt-1 text-sm text-slate-600">Most lack a contact method, have an unsupported category, or need source evidence. This needs a future bulk data-improvement pass, not individual manual review.</p></article>}
          </div>
        </section>
      )}
    </div>
  );
}

function ActionCard({ count, title, detail, href, button }: { count: number; title: string; detail: string; href: string; button: string }) {
  return <section className="rounded-2xl border border-amber-300 bg-amber-50 p-6 shadow-sm"><div className="flex items-start gap-4"><p className="rounded-xl bg-amber-200 px-3 py-2 text-2xl font-black tabular-nums text-amber-950">{count}</p><div><h3 className="text-lg font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm text-slate-700">{detail}</p><Link href={href} className="mt-4 inline-flex font-bold underline underline-offset-4">{button} →</Link></div></div></section>;
}

function SummaryCard({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${urgent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-3 text-4xl font-black tabular-nums">{value}</p>
    </div>
  );
}
