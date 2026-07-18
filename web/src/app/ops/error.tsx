"use client";

import Link from "next/link";

export default function OpsError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-8">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-900">Operations</p>
      <h2 className="mt-2 text-3xl font-black tracking-tight">This view could not be loaded</h2>
      <p className="mt-3 max-w-2xl text-slate-700">No listing, claim, or contact request has changed. Try again. If this keeps happening, return to the overview and check the System page.</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">Try again</button>
        <Link href="/ops" className="btn btn-outline">Open overview</Link>
      </div>
    </section>
  );
}
