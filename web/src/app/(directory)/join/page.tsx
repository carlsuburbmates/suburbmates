import type { Metadata } from "next";
import Link from "next/link";
import { runtimeEnv } from "@/lib/runtime-env";
import { createClient } from "@/utils/supabase/server";
import { submitBusinessAction } from "./actions";
import { CategoryField, SubmitButton, TurnstileField } from "./JoinFormControls";
import { OwnerSubmissionForm } from "./OwnerSubmissionForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "List Your Business | SuburbMates",
  description: "Submit a local business for review or claim an existing SuburbMates listing.",
  alternates: { canonical: "/join" },
};

export default async function JoinPage({ searchParams }: {
  searchParams: Promise<{ submitted?: string; error?: string; q?: string; suburb?: string; add?: string; choose?: string; path?: string }>;
}) {
  const message = await searchParams;
  const siteKey = runtimeEnv("TURNSTILE_SITE_KEY");
  const supabase = await createClient();
  const [categoriesResult, suburbsResult, authResult] = await Promise.all([
    supabase.from("categories").select("name, slug").order("name"),
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase.auth.getUser(),
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
  const path = message.path === "owner" ? "owner" : message.path === "suggest" || message.add === "1" ? "suggest" : null;
  const showPathChoice = query.length >= 2 && suburb && (matches.length === 0 || message.choose === "1") && !path;
  const showSuggestionForm = path === "suggest";
  const showOwnerForm = path === "owner";
  const choiceHref = (selectedPath: "owner" | "suggest") => `/join?path=${selectedPath}&q=${encodeURIComponent(query)}&suburb=${encodeURIComponent(suburb)}`;
  const returnToChoice = `/join?choose=1&q=${encodeURIComponent(query)}&suburb=${encodeURIComponent(suburb)}`;

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
          {matches.length > 0 ? <><h2 className="text-xl font-black">Is this your business?</h2><div className="mt-4 grid gap-3">{matches.map((match) => <article key={match.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="font-black">{match.business_name}</p><p className="mt-1 text-sm text-slate-600">{match.category_slug.replaceAll("-", " ")} · {match.suburb_slug.replaceAll("-", " ")}</p><Link href={`/claim?listing=${encodeURIComponent(match.id)}`} className="btn btn-primary mt-4">Claim this profile</Link></article>)}</div><p className="mt-4 text-sm text-slate-600">Not the business you meant? <Link href={returnToChoice} className="font-bold underline">Add a missing business instead</Link>.</p></> : <><h2 className="text-xl font-black">No likely match found</h2><p className="mt-2 text-slate-600">Try another spelling or suburb. If it is still missing, choose the route that matches why you are adding it.</p></>}
        </section>
      )}

      {showPathChoice && <section className="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Choose your missing business path">
        <Link href={choiceHref("owner")} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">I own or represent it</p>
          <h2 className="mt-2 text-xl font-black">Add my business and request ownership</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Sign in, submit the missing business, and provide your connection. Both the listing and ownership request stay private for manual review.</p>
          <span className="mt-4 inline-block font-bold text-indigo-700 group-hover:underline">Continue as owner or representative →</span>
        </Link>
        <Link href={choiceHref("suggest")} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-indigo-300 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-600">I am suggesting it</p>
          <h2 className="mt-2 text-xl font-black">Suggest a local business</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">No sign-in is needed. Share accurate, reachable business details and the candidate stays private while an operator reviews it; this does not create ownership.</p>
          <span className="mt-4 inline-block font-bold text-indigo-700 group-hover:underline">Continue as a community suggester →</span>
        </Link>
      </section>}

      {showSuggestionForm && <section id="missing-business" className="mt-8 scroll-mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Suggest a local business</p>
        <h2 className="mt-2 text-2xl font-black">Submit a missing business</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Submission does not publish a listing or assign ownership. An operator reviews the original facts before any public change.</p>
        {message.submitted === "1" && <p className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800" role="status">Submission received for review. It is not public yet. You do not need an account to submit. If you want to check its private status later, you can optionally <Link href="/login?next=/dashboard" className="underline">sign in with the email you provided</Link>.</p>}
        {message.error && <p className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{submissionError(message.error)}</p>}

        {!siteKey ? <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Secure business submission is temporarily unavailable. You can still search and claim an existing listing.</p> : (
          <form action={submitBusinessAction} className="mt-6 grid min-w-0 gap-5 sm:grid-cols-2">
            <div className="hidden" aria-hidden="true"><label>Leave empty<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label></div>
            <Field label="Your name" name="submitterName" required maxLength={120} autoComplete="name" />
            <div><Field label="Your email" name="submitterEmail" type="email" required maxLength={254} autoComplete="email" /><p className="mt-2 text-xs font-normal leading-5 text-slate-600">No account is created. This is only used if you later choose to check the private submission status.</p></div>
            <Field label="Business name" name="businessName" required maxLength={200} autoComplete="organization" />
            <CategoryField options={categoriesResult.data ?? []} />
            <Select label="Location" name="suburbSlug" options={suburbsResult.data ?? []} />
            <Field label="Business email (optional)" name="contactEmail" type="email" maxLength={254} autoComplete="email" />
            <Field label="Phone (optional)" name="phone" type="tel" maxLength={40} autoComplete="tel" />
            <Field label="Website (optional)" name="website" type="text" inputMode="url" maxLength={500} placeholder="dogtrainersdirectory.com.au" />
            <p className="text-sm text-slate-600 sm:col-span-2">Provide at least one way customers can contact this business: email, phone, or website. A website can be entered with or without `https://`.</p>
            <Field label="ABN (optional)" name="abn" maxLength={14} placeholder="11 digits" />
            <Field label="Street address (optional)" name="streetAddress" maxLength={500} autoComplete="street-address" />
            <label className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-700 sm:col-span-2"><input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0" /><span>I confirm these are genuine business details and agree that SuburbMates may review them for directory publication as described in the <Link href="/privacy" className="font-bold underline">privacy notice</Link>.</span></label>
            <TurnstileField siteKey={siteKey} />
            <div className="sm:col-span-2"><SubmitButton pendingLabel="Submitting securely…">Submit for review</SubmitButton></div>
          </form>
        )}
      </section>}

      {showOwnerForm && <section id="owner-submission" className="mt-8 scroll-mt-6 rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Owner or authorised representative</p>
        <h2 className="mt-2 text-2xl font-black">Add this business and request ownership</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">This creates a private candidate and a pending ownership request together. An operator reviews both. It does not publish the business or give you ownership automatically.</p>
        {message.submitted === "1" && <p className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800" role="status">Your business candidate and ownership request were received for review. They remain private and pending until an operator decides.</p>}
        {message.error && <p className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{submissionError(message.error)}</p>}
        {!authResult.data.user?.email ? <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-black">Sign in to continue</h3><p className="mt-2 text-sm leading-6 text-slate-600">Your pending ownership request must be attached to your account so you can track it privately. Signing in does not approve ownership.</p><Link href={`/login?next=${encodeURIComponent(`/join?path=owner&q=${encodeURIComponent(query)}&suburb=${encodeURIComponent(suburb)}`)}`} className="btn btn-primary mt-4">Sign in to continue</Link></div> : !siteKey ? <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Secure business submission is temporarily unavailable. Please try again shortly.</p> : (
          <OwnerSubmissionForm categories={categoriesResult.data ?? []} suburbs={suburbsResult.data ?? []} siteKey={siteKey} email={authResult.data.user.email} />
        )}
      </section>}
    </div>
  );
}

function Field({ label, name, type = "text", required, maxLength, autoComplete, placeholder, inputMode }: { label: string; name: string; type?: string; required?: boolean; maxLength: number; autoComplete?: string; placeholder?: string; inputMode?: "url" | "email" | "tel" | "text" }) {
  return <label className="block min-w-0 text-sm font-bold">{label}<input name={name} type={type} inputMode={inputMode} required={required} maxLength={maxLength} autoComplete={autoComplete} placeholder={placeholder} className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 p-3 font-normal" /></label>;
}
function Select({ label, name, options }: { label: string; name: string; options: { name: string; slug: string }[] }) {
  return <label className="block min-w-0 text-sm font-bold">{label}<select name={name} required defaultValue="" className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="" disabled>Choose one</option>{options.map((option) => <option key={option.slug} value={option.slug}>{option.name}</option>)}</select></label>;
}
function submissionError(code: string) {
  if (code === "invalid") return "Check every required field, use an HTTPS website if supplied, confirm the declaration, and try again.";
  if (code === "duplicate") return "A matching listing appears to exist. Search the directory and use the claim process instead.";
  if (code === "rate_limit") return "Too many submissions were made recently. Please try again later.";
  if (code === "verification_unavailable") return "Human verification is temporarily unavailable. Please try again shortly.";
  if (code === "verification") return "Human verification was not completed. Refresh the page and try again.";
  return "The submission could not be saved. Please try again.";
}
