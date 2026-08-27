import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How SuburbMates Works",
  description:
    "How SuburbMates lists local businesses, handles ownership claims and reviews profile changes.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        A simple local directory
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
        How SuburbMates works
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
        Find a business, open its public profile, then contact it directly.
        Ownership and correction requests are reviewed privately.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        <Step number="1" title="Find">
          Search by business name or service, then narrow by suburb when useful.
        </Step>
        <Step number="2" title="Open the profile">
          See the available public details and contact the business directly.
        </Step>
        <Step number="3" title="Claim or correct">
          Owners can claim a matching profile and propose reviewed updates.
          Nothing changes automatically.
        </Step>
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/businesses" className="btn btn-primary">
          Browse businesses
        </Link>
        <Link href="/claim" className="btn btn-outline">
          Request ownership
        </Link>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
        {number}
      </p>
      <h2 className="mt-5 text-xl font-black">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">{children}</p>
    </section>
  );
}
