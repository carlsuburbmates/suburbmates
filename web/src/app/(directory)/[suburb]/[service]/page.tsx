import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { ArrowLeft, Phone, Globe, Mail, MapPin, Shield, Star, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{
    suburb: string;
    service: string;
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { suburb: suburbSlug, service: serviceSlug } = await params;
  const supabase = await createClient();
  
  const [suburbRes, categoryRes] = await Promise.all([
    supabase.from("suburbs").select("name").eq("slug", suburbSlug).single(),
    supabase.from("categories").select("name").eq("slug", serviceSlug).single(),
  ]);
  
  const suburbName = suburbRes.data?.name || suburbSlug;
  const categoryName = categoryRes.data?.name || serviceSlug;
  const { count } = await supabase
    .from("vendors")
    .select("id", { count: "exact", head: true })
    .eq("suburb_slug", suburbSlug)
    .eq("category_slug", serviceSlug)
    .eq("is_published", true);
  
  return {
    title: `Local ${categoryName} in ${suburbName} | SuburbMates`,
    description: `Find local ${categoryName} in ${suburbName}. Direct contact, no paywalls, no middlemen.`,
    alternates: { canonical: `/${suburbSlug}/${serviceSlug}` },
    robots: count ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { suburb: suburbSlug, service: serviceSlug } = await params;
  const supabase = await createClient();

  // Fetch suburb, category and active vendors matching the route parameters
  const [suburbRes, categoryRes, vendorsRes] = await Promise.all([
    supabase
      .from("suburbs")
      .select("name, seo_description")
      .eq("slug", suburbSlug)
      .single(),
    supabase
      .from("categories")
      .select("name, seo_description")
      .eq("slug", serviceSlug)
      .single(),
    supabase
      .from("vendors")
      .select("id, business_name, description, contact_email, phone, website, tier, is_claimed, street_address")
      .eq("suburb_slug", suburbSlug)
      .eq("category_slug", serviceSlug)
      .eq("is_published", true)
      .order("tier", { ascending: false }) // premium/claimed first
  ]);

  // If the category or suburb does not exist, return a 404
  if (suburbRes.error || categoryRes.error || !suburbRes.data || !categoryRes.data) {
    notFound();
  }

  const suburb = suburbRes.data;
  const category = categoryRes.data;
  const vendors = vendorsRes.data || [];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* ── Sub-header Banner ── */}
      <section className="bg-black text-white py-16 px-6 relative overflow-hidden" aria-label="Page Header">
        {/* Glow decoration */}
        <div
          className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
          style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
          aria-hidden="true"
        />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold mb-8 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded px-1"
            style={{ color: "var(--sm-text-on-inverse-secondary)" }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to search</span>
          </Link>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 leading-none">
            {category.name} <span className="font-light text-slate-300">in</span> {suburb.name}
          </h1>
          
          <p 
            className="text-base md:text-lg max-w-2xl font-light tracking-wide"
            style={{ color: "var(--sm-text-on-inverse-secondary)" }}
          >
            {category.seo_description || `Find local ${category.name.toLowerCase()} operating in ${suburb.name}. Call direct with zero middlemen fees.`}
          </p>
        </div>
      </section>

      {/* ── Vendors List ── */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="sr-only">Available Businesses</h2>
        
        {vendors.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 px-6 bg-white border rounded-2xl max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="text-slate-400" size={30} aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-3">No Businesses Listed Yet</h3>
            <p className="text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
              We don&apos;t have any local {category.name.toLowerCase()} registered in {suburb.name} at this time.
            </p>
            <Link
              href="/join"
              className="btn btn-primary"
              aria-label={`List your ${category.name.toLowerCase()} business in ${suburb.name}`}
            >
              List your business
            </Link>
          </div>
        ) : (
          /* List of Providers */
          <div className="grid gap-6">
            {vendors.map((vendor) => {
              const isPremium = vendor.tier === "premium";
              return (
                <article
                  key={vendor.id}
                  className={`card relative overflow-hidden transition-all duration-300 ${
                    isPremium ? 'border-black ring-1 ring-black/10' : 'border-slate-200'
                  }`}
                >
                  {/* Premium Badge */}
                  {isPremium && (
                    <div className="absolute top-0 right-0 bg-black text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-bl">
                      Featured
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-2xl font-black tracking-tight text-black">
                          {vendor.business_name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                        <MapPin size={14} className="text-slate-400" aria-hidden="true" />
                        <span>{vendor.street_address ? `${vendor.street_address} • ` : ''}Servicing {suburb.name}</span>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
                        {vendor.description || `No description provided. Contact ${vendor.business_name} directly using the details below.`}
                      </p>
                    </div>

                    {/* Quick Contacts Block */}
                    <div className="flex flex-wrap md:flex-col gap-2 min-w-[200px] w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="btn btn-primary w-full flex items-center justify-center gap-2"
                          aria-label={`Call ${vendor.business_name} at ${vendor.phone}`}
                        >
                          <Phone size={16} aria-hidden="true" />
                          <span>Call Direct</span>
                        </a>
                      )}
                      
                      {vendor.website && (
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline w-full flex items-center justify-center gap-2"
                          aria-label={`Visit ${vendor.business_name} website (opens in a new tab)`}
                        >
                          <Globe size={16} aria-hidden="true" />
                          <span>Website</span>
                          <ExternalLink size={12} className="opacity-60" aria-hidden="true" />
                        </a>
                      )}

                      <Link
                        href={`/vendor/${vendor.id}`}
                        className="btn btn-ghost w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100"
                        aria-label={`View full profile for ${vendor.business_name}`}
                      >
                        <Star size={16} aria-hidden="true" />
                        <span>View Profile</span>
                      </Link>

                      {vendor.contact_email && (
                        <a
                          href={`mailto:${vendor.contact_email}`}
                          className="btn btn-ghost w-full flex items-center justify-center gap-2"
                          aria-label={`Email ${vendor.business_name}`}
                        >
                          <Mail size={16} aria-hidden="true" />
                          <span>Send Email</span>
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
