import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How SuburbMates Works",
  description: "How SuburbMates lists local businesses, handles ownership claims and reviews profile changes.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-4xl font-black tracking-tight">How SuburbMates works</h1>
      <p className="mt-5 max-w-2xl text-lg text-slate-600">SuburbMates is a public directory that helps people find and contact local businesses directly.</p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <Step number="1" title="Browse locally">Search by suburb or category and use the public contact details supplied for each listing.</Step>
        <Step number="2" title="Request ownership">A matching business email can support a claim request. It does not grant ownership automatically.</Step>
        <Step number="3" title="Reviewed updates">Approved owners can propose profile edits. The public listing changes only after review.</Step>
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/businesses" className="btn btn-primary">Browse businesses</Link>
        <Link href="/claim" className="btn btn-outline">Request ownership</Link>
      </div>
    </div>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-black">{number}</p><h2 className="mt-3 text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-600">{children}</p></section>;
}
