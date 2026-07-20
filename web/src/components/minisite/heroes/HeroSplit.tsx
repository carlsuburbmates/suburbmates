import { MapPin, Shield, CheckCircle, Phone } from "lucide-react";
import type { MinisiteVendor, VendorDesign } from "@/lib/minisite/engine";

export function HeroSplit({ data, styling }: { data: MinisiteVendor; styling: VendorDesign }) {
  const { palette, corners } = styling;
  
  return (
    <section className={`${palette.heroBg} text-white py-24 px-6 relative overflow-hidden`}>
      <div className="absolute inset-0 opacity-20">
        <div className={`absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br ${palette.heroGlow} to-transparent blur-3xl mix-blend-overlay`} />
      </div>
      <div className="max-w-5xl mx-auto relative z-10 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="flex flex-wrap items-center justify-start gap-3 mb-6">

            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur-sm">
              <MapPin size={14} /> {data.suburbs?.name}, VIC
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-tight mb-6">
            {data.business_name}
          </h1>
          <p className="text-lg md:text-xl text-white/80 font-light leading-relaxed mb-8 max-w-xl">
            A local {data.categories?.name?.toLowerCase()} listing in {data.suburbs?.name}. View the available details or contact the business directly.
          </p>
          <div className="flex flex-wrap justify-start gap-4">
            {data.phone && (
              <a href={`tel:${data.phone}`} className={`px-8 py-4 font-bold transition-colors flex items-center gap-2 ${corners.btn} bg-white text-black hover:bg-slate-100`}>
                <Phone size={18} /> Call Now
              </a>
            )}
            <a href="#about" className={`px-8 py-4 font-bold transition-colors border ${corners.btn} bg-white/10 text-white border-white/20 hover:bg-white/20`}>
              Learn More
            </a>
          </div>
        </div>
        <div className="hidden md:block">
          <div className={`bg-white/5 border border-white/10 p-8 backdrop-blur-md ${corners.container}`}>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <Shield size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Public Directory Profile</h3>
                  <p className="text-white/60 text-sm mt-1">Available business information is shown transparently in one place.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{data.is_claimed ? "Profile ownership recorded" : "Ownership available to claim"}</h3>
                  <p className="text-white/60 text-sm mt-1">
                    {data.is_claimed
                      ? "The recorded owner can submit profile changes for review. This does not verify every public fact."
                      : "The business owner can submit an evidence-backed ownership request."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
