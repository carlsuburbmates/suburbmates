"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { ArrowRight, Building, MapPin, Tag, CheckCircle2, AlertCircle, Mail, ShieldCheck } from "lucide-react";
import { recordDirectoryObservabilityEvent } from "@/components/observability/DirectoryObservabilityObserver";
import { displayDirectoryLocation } from "@/lib/directory-location";

type ClaimableVendor = {
  id: string;
  business_name: string;
  suburb_slug: string;
  category_slug: string;
  street_address: string | null;
};

export default function ClaimClient({ selectedListingId }: { selectedListingId: string | null }) {
  const [results, setResults] = useState<ClaimableVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(selectedListingId);
  const [explanation, setExplanation] = useState("");
  const [abn, setAbn] = useState("");
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
    const claimantNote = explanation.trim();
    const evidenceAbn = abn.replace(/\s/g, "");
    if (claimantNote.length < 10 || claimantNote.length > 1000) {
      setError("Briefly explain your connection to this business using 10 to 1,000 characters.");
      return;
    }
    if (evidenceAbn && !/^\d{11}$/.test(evidenceAbn)) {
      setError("Enter an 11-digit ABN or leave it blank.");
      return;
    }
    setClaimingId(vendorId);
    setError(null);
    setSuccess(null);

    const { error: claimError } = await supabase.rpc("submit_claim_for_current_email", {
      p_vendor_id: vendorId,
      p_claimant_note: claimantNote,
      p_abn: evidenceAbn || null,
    });

    if (claimError) {
      setError(claimError.message || "Unable to submit this claim request. Please try again.");
    } else {
      setResults((current) => current.filter((vendor) => vendor.id !== vendorId));
      setActiveVendorId(null);
      setSuccess("Your claim request has been submitted for review. The listing remains public and unchanged while the request is assessed.");
      recordDirectoryObservabilityEvent("claim_completed");
    }
    setClaimingId(null);
  };

  return (
    <div className="space-y-7">
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          <AlertCircle size={20} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900" role="status">
          <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
          <p>{success}</p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
          Checking the listings linked to your signed-in email address…
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-teal-800 shadow-sm"><Mail size={26} aria-hidden="true" /></span>
          <h2 className="mt-5 text-xl font-black tracking-tight">No listing is ready for a claim request</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            {selectedListingId ? "The selected listing is not available for this signed-in email. " : "This email does not match an unclaimed listing contact. "}
            You can ask for private claim help; an operator will review the evidence and the listing will not change automatically.
          </p>
          <Link href="/contact?topic=claim_help" className="btn btn-outline mt-6 min-h-11">Ask for claim help</Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">Your eligible listing</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">Confirm the business you represent</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">An email match supports the request. Ownership is never granted automatically, and the public listing stays unchanged during review.</p>
          </div>
          <div className="grid gap-4">
            {results.map((vendor) => (
              <div key={vendor.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    {selectedListingId === vendor.id && <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-800">Selected profile · from the public directory</p>}
                    <h3 className="flex items-center gap-2 text-xl font-black tracking-tight">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-800"><Building size={19} aria-hidden="true" /></span>
                    {vendor.business_name}
                  </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold">
                      <Tag size={14} aria-hidden="true" /> {humanize(vendor.category_slug)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 font-semibold">
                      <MapPin size={14} aria-hidden="true" /> {displayDirectoryLocation(vendor.suburb_slug)}
                    </span>
                  </div>
                </div>
                {activeVendorId === vendor.id ? (
                  <div className="mt-6 rounded-2xl border border-teal-900/10 bg-teal-50/70 p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <ShieldCheck size={21} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />
                      <div><p className="font-black text-slate-950">Support your claim</p><p className="mt-1 text-sm leading-6 text-slate-600">Explain your connection to this business. An ABN can help an operator review the request, but it is optional and is not checked automatically.</p></div>
                    </div>
                    <label className="mt-5 block text-sm font-bold text-slate-800">Your connection to this business<textarea value={explanation} onChange={(event) => setExplanation(event.target.value)} minLength={10} maxLength={1000} rows={4} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal text-slate-900 outline-none transition focus:border-teal-800 focus:ring-2 focus:ring-teal-800" placeholder="For example: I am the director and use this business email for customer enquiries." /></label>
                    <label className="mt-4 block text-sm font-bold text-slate-800">ABN <span className="font-normal text-slate-500">(optional)</span><input value={abn} onChange={(event) => setAbn(event.target.value)} inputMode="numeric" maxLength={14} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal text-slate-900 outline-none transition focus:border-teal-800 focus:ring-2 focus:ring-teal-800" placeholder="11 digits" /></label>
                    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={() => handleClaim(vendor.id)} disabled={claimingId === vendor.id || success !== null} className="btn btn-primary min-h-11">{claimingId === vendor.id ? "Submitting…" : <>Submit claim for review <ArrowRight size={15} aria-hidden="true" /></>}</button><button type="button" onClick={() => { setActiveVendorId(null); setError(null); }} disabled={claimingId === vendor.id} className="btn btn-outline min-h-11">Cancel</button></div>
                  </div>
                ) : <button type="button" onClick={() => { setActiveVendorId(vendor.id); setError(null); }} disabled={success !== null} className="btn btn-primary mt-6 min-h-11 whitespace-nowrap">Continue to claim <ArrowRight size={15} aria-hidden="true" /></button>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function humanize(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}
