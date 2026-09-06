import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { runtimeEnv } from "@/lib/runtime-env";
import { createClient } from "@/utils/supabase/server";
import { OwnerAccessForm } from "./OwnerAccessForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner Access | SuburbMates" };

export default async function OwnerAccessPage({ searchParams }: { searchParams: Promise<{ listing?: string }> }) {
  const { listing } = await searchParams;
  const listingId = typeof listing === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listing) ? listing : null;
  const claimPath = listingId ? `/claim?listing=${listingId}` : "/claim";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect(claimPath);
  const siteKey = runtimeEnv("TURNSTILE_SITE_KEY");

  return <main className="min-h-screen bg-[#f5f7f3] px-5 py-8 text-slate-950 sm:py-12"><div className="mx-auto max-w-2xl"><Link href={listingId ? `/claim?listing=${listingId}` : "/claim"} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-slate-700 underline underline-offset-4"><ArrowLeft size={16} aria-hidden="true" />Back to claim options</Link><section className="mt-6 rounded-3xl bg-[#073b3a] p-7 text-white shadow-sm sm:p-10"><ShieldCheck size={28} aria-hidden="true" /><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-teal-100">Secure owner access</p><h1 className="mt-2 text-4xl font-black tracking-tight">Start with your business email.</h1><p className="mt-4 leading-7 text-teal-50">Receive a one-time code, sign in, and submit the business claim for review. Account access never grants ownership by itself.</p></section><section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">{siteKey ? <OwnerAccessForm siteKey={siteKey} claimPath={claimPath} /> : <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Secure owner access is temporarily unavailable. You can still <Link href="/contact?topic=claim_help" className="font-bold underline">ask for private claim help</Link>.</p>}</section></div></main>;
}
