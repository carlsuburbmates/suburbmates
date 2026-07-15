import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";

export const metadata = {
  title: "List Your Business | SuburbMates",
  description: "Join SuburbMates to list your trade business. Free to join, direct contact, no middlemen.",
};

export default function JoinPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter">
          CLAIM YOUR <br className="hidden md:block" /> LOCAL TERRITORY
        </h1>
        <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
          SuburbMates is a zero-noise directory for local trades. No hidden phone numbers, no lead skimming, no middlemen.
        </p>

        <div className="grid md:grid-cols-2 gap-6 text-left max-w-2xl mx-auto pt-8 pb-12">
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <ShieldCheck size={32} className="text-black mb-4" />
            <h3 className="text-xl font-bold mb-2">Locals Only</h3>
            <p className="text-slate-600">Customers trust SuburbMates because we only list businesses that actually service their suburbs.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <Zap size={32} className="text-black mb-4" />
            <h3 className="text-xl font-bold mb-2">Direct Contact</h3>
            <p className="text-slate-600">Your phone number and website are displayed clearly. Customers deal directly with you.</p>
          </div>
        </div>

        <div>
          <Link href="/login?next=/dashboard" className="btn btn-primary inline-flex items-center gap-2 px-8 py-4 text-lg">
            <span>Sign In to Claim Your Business</span>
            <ArrowRight size={20} />
          </Link>
          <p className="text-sm text-slate-500 mt-4 font-medium">
            We use secure passwordless email sign-in.
          </p>
        </div>
      </div>
    </div>
  );
}
