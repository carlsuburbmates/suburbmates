import React from "react";
import { Phone, Mail, Globe, MapPin } from "lucide-react";
import type { getVendorDesign } from "@/lib/minisite/engine";

type ContactData = {
  street_address?: string | null;
  phone?: string | null;
  contact_email?: string | null;
  website?: string | null;
};

type MinisiteStyling = ReturnType<typeof getVendorDesign>;

export function ContactSticky({ data, styling }: { data: ContactData; styling: MinisiteStyling }) {
  const { palette, corners } = styling;
  
  return (
    <div className={`p-8 sticky top-28 ${palette.cardBg} ${corners.container} ${corners.border}`}>
      <h3 className={`text-sm font-black uppercase tracking-widest mb-6 ${palette.bodyText}`}>Get in Touch</h3>
      <div className="space-y-4 flex flex-col">
        <ContactGridItems data={data} palette={palette} corners={corners} />
      </div>
    </div>
  );
}

export function ContactInline({ data, styling }: { data: ContactData; styling: MinisiteStyling }) {
  const { palette, corners } = styling;
  
  return (
    <div>
      <h3 className="text-2xl font-black mb-8">Get in Touch</h3>
      <div className="grid md:grid-cols-3 gap-6">
        <ContactGridItems data={data} palette={palette} corners={corners} />
      </div>
    </div>
  );
}

function ContactGridItems({
  data,
  palette,
  corners,
}: {
  data: ContactData;
  palette: MinisiteStyling['palette'];
  corners: MinisiteStyling['corners'];
}) {
  const hasDirectContact = Boolean(data.phone || data.contact_email || data.website);

  return (
    <>
      {data.street_address && (
        <div className={`flex items-center gap-4 p-4 ${corners.btn} ${palette.btnSecondary}`}>
          <div className={`w-12 h-12 flex items-center justify-center shrink-0 opacity-80 ${corners.btn}`}>
            <MapPin size={20} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-60">Address</div>
            <div className="font-bold">{data.street_address}</div>
          </div>
        </div>
      )}
      {data.phone && (
        <a href={`tel:${data.phone}`} className={`flex items-center gap-4 p-4 transition-all group ${corners.btn} ${palette.btnSecondary}`}>
          <div className={`w-12 h-12 flex items-center justify-center shrink-0 opacity-80 ${corners.btn}`}>
            <Phone size={20} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-60">Call Direct</div>
            <div className="font-black text-lg">{data.phone}</div>
          </div>
        </a>
      )}
      {data.contact_email && (
        <a href={`mailto:${data.contact_email}`} className={`flex items-center gap-4 p-4 transition-all group ${corners.btn} ${palette.btnSecondary}`}>
          <div className={`w-12 h-12 flex items-center justify-center shrink-0 opacity-80 ${corners.btn}`}>
            <Mail size={20} />
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-60">Email Us</div>
            <div className="font-bold truncate">{data.contact_email}</div>
          </div>
        </a>
      )}
      {data.website && (
        <a href={data.website} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-4 p-4 transition-all group ${corners.btn} ${palette.btnSecondary}`}>
          <div className={`w-12 h-12 flex items-center justify-center shrink-0 opacity-80 ${corners.btn}`}>
            <Globe size={20} />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider mb-0.5 opacity-60">Website</div>
            <div className="font-bold truncate">Visit Official Site</div>
          </div>
        </a>
      )}
      {!hasDirectContact && (
        <p className={`text-sm leading-relaxed ${palette.bodyText}`}>
          Direct contact details have not yet been added to this public profile.
        </p>
      )}
    </>
  );
}
