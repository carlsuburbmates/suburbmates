import { createClient } from "@/utils/supabase/server";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { Phone } from "lucide-react";
import { getVendorDesign } from "@/lib/minisite/engine";
import { HeroSplit } from "@/components/minisite/heroes/HeroSplit";
import { HeroCentered } from "@/components/minisite/heroes/HeroCentered";
import { HeroMinimal } from "@/components/minisite/heroes/HeroMinimal";
import { ContactSticky, ContactInline } from "@/components/minisite/contact/ContactComponents";
import { resolvePublicVendorRoute } from "@/lib/public-vendor-route";

// Approved listing changes must be visible immediately after operator review.
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const route = await resolvePublicVendorRoute(supabase, slug);
  if (!route) return { title: "Not Found" };
  
  const { data: vendor } = await supabase
    .from("published_vendors")
    .select("business_name, description, suburb_slug, category_slug, is_published, suburbs(name), categories(name)")
    .eq("id", route.vendorId)
    .single();
    
  if (!vendor) {
    return { title: "Not Found" };
  }

  const categoryRelation = vendor.categories as unknown as { name: string } | { name: string }[] | null;
  const suburbRelation = vendor.suburbs as unknown as { name: string } | { name: string }[] | null;
  const categoryName = (Array.isArray(categoryRelation) ? categoryRelation[0]?.name : categoryRelation?.name) ?? "Local business";
  const suburbName = (Array.isArray(suburbRelation) ? suburbRelation[0]?.name : suburbRelation?.name) ?? vendor.suburb_slug;
  
  return {
    title: `${vendor.business_name} | ${categoryName} in ${suburbName}`,
    description: vendor.description ? vendor.description.substring(0, 155) : `View public contact details for ${vendor.business_name} in ${suburbName}.`,
    alternates: { canonical: `/vendor/${route.currentSlug}` },
    robots: vendor.is_published ? undefined : { index: false, follow: false },
  };
}

export default async function VendorWebsite({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const route = await resolvePublicVendorRoute(supabase, slug);
  if (!route) notFound();
  if (route.redirectRequired) permanentRedirect(`/vendor/${route.currentSlug}`);

  const { data: vendor, error } = await supabase
    .from("published_vendors")
    .select(`
      *,
      suburbs (name),
      categories (name)
    `)
    .eq("id", route.vendorId)
    .single();

  if (error || !vendor) {
    notFound();
  }

  // Compute design parameters out of existing data deterministically
  const design = getVendorDesign(vendor.id, vendor.created_at);
  const profileDescription = vendor.description || `This is a public directory profile for ${vendor.business_name} in ${vendor.suburbs?.name}. Business details may be added or corrected when the owner claims this profile.`;
  const canonicalUrl = `https://suburbmates.com.au/vendor/${route.currentSlug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.business_name,
    description: profileDescription,
    url: canonicalUrl,
    telephone: vendor.phone || undefined,
    email: vendor.contact_email || undefined,
    address: vendor.street_address ? {
      "@type": "PostalAddress",
      streetAddress: vendor.street_address,
      addressLocality: vendor.suburbs?.name,
      addressCountry: "AU",
    } : undefined,
    areaServed: vendor.suburbs?.name ? { "@type": "Place", name: vendor.suburbs.name } : undefined,
    sameAs: vendor.website ? [vendor.website] : undefined,
  };

  return (
    <div className={`min-h-screen flex flex-col ${design.font.class} ${design.palette.bg} ${design.palette.text} transition-colors duration-300`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      
      {/* ── Vendor Header ── */}
      <header className={`border-b sticky top-0 z-50 ${design.palette.bg} ${design.corners.border} border-black/5 dark:border-white/5`}>
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center font-black text-xl ${design.corners.btn} ${design.palette.btnBg}`}>
              {vendor.business_name.charAt(0)}
            </div>
            <div>
              <div className="font-black text-xl tracking-tight leading-none">{vendor.business_name}</div>
              <div className={`text-sm font-medium ${design.palette.bodyText}`}>{vendor.categories?.name}</div>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 font-bold hover:opacity-80 transition-opacity">
                <Phone size={18} />
                <span>{vendor.phone}</span>
              </a>
            )}
            {vendor.contact_email && (
              <a href={`mailto:${vendor.contact_email}`} className={`px-5 py-2.5 font-bold text-sm transition-colors ${design.corners.btn} ${design.palette.btnBg}`}>
                Request Quote
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ── Dynamic Hero Section ── */}
      {design.hero === 'Split' && <HeroSplit data={vendor} styling={design} />}
      {design.hero === 'Centered' && <HeroCentered data={vendor} styling={design} />}
      {design.hero === 'Minimal' && <HeroMinimal data={vendor} styling={design} />}

      {/* ── Main Content & Contact Layout ── */}
      <main className="flex-grow max-w-5xl mx-auto px-6 py-20 w-full" id="about">
        {design.contact === 'Sidebar' ? (
          <div className="grid md:grid-cols-3 gap-12">
            <div className="md:col-span-2 space-y-12">
              <section>
                <h2 className="text-3xl font-black tracking-tight mb-6">About Us</h2>
                <div className="prose prose-lg max-w-none">
                  <div className={`leading-relaxed whitespace-pre-wrap font-medium ${design.palette.bodyText}`}>
                    {profileDescription}
                  </div>
                </div>
              </section>
            </div>
            <div className="space-y-6">
              <ContactSticky data={vendor} styling={design} />
            </div>
          </div>
        ) : (
          <div className="space-y-16">
            <div className="max-w-3xl">
              <section>
                <h2 className="text-3xl font-black tracking-tight mb-6">About Us</h2>
                <div className="prose prose-lg max-w-none">
                  <div className={`leading-relaxed whitespace-pre-wrap font-medium ${design.palette.bodyText}`}>
                    {profileDescription}
                  </div>
                </div>
              </section>
            </div>
            <ContactInline data={vendor} styling={design} />
          </div>
        )}
      </main>

      {/* ── Vendor Footer ── */}
      <footer className={`${design.palette.heroBg} text-white/60 py-12 border-t border-white/10 mt-auto`}>
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="font-bold text-white tracking-tight">{vendor.business_name}</span>
          </div>
          <div className="text-sm flex flex-col md:flex-row items-center gap-4">
            <span>© {new Date().getFullYear()} {vendor.business_name}. All rights reserved.</span>
            {vendor.is_claimed === false && (
              <Link href="/claim" className="underline hover:text-white transition-colors">
                Claim this business
              </Link>
            )}
          </div>
          <div className="text-xs flex items-center gap-2">
            <span>Powered by</span>
            <Link href="/" className="text-white font-bold hover:underline">
              SuburbMates
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
