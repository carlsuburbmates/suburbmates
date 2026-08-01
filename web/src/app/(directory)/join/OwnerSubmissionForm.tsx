"use client";

import { useActionState, useEffect, useRef } from "react";
import Link from "next/link";
import { submitOwnedBusinessAction, type OwnerSubmissionState } from "./actions";
import { CategoryField, SubmitButton, TurnstileField } from "./JoinFormControls";

type Option = { name: string; slug: string };

export function OwnerSubmissionForm({ categories, suburbs, siteKey, email }: { categories: Option[]; suburbs: Option[]; siteKey: string; email: string }) {
  const [state, formAction] = useActionState(submitOwnedBusinessAction, { status: "idle", attempt: 0 });
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.status === "success") formRef.current?.reset(); }, [state.status]);

  return <form ref={formRef} action={formAction} className="mt-6 grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">
    <div className="hidden" aria-hidden="true"><label>Leave empty<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label></div>
    {state.status === "success" && <Outcome state={state} />}
    {state.status === "error" && <Outcome state={state} />}
    <Field label="Your name" name="submitterName" required maxLength={120} autoComplete="name" />
    <p className="min-w-0 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">Signed in as <strong>{email}</strong>. This email is used only for your private request status.</p>
    <Field label="Business name" name="businessName" required maxLength={200} autoComplete="organization" />
    <CategoryField options={categories} />
    <Select label="Location" name="suburbSlug" options={suburbs} />
    <Field label="Business email (optional)" name="contactEmail" type="email" maxLength={254} autoComplete="email" />
    <Field label="Phone (optional)" name="phone" type="tel" maxLength={40} autoComplete="tel" />
    <Field label="Website (optional)" name="website" type="text" inputMode="url" maxLength={500} placeholder="dogtrainersdirectory.com.au" />
    <p className="text-sm text-slate-600 sm:col-span-2">Provide at least one way customers can contact this business: email, phone, or website. A website can be entered with or without `https://`.</p>
    <Field label="ABN (optional)" name="abn" maxLength={14} placeholder="11 digits" />
    <Field label="Street address (optional)" name="streetAddress" maxLength={500} autoComplete="street-address" />
    <label className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-700 sm:col-span-2"><input name="consent" type="checkbox" required className="mt-1 h-4 w-4 shrink-0" /><span>I confirm these are genuine business details and that I am authorised to request ownership review. SuburbMates may review the details and evidence under its <Link href="/privacy" className="font-bold underline">privacy notice</Link>.</span></label>
    <TurnstileField key={`owner-turnstile-${state.attempt}`} siteKey={siteKey} />
    <div className="sm:col-span-2"><SubmitButton pendingLabel="Submitting securely…">Submit business and ownership request</SubmitButton></div>
  </form>;
}

function Outcome({ state }: { state: OwnerSubmissionState }) {
  if (state.status === "success") return <p className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm font-semibold text-green-800 sm:col-span-2" role="status">Your business candidate and ownership request were received for review. They remain private and pending until an operator decides.</p>;
  const message: Record<NonNullable<OwnerSubmissionState["code"]>, string> = {
    invalid: "Check the highlighted requirements and try again. Your entered details are still here.",
    duplicate: "A matching listing appears to exist. Search the directory and use the claim process instead.",
    rate_limit: "Too many submissions were made recently. Please try again later.",
    verification: "Human verification was not completed. Your entered details are still here; refresh verification and submit again.",
    verification_unavailable: "Human verification is temporarily unavailable. Your entered details are still here; refresh verification and try again.",
    submit: "The request could not be saved. Your entered details are still here; please try again.",
  };
  return <p className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800 sm:col-span-2" role="alert">{message[state.code ?? "submit"]}</p>;
}

function Field({ label, name, type = "text", required, maxLength, autoComplete, placeholder, inputMode }: { label: string; name: string; type?: string; required?: boolean; maxLength: number; autoComplete?: string; placeholder?: string; inputMode?: "url" | "email" | "tel" | "text" }) {
  return <label className="block min-w-0 text-sm font-bold">{label}<input name={name} type={type} inputMode={inputMode} required={required} maxLength={maxLength} autoComplete={autoComplete} placeholder={placeholder} className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 p-3 font-normal" /></label>;
}

function Select({ label, name, options }: { label: string; name: string; options: Option[] }) {
  return <label className="block min-w-0 text-sm font-bold">{label}<select name={name} required defaultValue="" className="mt-2 block w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="" disabled>Choose one</option>{options.map((option) => <option key={option.slug} value={option.slug}>{option.name}</option>)}</select></label>;
}
