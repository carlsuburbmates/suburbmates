"use client";

import Image from "next/image";
import { useState } from "react";

type ImageCandidate = {
  url: string;
  mediaKind: "logo" | "listing_image";
  altText: string;
};

export default function WebsiteMediaProposalForm({ vendorId, website }: { vendorId: string; website: string | null }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [authorised, setAuthorised] = useState(false);
  const [candidates, setCandidates] = useState<ImageCandidate[]>([]);
  const [originUrl, setOriginUrl] = useState("");
  const [mediaKind, setMediaKind] = useState<"logo" | "listing_image">("listing_image");
  const [altText, setAltText] = useState("");
  if (!website) return null;

  async function loadCandidates() {
    setLoadingCandidates(true);
    setMessage(null);
    const response = await fetch(`/api/owner/website-preview?vendorId=${encodeURIComponent(vendorId)}`, { cache: "no-store" });
    const body = await response.json().catch(() => ({})) as { preview?: { imageCandidates?: ImageCandidate[] }; error?: string };
    setLoadingCandidates(false);
    if (!response.ok) {
      setMessage(body.error || "We could not inspect that website safely.");
      return;
    }
    const nextCandidates = body.preview?.imageCandidates ?? [];
    setCandidates(nextCandidates);
    setMessage(nextCandidates.length > 0 ? null : "No suitable same-domain website images were found. You can still paste an image URL or upload a file.");
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const response = await fetch("/api/owner/media/from-website", { method: "POST", body: new FormData(event.currentTarget) });
    const body = await response.json().catch(() => ({}));
    setPending(false);
    setMessage(response.ok ? "Your website image is private and awaiting operator review." : body.error || "We could not retrieve that image.");
    if (response.ok) window.location.assign(`/dashboard?media=submitted#media-${vendorId}`);
  }

  const chooseCandidate = (candidate: ImageCandidate) => {
    setOriginUrl(candidate.url);
    setMediaKind(candidate.mediaKind);
    setAltText(candidate.altText);
  };

  return (
    <form onSubmit={submit} className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="font-black text-slate-950">Choose an image from your website</h4>
      <p className="mt-1 text-sm leading-6 text-slate-600">SuburbMates can privately preview up to six suitable images from your recorded website. Choose one, confirm the business has reuse rights, and it will be copied privately for operator review before publication.</p>
      <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs leading-5 text-slate-700">
        <input type="checkbox" checked={authorised} onChange={(event) => setAuthorised(event.target.checked)} className="mt-1 size-4 rounded border-slate-400 text-teal-800 focus:ring-teal-800" />
        <span>I am authorised to ask SuburbMates to preview same-domain images from this business website.</span>
      </label>
      <button type="button" onClick={loadCandidates} disabled={!authorised || loadingCandidates} className="btn btn-outline mt-4 min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">
        {loadingCandidates ? "Finding images…" : "Find website images"}
      </button>
      {candidates.length > 0 && (
        <fieldset className="mt-5">
          <legend className="text-sm font-bold text-slate-800">Select an image</legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((candidate) => {
              const selected = candidate.url === originUrl;
              const previewParams = new URLSearchParams({ vendorId, originUrl: candidate.url });
              return (
                <button key={candidate.url} type="button" onClick={() => chooseCandidate(candidate)} aria-pressed={selected} className={`overflow-hidden rounded-xl border bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800 ${selected ? "border-teal-700 ring-2 ring-teal-700" : "border-slate-200 hover:border-teal-500"}`}>
                  <Image src={`/api/owner/media/website-preview?${previewParams.toString()}`} alt={candidate.altText} width={480} height={300} unoptimized className="h-36 w-full bg-slate-100 object-cover" />
                  <span className="block p-3 text-xs leading-5 text-slate-700"><strong>{candidate.mediaKind === "logo" ? "Logo" : "Listing image"}</strong><br />{candidate.altText}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
      <input type="hidden" name="vendorId" value={vendorId} />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold text-slate-800">Image URL<input required name="originUrl" type="url" value={originUrl} onChange={(event) => setOriginUrl(event.target.value)} placeholder="https://your-site/image.jpg" className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label>
        <label className="text-sm font-bold text-slate-800">Image type<select name="mediaKind" value={mediaKind} onChange={(event) => setMediaKind(event.target.value as "logo" | "listing_image")} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal"><option value="listing_image">Listing image</option><option value="logo">Logo</option></select></label>
      </div>
      <label className="mt-4 block text-sm font-bold text-slate-800">Describe the image<input required name="altText" value={altText} onChange={(event) => setAltText(event.target.value)} minLength={2} maxLength={160} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label>
      <label className="mt-4 block text-sm font-bold text-slate-800">Rights attestation<textarea required name="sourceBasis" minLength={10} maxLength={1000} rows={3} defaultValue="I confirm this business has permission to reuse this exact website image on its SuburbMates profile." className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 font-normal" /></label>
      {message && <p role="status" className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm">{message}</p>}
      <button disabled={pending} className="btn btn-primary mt-4 min-h-11">{pending ? "Retrieving…" : "Copy privately for review"}</button>
    </form>
  );
}
