"use client";

import { useState } from "react";
import { BadgeCheck, Camera, ImagePlus, ShieldCheck } from "lucide-react";

export default function MediaProposalForm({ vendorId }: { vendorId: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(null);
    const response = await fetch("/api/owner/media", { method: "POST", body: new FormData(event.currentTarget) });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(response.ok ? "Your image is private and awaiting operator review. It is not public yet." : body.error || "We could not submit this image.");
    if (response.ok) event.currentTarget.reset();
  }
  return <form onSubmit={submit} className="mt-6 space-y-5 border-t border-slate-100 pt-6">
    <div className="rounded-2xl border border-teal-900/10 bg-teal-50/70 p-5">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-teal-800 shadow-sm"><Camera size={20} aria-hidden="true" /></span><div><h4 className="font-black text-slate-950">Add a real visual to this profile</h4><p className="mt-1 text-sm leading-6 text-slate-600">Use a logo, storefront, team or work image that you own or are authorised to share. It remains private until an operator reviews it.</p></div></div>
      <div className="mt-4 grid gap-2 text-xs font-semibold text-teal-950 sm:grid-cols-3"><p className="flex items-center gap-2"><ImagePlus size={15} aria-hidden="true" /> JPEG, PNG or WebP</p><p className="flex items-center gap-2"><BadgeCheck size={15} aria-hidden="true" /> Up to 2 MB</p><p className="flex items-center gap-2"><ShieldCheck size={15} aria-hidden="true" /> Review first</p></div>
    </div>
    <input type="hidden" name="vendorId" value={vendorId} />
    <div className="grid gap-5 sm:grid-cols-2">
      <label className="block text-sm font-bold text-slate-800">Image type<select name="mediaKind" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal text-slate-900 outline-none transition focus:border-teal-800 focus:ring-2 focus:ring-teal-800"><option value="logo">Logo</option><option value="listing_image">Listing image</option></select></label>
      <label className="block text-sm font-bold text-slate-800">Image file<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal text-slate-700 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:font-bold file:text-teal-900 focus:border-teal-800 focus:ring-2 focus:ring-teal-800" /></label>
    </div>
    <label className="block text-sm font-bold text-slate-800">Describe the image<input name="altText" required minLength={2} maxLength={160} placeholder="For example: Front entrance of Example Services" className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal text-slate-900 outline-none transition focus:border-teal-800 focus:ring-2 focus:ring-teal-800" /></label>
    <label className="block text-sm font-bold text-slate-800">Permission to use it<textarea name="sourceBasis" required minLength={10} maxLength={1000} rows={3} placeholder="For example: I own this logo and authorise SuburbMates to display it on this listing." className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 font-normal text-slate-900 outline-none transition focus:border-teal-800 focus:ring-2 focus:ring-teal-800" /></label>
    {message && <p role="status" className={`rounded-xl border p-4 text-sm ${message.startsWith("Your image") ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>{message}</p>}
    <button disabled={pending} className="btn btn-primary min-h-11">{pending ? "Submitting…" : "Submit for review"}</button>
  </form>;
}
