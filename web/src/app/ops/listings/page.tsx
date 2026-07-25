import Link from "next/link";
import { QueuePagination } from "@/components/ops/QueuePagination";
import { createOpsDataClient } from "@/lib/ops/auth";

const statuses = ["all", "review", "unclassified", "draft", "pending_review", "published", "rejected", "unpublished"] as const;
type Status = (typeof statuses)[number];

type OpsListing = {
  vendor_id: string;
  business_name: string;
  category_slug: string | null;
  suburb_slug: string | null;
  listing_status: string | null;
  listing_source: string | null;
  ownership_status: string;
  tier: string;
  updated_at: string;
  active_draft_id: string | null;
};

export default async function OpsListingsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const params = await searchParams;
  const status = statuses.includes(params.status as Status) ? (params.status as Status) : "all";
  const q = typeof params.q === "string" ? params.q.slice(0, 200) : "";
  const page = pageNumber(params.page);
  const supabase = await createOpsDataClient();
  const { data, error } = await supabase.rpc("ops_list_listings", {
    p_status: status,
    p_query: q || null,
    p_vendor_id: null,
    p_limit: 101,
    p_offset: page * 100,
  });
  if (error) throw new Error("The listing review queue could not be loaded.");
  const results = (data ?? []) as OpsListing[];
  const listings = results.slice(0, 100);
  const hasNextPage = results.length > 100;
  const pageHref = (targetPage: number) => `/ops/listings?${new URLSearchParams({ status, ...(q ? { q } : {}), ...(targetPage ? { page: String(targetPage) } : {}) }).toString()}`;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Businesses</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Business register</h2>
        <p className="mt-3 max-w-3xl text-slate-600">Search real directory records and open one business to see its authorised evidence, requests and safe actions. Private candidate records are not businesses.</p>
      </div>

      <form className="flex max-w-xl gap-3" action="/ops/listings">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={q} maxLength={200} placeholder="Search business name" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3" />
        <button className="btn btn-primary">Search</button>
      </form>

      <nav className="flex flex-wrap gap-2" aria-label="Listing status filters">
        {statuses.map((item) => (
          <Link key={item} href={`/ops/listings?status=${item}`} aria-current={item === status ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${item === status ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}>
            {statusLabel(item)}
          </Link>
        ))}
      </nav>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {listings.length === 0 ? <p className="p-10 text-center text-slate-600">No listings match this view.</p> : (
          <div className="divide-y divide-slate-200">
            {listings.map((listing) => (
              <div key={listing.vendor_id} className="flex flex-wrap items-center justify-between gap-5 p-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{listing.business_name}</p>
                    <Badge>{statusLabel(listing.listing_status ?? "unclassified")}</Badge>
                    {listing.active_draft_id && <Badge>Draft saved</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{listing.category_slug ?? "No category"} · {listing.suburb_slug ?? "No location"}</p>
                  <p className="mt-1 text-xs text-slate-500">Source: {listing.listing_source ?? "Unrecorded"} · Ownership: {statusLabel(listing.ownership_status)}</p>
                </div>
                <Link href={`/ops/listings/${listing.vendor_id}`} className="font-bold underline underline-offset-4">Review</Link>
              </div>
            ))}
          </div>
        )}
      </section>
      <QueuePagination page={page} hasNextPage={hasNextPage} hrefForPage={pageHref} />
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">{children}</span>;
}

function statusLabel(value: string) {
  if (value === "all") return "All businesses";
  if (value === "review") return "Attention";
  if (value === "unclassified") return "Needs classification";
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function pageNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 10_000) : 0;
}
