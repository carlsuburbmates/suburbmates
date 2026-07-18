import Link from "next/link";
import { QueuePagination } from "@/components/ops/QueuePagination";
import { verifyOpsAdmin } from "@/lib/ops/auth";

const statuses = ["pending", "approved", "rejected"] as const;
type Status = (typeof statuses)[number];

type ProfileChange = {
  change_request_id: string;
  business_name: string;
  suburb_slug: string;
  category_slug: string;
  change_status: string;
  proposed_changes: Record<string, unknown>;
  base_values: Record<string, unknown>;
  created_at: string;
};

export default async function OpsProfileEditsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const params = await searchParams;
  const status = statuses.includes(params.status as Status) ? (params.status as Status) : "pending";
  const page = pageNumber(params.page);
  const { supabase } = await verifyOpsAdmin(`/ops/profile-edits?status=${status}`);
  const { data, error } = await supabase.rpc("ops_list_profile_changes", {
    p_status: status,
    p_change_request_id: null,
    p_limit: 101,
    p_offset: page * 100,
  });

  if (error) throw new Error("The profile edit queue could not be loaded.");
  const results = (data ?? []) as ProfileChange[];
  const requests = results.slice(0, 100);
  const hasNextPage = results.length > 100;
  const pageHref = (targetPage: number) => `/ops/profile-edits?${new URLSearchParams({ status, ...(targetPage ? { page: String(targetPage) } : {}) }).toString()}`;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Listings</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Owner profile edit queue</h2>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Profile edit status filters">
        {statuses.map((item) => (
          <Link key={item} href={`/ops/profile-edits?status=${item}`} aria-current={item === status ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${item === status ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}>
            {formatStatus(item)}
          </Link>
        ))}
      </nav>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {requests.length === 0 ? (
          <div className="p-10 text-center text-slate-600">No {status} profile edits.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {requests.map((request) => {
              const changedFields = Object.keys(request.proposed_changes).filter(
                (key) => request.proposed_changes[key] !== request.base_values[key],
              );
              return (
                <div key={request.change_request_id} className="flex flex-wrap items-center justify-between gap-5 p-5">
                  <div>
                    <p className="font-bold">{request.business_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{request.category_slug} · {request.suburb_slug}</p>
                    <p className="mt-2 text-sm text-slate-600">Changed: {changedFields.map(formatStatus).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{new Date(request.created_at).toLocaleDateString("en-AU")}</p>
                    <Link href={`/ops/profile-edits/${request.change_request_id}`} className="mt-2 inline-block font-bold underline underline-offset-4">Review</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <QueuePagination page={page} hasNextPage={hasNextPage} hrefForPage={pageHref} />
    </div>
  );
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function pageNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 0;
}
