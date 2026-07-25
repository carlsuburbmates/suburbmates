import type { Metadata } from "next";
import Link from "next/link";
import { verifyOpsAdmin } from "@/lib/ops/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Operations | SuburbMates",
  robots: { index: false, follow: false, nocache: true },
};

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const { user } = await verifyOpsAdmin("/ops");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-800 bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">SuburbMates</p>
            <h1 className="text-xl font-black">Operations</h1>
          </div>
          <nav aria-label="Operations" className="flex items-center gap-4 text-sm font-semibold">
            <Link href="/ops">Work</Link>
            <Link href="/ops/listings?status=all">Businesses</Link>
            <Link href="/ops/system">System</Link>
          </nav>
          <div className="flex w-full items-center gap-3 text-xs text-slate-400 sm:w-auto"><span>Signed in as {user.email ?? "operator"}</span><form action="/auth/signout" method="post"><button className="underline decoration-slate-500 underline-offset-4">Sign out</button></form></div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
