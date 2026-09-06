import { createClient } from "@/utils/supabase/server";
import ClaimClient from "./ClaimClient";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Camera, Search } from "lucide-react";
import type { ReactNode } from "react";
import { OwnerPilotInvitation } from "@/components/ui/OwnerPilotInvitation";

export const metadata = {
  title: "Claim Your Business | SuburbMates",
};

export default async function ClaimPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  const selectedListingId = typeof listing === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listing) ? listing : null;
  const claimPath = selectedListingId ? `/claim?listing=${selectedListingId}` : "/claim";
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return (
      <main className="min-h-screen bg-[#f5f7f3] px-5 py-6 text-slate-900 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/businesses"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700 underline decoration-teal-800/35 underline-offset-4 transition hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Back to the directory
          </Link>
          <section className="mt-6 rounded-3xl bg-[#073b3a] px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">For business owners and representatives</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Ready to claim this business?</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-teal-50 sm:text-base">Claims are review-first. They never change a public profile or grant ownership automatically.</p>
          </section>
          <div className="mt-6">
            <OwnerPilotInvitation href="#claim-access" />
          </div>
          <section id="claim-access" className="mt-6 grid scroll-mt-6 gap-4 sm:grid-cols-2" aria-label="Claim access options">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Already authorised?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Sign in with the existing account linked to the business email. An email match supports review; it does not approve a claim by itself.</p>
              <Link href={`/login?next=${encodeURIComponent(claimPath)}`} className="btn btn-primary mt-6 min-h-11">Sign in to claim</Link>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">New to SuburbMates?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Create secure owner access with an email code, then submit your claim for review. An account identifies you; it does not grant ownership, edit the listing or publish anything.</p>
              <Link href={`/claim/access${selectedListingId ? `?listing=${selectedListingId}` : ""}`} className="btn btn-outline mt-6 min-h-11">Create owner access</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f7f3] px-5 py-6 text-slate-900 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/businesses"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700 underline decoration-teal-800/35 underline-offset-4 transition hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to the directory
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl bg-[#073b3a] px-6 py-8 text-white shadow-sm sm:px-9 sm:py-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">
            SuburbMates for business owners
          </p>
          <h1 className="mt-3 max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">
            Claim it, then make it useful.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-teal-50 sm:text-base">
            A claim lets you propose accurate contact details, a clear business story and real imagery.
            Every change is reviewed before it appears publicly.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <ClaimStep icon={<Search size={18} aria-hidden="true" />} label="1. Find your listing" />
            <ClaimStep icon={<BadgeCheck size={18} aria-hidden="true" />} label="2. Support your claim" />
            <ClaimStep icon={<Camera size={18} aria-hidden="true" />} label="3. Improve your profile" />
          </div>
        </section>

        <div className="mt-6">
          <OwnerPilotInvitation href="#claim-workspace" />
        </div>

        <section id="claim-workspace" className="mt-6 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <ClaimClient selectedListingId={selectedListingId} />
        </section>
      </div>
    </main>
  );
}

function ClaimStep({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-teal-50">{icon}</span>
      {label}
    </div>
  );
}
