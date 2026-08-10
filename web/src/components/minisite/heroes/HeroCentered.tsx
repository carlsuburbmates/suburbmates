import { MapPin, Phone } from "lucide-react";
import type { MinisiteVendor, VendorDesign } from "@/lib/minisite/engine";

export function HeroCentered({ data, styling }: { data: MinisiteVendor; styling: VendorDesign }) {
  const { palette, corners } = styling;
  
  return (
    <section className={`${palette.heroBg} ${palette.heroText} py-32 px-6 relative overflow-hidden text-center flex flex-col items-center justify-center`}>
      <div className="absolute inset-0 opacity-30">
        <div className={`absolute -top-1/2 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-b ${palette.heroGlow} to-transparent blur-[100px] mix-blend-overlay rounded-full`} />
      </div>
      <div className="max-w-4xl mx-auto relative z-10 flex flex-col items-center">
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border backdrop-blur-sm ${palette.heroSurface}`}>
            <MapPin size={14} /> {data.suburbs?.name}, VIC
          </span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight mb-6">
          {data.business_name}
        </h1>
        <p className={`text-xl md:text-2xl font-light leading-relaxed mb-10 max-w-2xl ${palette.heroMutedText}`}>
          {data.categories?.name} in {data.suburbs?.name}, VIC.
        </p>
        <div className="flex flex-wrap justify-center w-full gap-4">
          {data.phone && (
            <a href={`tel:${data.phone}`} className={`px-8 py-4 font-bold transition-colors flex items-center gap-2 ${corners.btn} ${palette.heroAction}`}>
              <Phone size={18} /> Call Now
            </a>
          )}
          <a href="#about" className={`px-8 py-4 font-bold transition-colors border ${corners.btn} ${palette.heroSecondary}`}>
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
