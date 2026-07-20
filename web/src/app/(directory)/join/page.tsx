import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { runtimeEnv } from "@/lib/runtime-env";
import { createClient } from "@/utils/supabase/server";
import { submitBusinessAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "List Your Business | SuburbMates",
  description: "Submit a local business for review or claim an existing SuburbMates listing.",
  alternates: { canonical: "/join" },
};

export default async function JoinPage({ searchParams }: {
  searchParams: Promise<{ submitted?: string; error?: string; q?: string; suburb?: string; add?: string }>;
}) {
  const message = await searchParams;
  const siteKey = runtimeEnv("TURNSTILE_SITE_KEY");
  const supabase = await createClient();
  const [categoriesResult, suburbsResult] = await Promise.all([
    supabase.from("categories").select("name, slug").order("name"),
    supabase.from("suburbs").select("name, slug").order("name"),
  ]);
  if (categoriesResult.error || suburbsResult.error) throw new Error("Business submission options could not be loaded.");
  const query = typeof message.q === "string" ? message.q.trim().slice(0, 200) : "";
  const suburb = typeof message.suburb === "string" ? message.suburb : "";
  let matches: { id: string; business_name: string; suburb_slug: string; category_slug: string }[] = [];
  if (query.length >= 2 && suburb) {
    const { data } = await supabase.from("published_vendors").select("id, business_name, suburb_slug, category_slug")
      .ilike("business_name", `%${query.replace(/[%_\\]/g, "\\$&")}%`).eq("suburb_slug", suburb).order("business_name").limit(5);
    matches = data ?? [];
  }
  const showAddForm = message.add === "1" || (query.length >= 2 && suburb && matches.length === 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">For business owners and representatives</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Find your business first</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">Search SuburbMates before you claim a profile or add a missing business.</p>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/70 p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-black">Is your business already listed?</h2>
        <form className="mt-5 grid gap-3 sm:grid-cols-[1fr_220px_auto]" action="/join">
          <input name="q" required minLength={2} defaultValue={query} placeholder="Business name" className="rounded-xl border border-slate-300 bg-white px-4 py-3" />
          <select name="suburb" required defaultValue={suburb} className="rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">Choose a suburb</option>{(suburbsResult.data ?? []).map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select>
          <button className="btn btn-primary whitespace-nowrap">Search</button>
        </form>
      </section>

      {query.length >= 2 && suburb && (
        <section className="mt-6" aria-live="polite">
          {matches.length > 0 ? <><h2 className="text-xl font-black">Is this your business?</h2><div className="mt-4 grid gap-3">{matches.map((match) => <article key={match.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-black">{match.business_name}</p><p className="mt-1 text-sm text-slate-600">{match.category_slug.replaceAll("-", " ")} · {match.suburb_slug.replaceAll("-", " ")}</p><Link href="/claim" className="btn btn-primary mt-4">Claim this profile</Link></article>)}</div><p className="mt-4 text-sm text-slate-600">Not your business? <Link href={`/join?add=1&q=${encodeURIComponent(query)}&suburb=${encodeURIComponent(suburb)}`} className="font-bold underline">Add a missing business instead</Link>.</p></> : <><h2 className="text-xl font-black">No likely match found</h2><p className="mt-2 text-slate-600">Try another spelling or suburb. If it is still missing, you can add it for private review.</p><Link href={`/join?add=1&q=${encodeURIComponent(query)}&suburb=${encodeURIComponent(suburb)}`} className="btn btn-primary mt-4">Add a missing business</Link></>}
        </section>
      )}

      {showAddForm && <section id="missing-business" className="mt-8 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-black">Submit a missing business</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Submission does not publish a listing or assign ownership. An operator reviews the original facts before any public change.</p>
        {message.submitted === "1" && <p className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800" role="status">Submission received for review. It is not public yet.</p>}
        {message.error && <p className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{submissionError(message.error)}</p>}

        {!siteKey ? <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Secure business submission is temporarily unavailable. You can still search and claim an existing listing.</p> : (
          <form action={submitBusinessAction} className="mt-6 grid gap-5 sm:grid-cols-2">
            <div className="hidden" aria-hidden="true"><label>Leave empty<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label></div>
            <Field label="Your name" name="submitterName" required maxLength={120} autoComplete="name" />
            <Field label="Business name" name="businessName" required maxLength={200} autoComplete="organization" />
            <Select label="Category" name="categorySlug" options={categoriesResult.data ?? []} />
            <Select label="Location" name="suburbSlug" options={suburbsResult.data ?? []} />
            <Field label="Business contact email" name="contactEmail" type="email" required maxLength={254} autoComplete="email" />
            <Field label="Phone (optional)" name="phone" type="tel" maxLength={40} autoComplete="tel" />
            <Field label="Website (optional, HTTPS)" name="website" type="url" maxLength={500} placeholder="https://" />
            <Field label="Street address (optional)" name="streetAddress" maxLength={500} autoComplete="street-address" />
            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700 sm:col-span-2"><input name="consent" type="checkbox" required className="mt-1 h-4 w-4" /><span>I confirm these are genuine business details and agree that SuburbMates may review them for directory publication as described in the <Link href="/privacy" className="font-bold underline">privacy notice</Link>.</span></label>
            <div className="sm:col-span-2"><div className="cf-turnstile" data-sitekey={siteKey} data-action="business_submission" data-theme="light" /></div>
            <div className="sm:col-span-2"><button className="btn btn-primary">Submit for review</button></div>
          </form>
        )}
      </section>}
      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />}
    </div>
  );
}

function Field({ label, name, type = "text", required, maxLength, autoComplete, placeholder }: { label: string; name: string; type?: string; required?: boolean; maxLength: number; autoComplete?: string; placeholder?: string }) {
  return <label className="text-sm font-bold">{label}<input name={name} type={type} required={required} maxLength={maxLength} autoComplete={autoComplete} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" /></label>;
}
function Select({ label, name, options }: { label: string; name: string; options: { name: string; slug: string }[] }) {
  return <label className="text-sm font-bold">{label}<select name={name} required defaultValue="" className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="" disabled>Choose one</option>{options.map((option) => <option key={option.slug} value={option.slug}>{option.name}</option>)}</select></label>;
}
function submissionError(code: string) {
  if (code === "invalid") return "Check every required field, use an HTTPS website if supplied, confirm the declaration, and try again.";
  if (code === "duplicate") return "A matching listing appears to exist. Search the directory and use the claim process instead.";
  if (code === "rate_limit") return "Too many submissions were made recently. Please try again later.";
  if (code === "verification_unavailable") return "Human verification is temporarily unavailable. Please try again shortly.";
  if (code === "verification") return "Human verification was not completed. Refresh the page and try again.";
  return "The submission could not be saved. Please try again.";
}
