import { MapPin, Phone } from "lucide-react";
import type { MinisiteVendor, VendorDesign } from "@/lib/minisite/engine";

export function HeroMinimal({ data, styling }: { data: MinisiteVendor; styling: VendorDesign }) {
  const { palette, corners } = styling;
  
  return (
    <section className={`py-20 px-6 border-b ${corners.border} border-black/5 dark:border-white/5`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-start gap-3 mb-6">
          <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-current opacity-70">
            <MapPin size={14} /> {data.suburbs?.name}, VIC
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight mb-6 max-w-3xl">
          {data.business_name}
        </h1>
        <p className={`text-xl ${palette.bodyText} mb-8 max-w-2xl font-light`}>
          A public listing for {data.categories?.name?.toLowerCase()} in {data.suburbs?.name}.
        </p>
        <div className="flex flex-wrap justify-start gap-4">
          {data.phone && (
            <a href={`tel:${data.phone}`} className={`px-8 py-4 font-bold transition-colors flex items-center gap-2 ${corners.btn} ${palette.btnBg}`}>
              <Phone size={18} /> Call Now
            </a>
          )}
          <a href="#about" className={`px-8 py-4 font-bold transition-colors border ${corners.btn} ${palette.btnSecondary}`}>
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
