"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";

export type WebsiteProfilePreviewValues = {
  phone: string | null;
  email: string | null;
  tradingHours: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
};

type PreviewResponse = WebsiteProfilePreviewValues & { sourceUrl: string; checkedAt: string };

export function WebsiteProfilePreview({
  vendorId,
  website,
  currentValues,
  onApply,
}: {
  vendorId: string;
  website: string | null;
  currentValues: WebsiteProfilePreviewValues;
  onApply: (values: WebsiteProfilePreviewValues) => void;
}) {
  const [authorised, setAuthorised] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [selected, setSelected] = useState<Set<keyof WebsiteProfilePreviewValues>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    setApplied(false);
    try {
      const response = await fetch(`/api/owner/website-preview?vendorId=${encodeURIComponent(vendorId)}`, { cache: "no-store" });
      const body = await response.json() as { preview?: PreviewResponse; error?: string };
      if (!response.ok || !body.preview) throw new Error(body.error || "The website could not be previewed safely.");
      setPreview(body.preview);
      setSelected(new Set(
        (Object.keys(currentValues) as Array<keyof WebsiteProfilePreviewValues>)
          .filter((key) => Boolean(body.preview?.[key]) && !currentValues[key]),
      ));
    } catch (cause) {
      setPreview(null);
      setError(cause instanceof Error ? cause.message : "The website could not be previewed safely.");
    } finally {
      setLoading(false);
    }
  };

  if (!website) {
    return <p className="mt-3 text-xs leading-5 text-slate-500">Add your business website above first. Once it is reviewed, you can choose structured details to add to this form.</p>;
  }

  const available = preview
    ? (Object.entries({
      phone: preview.phone,
      email: preview.email,
      tradingHours: preview.tradingHours,
      facebookUrl: preview.facebookUrl,
      instagramUrl: preview.instagramUrl,
    }) as Array<[keyof WebsiteProfilePreviewValues, string | null]>).filter(([, value]) => Boolean(value))
    : [];
  const labels: Record<keyof WebsiteProfilePreviewValues, string> = {
    phone: "Phone",
    email: "Email",
    tradingHours: "Opening hours",
    facebookUrl: "Facebook profile",
    instagramUrl: "Instagram profile",
  };

  return (
    <section className="mt-5 rounded-2xl border border-teal-900/10 bg-teal-50/70 p-4" aria-label="Owner-authorised website detail preview">
      <div className="flex gap-3">
        <Sparkles className="mt-0.5 shrink-0 text-teal-800" size={18} aria-hidden="true" />
        <div>
          <h3 className="font-bold text-slate-950">Bring in structured details from your website</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">With your permission, SuburbMates reads only machine-readable contact, social-link and opening-hours fields from this recorded website. It never copies page text, images or HTML, and nothing is published automatically.</p>
        </div>
      </div>
      {!preview && (
        <label className="mt-4 flex cursor-pointer items-start gap-2 text-xs leading-5 text-slate-700">
          <input type="checkbox" checked={authorised} onChange={(event) => setAuthorised(event.target.checked)} className="mt-1 size-4 rounded border-slate-400 text-teal-800 focus:ring-teal-800" />
          <span>I am authorised to ask SuburbMates to read structured public details from this business website.</span>
        </label>
      )}
      {!preview && <button type="button" onClick={loadPreview} disabled={!authorised || loading} className="btn btn-outline mt-4 min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">{loading ? "Checking website…" : "Preview website details"}</button>}
      {error && <p className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-900"><AlertCircle size={16} className="shrink-0" aria-hidden="true" />{error}</p>}
      {preview && (
        <div className="mt-4">
          {available.length === 0 ? <p className="rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-600">No eligible structured contact or hours details were found. You can still enter accurate details yourself.</p> : <><p className="text-xs leading-5 text-slate-600">Select the details you want copied into the review form. Existing form values are never overwritten.</p><div className="mt-3 space-y-2">{available.map(([key, value]) => <label key={key} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800"><input type="checkbox" checked={selected.has(key)} disabled={Boolean(currentValues[key])} onChange={(event) => setSelected((previous) => { const next = new Set(previous); if (event.target.checked) next.add(key); else next.delete(key); return next; })} className="mt-1 size-4 rounded border-slate-400 text-teal-800 focus:ring-teal-800" /><span><strong>{labels[key]}</strong><br /><span className="break-words text-xs text-slate-600">{value}</span>{currentValues[key] && <span className="mt-1 block text-xs text-slate-500">Already present in this form.</span>}</span></label>)}</div><button type="button" onClick={() => { const values = Object.fromEntries((Object.keys(currentValues) as Array<keyof WebsiteProfilePreviewValues>).map((key) => [key, selected.has(key) && !currentValues[key] ? preview[key] : null])) as WebsiteProfilePreviewValues; onApply(values); setApplied(true); }} disabled={selected.size === 0} className="btn btn-primary mt-4 min-h-11 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60">Add selected details to form</button></>}
          {applied && <p role="status" className="mt-3 flex gap-2 text-xs font-semibold text-emerald-800"><CheckCircle2 size={16} aria-hidden="true" />Added to the form only. Submit the form below for review.</p>}
          <p className="mt-3 text-[11px] leading-5 text-slate-500">Checked from {new URL(preview.sourceUrl).hostname}. The preview is private and not retained by this tool.</p>
        </div>
      )}
    </section>
  );
}
