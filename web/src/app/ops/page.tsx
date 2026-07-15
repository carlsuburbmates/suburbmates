import Link from "next/link";
import { verifyOpsAdmin } from "@/lib/ops/auth";

type ClaimOverview = {
  pending_count: number;
  needs_information_count: number;
  approved_count: number;
  rejected_count: number;
  revoked_count: number;
};

export default async function OpsOverviewPage() {
  const { supabase } = await verifyOpsAdmin("/ops");
  const { data, error } = await supabase.rpc("ops_claim_overview");

  if (error) {
    throw new Error("The operations overview could not be loaded.");
  }

  const overview = (data?.[0] ?? {
    pending_count: 0,
    needs_information_count: 0,
    approved_count: 0,
    rejected_count: 0,
    revoked_count: 0,
  }) as ClaimOverview;

  const attentionCount = Number(overview.pending_count) + Number(overview.needs_information_count);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Overview</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Items needing attention</h2>
        <p className="mt-3 max-w-2xl text-slate-600">
          Routine review stays here. External dashboards are only needed for account setup or exceptional incidents.
        </p>
      </div>

      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Claim status summary">
        <SummaryCard label="Open claim work" value={attentionCount} urgent={attentionCount > 0} />
        <SummaryCard label="Pending" value={Number(overview.pending_count)} />
        <SummaryCard label="Needs information" value={Number(overview.needs_information_count)} />
        <SummaryCard label="Approved" value={Number(overview.approved_count)} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold">Claim review</h3>
            <p className="mt-1 text-sm text-slate-600">
              Email matching is evidence only. Ownership changes only after an operator decision.
            </p>
          </div>
          <Link href="/ops/claims" className="btn btn-primary">Open claim queue</Link>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, urgent = false }: { label: string; value: number; urgent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-6 shadow-sm ${urgent ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"}`}>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-3 text-4xl font-black tabular-nums">{value}</p>
    </div>
  );
}
