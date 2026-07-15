import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact SuburbMates",
  description: "Get help with a SuburbMates business listing or ownership request.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
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
      <p className="mt-10 rounded-xl bg-slate-100 p-5 text-sm text-slate-700">A general support form is being added to the operator workflow. No unmonitored email address is published here.</p>
    </div>
  );
}
