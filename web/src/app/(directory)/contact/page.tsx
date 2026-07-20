import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { runtimeEnv } from "@/lib/runtime-env";
import { submitContactAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contact SuburbMates",
  description: "Get help with a SuburbMates business listing or ownership request.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; topic?: string; business?: string }>;
}) {
  const message = await searchParams;
  const siteKey = runtimeEnv("TURNSTILE_SITE_KEY");
  const initialTopic = message.topic === "listing_correction" ? "listing_correction" : "general";
  const initialBusiness = typeof message.business === "string" ? message.business.slice(0, 200) : "";

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight">Contact SuburbMates</h1>
      <p className="mt-5 text-lg text-slate-600">Choose the path that matches what you need so the request reaches the right review queue.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold">Business owners</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Sign in using the business contact email to request ownership or manage an approved listing.</p>
          <Link href="/claim" className="btn btn-primary mt-6">Start a claim request</Link>
        </section>
        <section className="rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-xl font-bold">Finding a business</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">SuburbMates does not handle quotes or bookings. Contact the listed business directly from its profile.</p>
          <Link href="/businesses" className="btn btn-outline mt-6">Browse the directory</Link>
        </section>
      </div>

      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-2xl font-black">Send a support request</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Your request goes to the private SuburbMates operations queue. We use your details only to review and respond to this request.
        </p>

        {message.sent === "1" && (
          <p className="mt-5 rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800" role="status">
            Your request has been received. Keep this page for your records; an operator will review it.
          </p>
        )}
        {message.error && (
          <p className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
            {contactError(message.error)}
          </p>
        )}

        {!siteKey ? (
          <p className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
            The secure contact form is temporarily unavailable. Claim and listing links above remain available.
          </p>
        ) : (
          <form action={submitContactAction} className="mt-6 space-y-5">
            <div className="hidden" aria-hidden="true">
              <label htmlFor="website">Leave this field empty</label>
              <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-bold">
                Your name
                <input name="requesterName" required minLength={2} maxLength={120} autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" />
              </label>
              <label className="block text-sm font-bold">
                Reply email
                <input name="requesterEmail" type="email" required maxLength={254} autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" />
              </label>
            </div>

            <label className="block text-sm font-bold">
              What do you need help with?
              <select name="topic" required defaultValue={initialTopic} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal">
                <option value="general">General support</option>
                <option value="listing_correction">Correct a listing</option>
                <option value="claim_help">Claim help</option>
                <option value="privacy">Privacy request</option>
                <option value="technical">Technical problem</option>
                <option value="partnership">Partnership</option>
                <option value="other">Something else</option>
              </select>
            </label>

            <label className="block text-sm font-bold">
              Business name <span className="font-normal text-slate-500">(optional)</span>
              <input name="businessName" defaultValue={initialBusiness} maxLength={200} autoComplete="organization" className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" />
            </label>

            <label className="block text-sm font-bold">
              Message
              <textarea name="message" required minLength={10} maxLength={4000} rows={7} className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-normal" />
            </label>

            <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <input name="consent" type="checkbox" required className="mt-1 h-4 w-4" />
              <span>I agree that SuburbMates may use these details to review and respond to my request as described in the <Link href="/privacy" className="font-bold underline">privacy notice</Link>.</span>
            </label>

            <div className="cf-turnstile" data-sitekey={siteKey} data-action="contact" data-theme="light" />
            <button type="submit" className="btn btn-primary">Send support request</button>
          </form>
        )}
      </section>
      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />}
    </div>
  );
}

function contactError(code: string) {
  if (code === "invalid") return "Check each field, confirm consent, and try again.";
  if (code === "rate_limit") return "Too many requests were submitted recently. Please try again later.";
  if (code === "verification_unavailable") return "Human verification is temporarily unavailable. Please try again shortly.";
  if (code === "verification") return "Human verification was not completed. Refresh the page and try again.";
  return "Your request could not be saved. Please try again.";
}
