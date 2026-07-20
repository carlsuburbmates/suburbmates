"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Building, MapPin, Tag, CheckCircle2, AlertCircle, Mail } from "lucide-react";

type ClaimableVendor = {
  id: string;
  business_name: string;
  suburb_slug: string;
  category_slug: string;
  street_address: string | null;
};

export default function ClaimClient() {
  const [results, setResults] = useState<ClaimableVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [supabase] = useState(createClient);

  useEffect(() => {
    const loadClaimableListings = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.rpc("list_claimable_vendors_for_current_email");

      if (error) {
        setError("We could not check your eligible listings. Please try again.");
      } else {
        setResults(data || []);
      }
      setLoading(false);
    };

    void loadClaimableListings();
  }, [supabase]);

  const handleClaim = async (vendorId: string) => {
    setClaimingId(vendorId);
    setError(null);
    setSuccess(null);

    const { error: claimError } = await supabase.rpc("submit_claim_for_current_email", {
      p_vendor_id: vendorId,
      p_claimant_note: null,
    });

    if (claimError) {
      setError(claimError.message || "Unable to submit this claim request. Please try again.");
    } else {
      setResults((current) => current.filter((vendor) => vendor.id !== vendorId));
      setSuccess("Your claim request has been submitted for review. The listing remains public and unchanged while the request is assessed.");
    }
    setClaimingId(null);
  };

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-start gap-3 text-sm">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-3 text-sm">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      {loading && (
        <div className="rounded-lg bg-white p-6 text-sm text-slate-600 shadow-sm border">
          Checking listings linked to your verified email address...
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="rounded-2xl border bg-white p-8 text-center shadow-sm">
          <Mail className="mx-auto mb-4 text-slate-400" size={28} />
          <h2 className="text-xl font-bold">No listing is ready for a claim request</h2>
          <p className="mt-2 text-sm text-slate-600">
            This email does not match an unclaimed listing contact. You can ask for private claim help; an operator will review the evidence and the listing will not change automatically.
          </p>
          <Link href="/contact?topic=claim_help" className="btn btn-outline mt-5">Ask for claim help</Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-bold text-lg">Listings linked to your email</h2>
          <div className="grid gap-4">
            {results.map((vendor) => (
              <div key={vendor.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2 mb-2">
                    <Building size={18} className="text-slate-400" />
                    {vendor.business_name}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Tag size={14} /> {vendor.category_slug}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {vendor.suburb_slug}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleClaim(vendor.id)}
                  disabled={claimingId === vendor.id || success !== null}
                  className="btn btn-primary whitespace-nowrap"
                >
                  {claimingId === vendor.id ? "Submitting..." : "Submit Claim Request"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
