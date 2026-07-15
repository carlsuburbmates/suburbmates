import Link from "next/link";
import { notFound } from "next/navigation";
import { verifyOpsAdmin } from "@/lib/ops/auth";
import { reviewClaimAction } from "../actions";

type OpsClaim = {
  claim_request_id: string;
  vendor_id: string;
  business_name: string;
  suburb_slug: string;
  category_slug: string;
  listing_source: string | null;
  ownership_status: string;
  is_published: boolean;
  claimant_user_id: string;
  claimant_email: string;
  claim_status: string;
  evidence: { email_match?: boolean; matched_at?: string } | null;
  claimant_note: string | null;
  operator_note: string | null;
  decided_at: string | null;
  created_at: string;
};

export default async function OpsClaimDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ claimId: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { claimId } = await params;
  const message = await searchParams;
  const { supabase } = await verifyOpsAdmin(`/ops/claims/${claimId}`);
  const { data, error } = await supabase.rpc("ops_list_claim_requests", {
    p_status: null,
    p_claim_request_id: claimId,
    p_limit: 1,
    p_offset: 0,
  });

  if (error) {
    throw new Error("The claim could not be loaded.");
  }

  const claim = data?.[0] as OpsClaim | undefined;
  if (!claim) notFound();

  const open = claim.claim_status === "pending" || claim.claim_status === "needs_information";
  const approved = claim.claim_status === "approved";

  return (
    <div className="space-y-7">
      <Link href={`/ops/claims?status=${claim.claim_status}`} className="text-sm font-bold underline underline-offset-4">← Back to claims</Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">Claim review</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight">{claim.business_name}</h2>
          <p className="mt-2 text-slate-600">{claim.category_slug} in {claim.suburb_slug}</p>
        </div>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">{formatStatus(claim.claim_status)}</span>
      </div>

      {message.error && (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {message.error === "invalid" ? "Enter a reason before making a valid decision." : "The decision could not be completed. Refresh and check the current claim state."}
        </p>
      )}
      {message.success && (
        <p className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800">Decision recorded with an audit event.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard title="Claimant">
          <InfoRow label="Email" value={claim.claimant_email} />
          <InfoRow label="Submitted" value={new Date(claim.created_at).toLocaleString("en-AU")} />
          <InfoRow label="Claimant note" value={claim.claimant_note ?? "None provided"} />
        </InfoCard>
        <InfoCard title="Listing">
          <InfoRow label="Published" value={claim.is_published ? "Yes — this decision will not change it" : "No — this decision will not publish it"} />
          <InfoRow label="Ownership" value={formatStatus(claim.ownership_status)} />
          <InfoRow label="Source" value={claim.listing_source ? formatStatus(claim.listing_source) : "Not recorded"} />
        </InfoCard>
      </div>

      <InfoCard title="Evidence">
        <p className="font-semibold">{claim.evidence?.email_match ? "The signed-in email matched the listing contact email." : "No automated email match is recorded."}</p>
        <p className="mt-2 text-sm text-amber-800">An email match supports review but does not by itself prove authority to control the business.</p>
      </InfoCard>

      {claim.operator_note && (
        <InfoCard title="Latest operator note"><p>{claim.operator_note}</p></InfoCard>
      )}

      {(open || approved) && (
        <section className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-bold">Record a decision</h3>
          <p className="mt-2 text-sm text-slate-600">A clear reason is required and will be stored in the immutable audit history.</p>
          <form action={reviewClaimAction} className="mt-5 space-y-4">
            <input type="hidden" name="claimId" value={claim.claim_request_id} />
            <label className="block text-sm font-bold" htmlFor="reason">Decision basis or reason</label>
            <textarea id="reason" name="reason" required maxLength={2000} rows={4} className="w-full rounded-xl border border-slate-300 p-3" />
            <div className="flex flex-wrap gap-3">
              {open && <button name="decision" value="needs_information" className="btn btn-outline">Request information</button>}
              {open && <button name="decision" value="reject" className="btn btn-outline">Reject</button>}
              {open && <button name="decision" value="approve" className="btn btn-primary">Approve ownership</button>}
              {approved && <button name="decision" value="revoke" className="btn btn-outline">Revoke ownership</button>}
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="mb-4 text-lg font-bold">{title}</h3>{children}</section>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[8rem_1fr] gap-3 border-t border-slate-100 py-3 first:border-t-0"><span className="text-sm font-semibold text-slate-500">{label}</span><span className="text-sm font-medium">{value}</span></div>;
}

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
