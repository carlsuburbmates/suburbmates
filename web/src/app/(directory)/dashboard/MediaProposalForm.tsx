"use client";

import { useState } from "react";

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
  return <form onSubmit={submit} className="mt-6 space-y-4 border-t border-slate-100 pt-6">
    <div><h4 className="font-bold">Propose a logo or image</h4><p className="mt-1 text-sm text-slate-600">JPEG, PNG or WebP, up to 2 MB. It stays private until approved.</p></div>
    <input type="hidden" name="vendorId" value={vendorId} />
    <label className="block text-sm font-medium">Image type<select name="mediaKind" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-3"><option value="logo">Logo</option><option value="listing_image">Listing image</option></select></label>
    <label className="block text-sm font-medium">Image file<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className="mt-1 block w-full rounded-lg border border-slate-300 p-3" /></label>
    <label className="block text-sm font-medium">Describe the image<input name="altText" required minLength={2} maxLength={160} placeholder="For example: Front entrance of Example Services" className="mt-1 block w-full rounded-lg border border-slate-300 p-3" /></label>
    <label className="block text-sm font-medium">Permission to use it<textarea name="sourceBasis" required minLength={10} maxLength={1000} rows={3} placeholder="For example: I own this logo and authorise SuburbMates to display it on this listing." className="mt-1 block w-full rounded-lg border border-slate-300 p-3" /></label>
    {message && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
    <button disabled={pending} className="btn btn-outline">{pending ? "Submitting…" : "Submit for review"}</button>
  </form>;
}
