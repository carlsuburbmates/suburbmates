"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type ClaimRequest = {
  claim_request_id: string;
  business_name: string;
  claim_status: string;
  created_at: string;
};

export default function ClaimRequests({ initialRequests }: { initialRequests: ClaimRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const withdraw = async (requestId: string) => {
    setWithdrawingId(requestId);
    setError(null);
    setSuccess(null);
    const { error: withdrawalError } = await supabase.rpc("withdraw_current_owner_claim", {
      p_claim_request_id: requestId,
    });

    if (withdrawalError) {
      setError(withdrawalError.message || "We could not withdraw that request. Please try again.");
    } else {
      setRequests((current) => current.map((request) => request.claim_request_id === requestId ? { ...request, claim_status: "withdrawn" } : request));
      setSuccess("Your claim request was withdrawn. The business listing was not changed.");
    }
    setWithdrawingId(null);
  };

  if (requests.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Your ownership requests</h2>
        <p className="mt-1 text-sm text-slate-600">A request does not change the public listing unless an operator approves it.</p>
      </div>
      {error && <div className="flex gap-3 rounded-lg bg-red-50 p-4 text-sm text-red-800"><AlertCircle size={20} className="shrink-0" /><p>{error}</p></div>}
      {success && <div className="flex gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-800"><CheckCircle2 size={20} className="shrink-0" /><p>{success}</p></div>}
      <div className="grid gap-4">
        {requests.map((request) => {
          const canWithdraw = request.claim_status === "pending" || request.claim_status === "needs_information";
          return <div key={request.claim_request_id} className="rounded-2xl border bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
            <div>
              <h3 className="font-bold">{request.business_name}</h3>
              <p className="mt-1 text-sm text-slate-600">Status: {statusLabel(request.claim_status)}</p>
            </div>
            {canWithdraw && <button type="button" onClick={() => withdraw(request.claim_request_id)} disabled={withdrawingId === request.claim_request_id} className="btn btn-outline mt-4 text-sm sm:mt-0">
              {withdrawingId === request.claim_request_id ? "Withdrawing…" : "Withdraw request"}
            </button>}
          </div>;
        })}
      </div>
    </section>
  );
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
