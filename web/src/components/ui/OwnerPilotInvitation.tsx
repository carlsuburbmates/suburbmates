import Link from "next/link";
import { ArrowRight, Camera, ListChecks, MousePointerClick } from "lucide-react";

export function OwnerPilotInvitation({ href, compact = false }: { href: string; compact?: boolean }) {
  return (
    <section className={`overflow-hidden rounded-3xl border border-amber-200 bg-[linear-gradient(135deg,#fff8e8_0%,#ffffff_52%,#e8f6f2_100%)] shadow-sm ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-800">Free founding profile pilot</p>
      <h2 className={`mt-2 font-black tracking-tight text-slate-950 ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>Turn your listing into a useful local profile.</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Claim your listing, then review useful services, hours and a factual summary, add real imagery you have permission to use, and give customers direct ways to contact or book with you.
      </p>
      {!compact && (
        <ul className="mt-5 grid gap-3 text-sm font-bold text-slate-800 sm:grid-cols-3">
          <li className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3"><ListChecks size={18} className="shrink-0 text-teal-800" aria-hidden="true" />Review richer business details</li>
          <li className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3"><Camera size={18} className="shrink-0 text-teal-800" aria-hidden="true" />Add rights-cleared real media</li>
          <li className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/80 bg-white/75 px-4 py-3"><MousePointerClick size={18} className="shrink-0 text-teal-800" aria-hidden="true" />Keep every customer action direct</li>
        </ul>
      )}
      <p className="mt-4 text-xs leading-5 text-slate-600">Pilot participation is free. It does not buy placement or change neutral search ranking, and nothing changes publicly until it is reviewed.</p>
      <Link href={href} className="btn btn-primary mt-5 min-h-11">Find and claim your profile <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>
  );
}
