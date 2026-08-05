"use client";

import Link from "next/link";
import { submitContactAction } from "./actions";
import { SubmitButton, TurnstileField } from "../join/JoinFormControls";

export function ContactForm({ siteKey, initialTopic, initialBusiness }: { siteKey: string; initialTopic: string; initialBusiness: string }) {
  return <form action={submitContactAction} className="mt-6 space-y-5">
    <div className="hidden" aria-hidden="true">
      <label htmlFor="website">Leave this field empty</label>
      <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Your name" name="requesterName" required minLength={2} maxLength={120} autoComplete="name" />
      <Field label="Reply email" name="requesterEmail" type="email" required maxLength={254} autoComplete="email" />
    </div>

    <label className="block min-w-0 text-sm font-bold">What do you need help with?
      <select name="topic" required defaultValue={initialTopic} className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 font-normal">
        <option value="general">General support</option>
        <option value="listing_correction">Correct a listing</option>
        <option value="claim_help">Claim help</option>
        <option value="privacy">Privacy request</option>
        <option value="technical">Technical problem</option>
        <option value="partnership">Partnership</option>
        <option value="other">Something else</option>
      </select>
    </label>

    <Field label="Business name (optional)" name="businessName" maxLength={200} autoComplete="organization" defaultValue={initialBusiness} />
    <label className="block min-w-0 text-sm font-bold">Message
      <textarea name="message" required minLength={10} maxLength={4000} rows={7} className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 p-3 font-normal" />
    </label>

    <label className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-700">
      <input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0" />
      <span>I agree that SuburbMates may use these details to review and respond to this request as described in the <Link href="/privacy" className="font-bold underline">privacy notice</Link>.</span>
    </label>

    <TurnstileField siteKey={siteKey} action="contact" />
    <SubmitButton pendingLabel="Sending securely…">Send support request</SubmitButton>
  </form>;
}

function Field({ label, name, type = "text", required, minLength, maxLength, autoComplete, defaultValue }: { label: string; name: string; type?: string; required?: boolean; minLength?: number; maxLength: number; autoComplete?: string; defaultValue?: string }) {
  return <label className="block min-w-0 text-sm font-bold">{label}
    <input name={name} type={type} required={required} minLength={minLength} maxLength={maxLength} autoComplete={autoComplete} defaultValue={defaultValue} className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 p-3 font-normal" />
  </label>;
}
