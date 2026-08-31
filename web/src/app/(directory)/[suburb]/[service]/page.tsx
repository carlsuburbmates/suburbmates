import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Globe,
  Mail,
  MapPin,
  Shield,
  Building2,
  ExternalLink,
} from "lucide-react";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { isTaxonomyPageEligible } from "@/lib/taxonomy-eligibility";
import {
  canonicalCategorySlug,
  loadCategoryAliasMap,
} from "@/lib/category-aliases";

interface PageProps {
  params: Promise<{
    suburb: string;
    service: string;
  }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { suburb: suburbSlug, service: serviceSlug } = await params;
  const supabase = await createClient();
  const categorySlug = canonicalCategorySlug(
    serviceSlug,
    await loadCategoryAliasMap(supabase),
  );

  const [suburbRes, categoryRes] = await Promise.all([
    supabase.from("suburbs").select("name").eq("slug", suburbSlug).single(),
    supabase.from("categories").select("name").eq("slug", categorySlug).single(),
  ]);

  const suburbName = suburbRes.data?.name || suburbSlug;
  const categoryName = categoryRes.data?.name || serviceSlug;
  const isEligible = await isTaxonomyPageEligible(supabase, {
    routeType: "pair",
    suburbSlug,
    categorySlug,
  });

  return {
    title: `Local ${categoryName} in ${suburbName} | SuburbMates`,
    description: `Find local ${categoryName} in ${suburbName}. Direct contact, no paywalls, no middlemen.`,
    alternates: { canonical: `/${suburbSlug}/${categorySlug}` },
    robots: isEligible ? undefined : { index: false, follow: true },
  };
}

export default async function Page({ params }: PageProps) {
  const { suburb: suburbSlug, service: serviceSlug } = await params;
  const supabase = await createClient();
  const categorySlug = canonicalCategorySlug(
    serviceSlug,
    await loadCategoryAliasMap(supabase),
  );
  if (categorySlug !== serviceSlug) {
    permanentRedirect("/" + suburbSlug + "/" + categorySlug);
  }

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
      .eq("slug", categorySlug)
      .single(),
    supabase
      .from("published_vendors")
      .select(
        "id, slug, business_name, description, contact_email, phone, website, is_claimed, street_address",
      )
      .eq("suburb_slug", suburbSlug)
      .eq("category_slug", categorySlug)
      .order("business_name", { ascending: true }),
  ]);

  // If the category or suburb does not exist, return a 404
  if (
    suburbRes.error ||
    categoryRes.error ||
    !suburbRes.data ||
    !categoryRes.data
  ) {
    notFound();
  }

  const suburb = suburbRes.data;
  const category = categoryRes.data;
  if (vendorsRes.error) {
    throw new Error("The directory results could not be loaded.");
  }
  const vendors = vendorsRes.data || [];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* ── Sub-header Banner ── */}
      <section
        className="bg-black text-white py-16 px-6 relative overflow-hidden"
        aria-label="Page Header"
      >
        {/* Glow decoration */}
        <div
          className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
          style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
          aria-hidden="true"
        />

        <div className="max-w-5xl mx-auto relative z-10">
          <Link
            href="/businesses"
            className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-widest font-bold mb-8 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded px-1"
            style={{ color: "var(--sm-text-on-inverse-secondary)" }}
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span>Back to directory</span>
          </Link>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 leading-none">
            {category.name}{" "}
            <span className="font-light text-slate-300">in</span> {suburb.name}
          </h1>

          <p
            className="text-base md:text-lg max-w-2xl font-light tracking-wide"
            style={{ color: "var(--sm-text-on-inverse-secondary)" }}
          >
            {category.seo_description ||
              `Browse local ${category.name.toLowerCase()} businesses in ${suburb.name}, then open a profile for the available public details.`}
          </p>
        </div>
      </section>

      {/* ── Vendors List ── */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <h2 className="sr-only">Available Businesses</h2>

        {vendors.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 px-6 bg-white border rounded-2xl max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="text-slate-400" size={30} aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-3">
              No Businesses Listed Yet
            </h3>
            <p className="text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
              We don&apos;t have any local {category.name.toLowerCase()}{" "}
              listings in {suburb.name} at this time.
            </p>
            <Link
              href="/join"
              className="btn btn-primary"
              aria-label={`List your ${category.name.toLowerCase()} business in ${suburb.name}`}
            >
              Find or add a business
            </Link>
          </div>
        ) : (
          /* List of Providers */
          <div className="grid gap-6">
            {vendors.map((vendor) => {
              return (
                <article
                  key={vendor.id}
                  className="card relative overflow-hidden transition-all duration-300 border-slate-200"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-2xl font-black tracking-tight text-black">
                          {vendor.business_name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                        <MapPin
                          size={14}
                          className="text-slate-400"
                          aria-hidden="true"
                        />
                        <span>
                          {vendor.street_address
                            ? `${vendor.street_address} • `
                            : ""}
                          {suburb.name}
                        </span>
                      </div>

                      {vendor.description && (
                        <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
                          {vendor.description}
                        </p>
                      )}
                    </div>

                    {/* Quick Contacts Block */}
                    <div className="flex flex-wrap md:flex-col gap-2 min-w-[200px] w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                      <Link
                        href={`/vendor/${vendor.slug}`}
                        className="btn btn-primary w-full min-h-11 flex items-center justify-center gap-2"
                        aria-label={`View full profile for ${vendor.business_name}`}
                      >
                        <Building2 size={16} aria-hidden="true" />
                        <span>View profile</span>
                      </Link>
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="btn btn-outline w-full min-h-11 flex items-center justify-center gap-2"
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
                          className="btn btn-outline w-full min-h-11 flex items-center justify-center gap-2"
                          aria-label={`Visit ${vendor.business_name} website (opens in a new tab)`}
                        >
                          <Globe size={16} aria-hidden="true" />
                          <span>Website</span>
                          <ExternalLink
                            size={12}
                            className="opacity-60"
                            aria-hidden="true"
                          />
                        </a>
                      )}

                      {vendor.contact_email && (
                        <a
                          href={`mailto:${vendor.contact_email}`}
                          className="btn btn-outline w-full min-h-11 flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}
