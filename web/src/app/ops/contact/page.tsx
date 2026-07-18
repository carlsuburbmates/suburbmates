import Link from "next/link";
import { QueuePagination } from "@/components/ops/QueuePagination";
import { verifyOpsAdmin } from "@/lib/ops/auth";

const statuses = ["new", "in_progress", "resolved", "spam"] as const;
type ContactStatus = (typeof statuses)[number];

type ContactRequest = {
  contact_request_id: string;
  topic: string;
  requester_name: string;
  requester_email: string;
  business_name: string | null;
  message: string;
  contact_status: string;
  created_at: string;
};

export default async function OpsContactPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = statuses.includes(params.status as ContactStatus) ? (params.status as ContactStatus) : "new";
  const page = pageNumber(params.page);
  const { supabase } = await verifyOpsAdmin(`/ops/contact?status=${status}`);
  const { data, error } = await supabase.rpc("ops_list_contact_requests", {
    p_status: status,
    p_contact_request_id: null,
    p_limit: 101,
    p_offset: page * 100,
  });

  if (error) throw new Error("The contact queue could not be loaded.");
  const results = (data ?? []) as ContactRequest[];
  const requests = results.slice(0, 100);
  const hasNextPage = results.length > 100;
  const pageHref = (targetPage: number) => `/ops/contact?${new URLSearchParams({ status, ...(targetPage ? { page: String(targetPage) } : {}) }).toString()}`;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Contact</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Private support queue</h2>
        <p className="mt-3 max-w-2xl text-slate-600">Requests are private and do not change any listing, ownership, publication, or billing state.</p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Contact status filters">
        {statuses.map((item) => (
          <Link key={item} href={`/ops/contact?status=${item}`} aria-current={item === status ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${item === status ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}>
            {formatStatus(item)}
          </Link>
        ))}
      </nav>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {requests.length === 0 ? (
          <div className="p-10 text-center text-slate-600">No {formatStatus(status).toLowerCase()} requests.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr><th className="px-5 py-4">From</th><th className="px-5 py-4">Topic</th><th className="px-5 py-4">Summary</th><th className="px-5 py-4">Received</th><th className="px-5 py-4"><span className="sr-only">Open</span></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {requests.map((request) => (
                  <tr key={request.contact_request_id}>
                    <td className="px-5 py-4"><p className="font-bold">{request.requester_name}</p><p className="mt-1 text-xs text-slate-500">{request.business_name ?? request.requester_email}</p></td>
                    <td className="px-5 py-4">{formatStatus(request.topic)}</td>
                    <td className="max-w-md truncate px-5 py-4">{request.message}</td>
                    <td className="px-5 py-4">{new Date(request.created_at).toLocaleDateString("en-AU")}</td>
                    <td className="px-5 py-4 text-right"><Link className="font-bold underline underline-offset-4" href={`/ops/contact/${request.contact_request_id}`}>Review</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
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
