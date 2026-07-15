import Link from "next/link";
import { verifyOpsAdmin } from "@/lib/ops/auth";

const statuses = ["pending", "needs_information", "approved", "rejected", "revoked"] as const;
type ClaimStatus = (typeof statuses)[number];

type OpsClaim = {
  claim_request_id: string;
  business_name: string;
  suburb_slug: string;
  category_slug: string;
  claimant_email: string;
  claim_status: string;
  evidence: { email_match?: boolean } | null;
  created_at: string;
};

export default async function OpsClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = statuses.includes(params.status as ClaimStatus) ? (params.status as ClaimStatus) : "pending";
  const { supabase } = await verifyOpsAdmin(`/ops/claims?status=${status}`);
  const { data, error } = await supabase.rpc("ops_list_claim_requests", {
    p_status: status,
    p_claim_request_id: null,
    p_limit: 100,
    p_offset: 0,
  });

  if (error) {
    throw new Error("The claim queue could not be loaded.");
  }

  const claims = (data ?? []) as OpsClaim[];

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Claims</p>
        <h2 className="mt-2 text-4xl font-black tracking-tight">Ownership review queue</h2>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Claim status filters">
        {statuses.map((item) => (
          <Link
            key={item}
            href={`/ops/claims?status=${item}`}
            aria-current={item === status ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-bold ${item === status ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}
          >
            {formatStatus(item)}
          </Link>
        ))}
      </nav>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {claims.length === 0 ? (
          <div className="p-10 text-center text-slate-600">No {formatStatus(status).toLowerCase()} claims.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-5 py-4">Business</th>
                  <th className="px-5 py-4">Claimant</th>
                  <th className="px-5 py-4">Evidence</th>
                  <th className="px-5 py-4">Submitted</th>
                  <th className="px-5 py-4"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {claims.map((claim) => (
                  <tr key={claim.claim_request_id}>
                    <td className="px-5 py-4">
                      <p className="font-bold">{claim.business_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{claim.category_slug} · {claim.suburb_slug}</p>
                    </td>
                    <td className="px-5 py-4">{claim.claimant_email}</td>
                    <td className="px-5 py-4">{claim.evidence?.email_match ? "Email match" : "Manual review"}</td>
                    <td className="px-5 py-4">{new Date(claim.created_at).toLocaleDateString("en-AU")}</td>
                    <td className="px-5 py-4 text-right">
                      <Link className="font-bold underline underline-offset-4" href={`/ops/claims/${claim.claim_request_id}`}>Review</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
