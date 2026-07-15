"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, Phone, Globe, Star, Mail, ExternalLink, Filter, ChevronLeft, ChevronRight } from "lucide-react";

type DirectoryVendor = {
  id: string;
  slug: string;
  business_name: string;
  description: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  tier: string;
  is_claimed: boolean;
  street_address: string | null;
  suburb_slug: string;
  category_slug: string;
};

interface DirectoryBrowseClientProps {
  vendors: DirectoryVendor[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  suburbs: { name: string; slug: string }[];
  categories: { name: string; slug: string }[];
  initialQ: string;
  initialSuburb: string;
  initialCategory: string;
}

export function DirectoryBrowseClient({
  vendors,
  totalCount,
  currentPage,
  pageSize,
  suburbs,
  categories,
  initialQ,
  initialSuburb,
  initialCategory,
}: DirectoryBrowseClientProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [suburb, setSuburb] = useState(initialSuburb);
  const [category, setCategory] = useState(initialCategory);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl(1, q, suburb, category);
  };

  const updateUrl = (page: number, searchQ: string, sub: string, cat: string) => {
    const params = new URLSearchParams();
    if (searchQ) params.set("q", searchQ);
    if (sub) params.set("suburb", sub);
    if (cat) params.set("category", cat);
    if (page > 1) params.set("page", page.toString());
    
    router.push(`/businesses?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <section className="bg-black text-white py-12 px-6 relative overflow-hidden" aria-label="Page Header">
        <div
          className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none"
          style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
          aria-hidden="true"
        />
        
        <div className="max-w-5xl mx-auto relative z-10">
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-4 leading-none">
            Browse Local Businesses
          </h1>
          <p className="text-base md:text-lg max-w-2xl font-light tracking-wide text-slate-300">
            Search our directory of {totalCount} local businesses. No middlemen, just direct contact.
          </p>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by business name..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-black"
              />
            </div>
            
            <div className="md:w-64">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  updateUrl(1, q, suburb, e.target.value);
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black appearance-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="md:w-64">
              <select
                value={suburb}
                onChange={(e) => {
                  setSuburb(e.target.value);
                  updateUrl(1, q, e.target.value, category);
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-black appearance-none cursor-pointer"
              >
                <option value="">All Suburbs</option>
                {suburbs.map((s) => (
                  <option key={s.slug} value={s.slug}>{s.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
            >
              Filter
            </button>
          </form>
        </div>

        {vendors.length === 0 ? (
          <div className="text-center py-20 px-6 bg-white border rounded-2xl max-w-xl mx-auto shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Filter className="text-slate-400" size={30} aria-hidden="true" />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-3">No Businesses Found</h3>
            <p className="text-slate-600 mb-8 max-w-sm mx-auto leading-relaxed">
              We couldn&apos;t find any listings matching your filters. Try adjusting your search criteria.
            </p>
            <button
              onClick={() => {
                setQ("");
                setSuburb("");
                setCategory("");
                updateUrl(1, "", "", "");
              }}
              className="btn btn-primary"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {vendors.map((vendor) => {
              const isPremium = vendor.tier === "premium";
              const subName = suburbs.find(s => s.slug === vendor.suburb_slug)?.name || vendor.suburb_slug;
              const catName = categories.find(c => c.slug === vendor.category_slug)?.name || vendor.category_slug;

              return (
                <article
                  key={vendor.id}
                  className={`card relative overflow-hidden transition-all duration-300 bg-white p-6 rounded-xl ${
                    isPremium ? 'border-black ring-1 ring-black/10 shadow-md' : 'border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300'
                  }`}
                >
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
                        <span className="text-xs font-semibold px-2 py-1 bg-slate-100 rounded text-slate-600">
                          {catName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                        <MapPin size={14} className="text-slate-400" aria-hidden="true" />
                        <span>{vendor.street_address ? `${vendor.street_address} • ` : ''}Servicing {subName}</span>
                      </div>

                      <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
                        {vendor.description || ((vendor.phone || vendor.website || vendor.contact_email) 
                          ? `No description provided. Contact ${vendor.business_name} directly using the details below.` 
                          : 'Contact details are not yet available.')}
                      </p>
                    </div>

                    <div className="flex flex-wrap md:flex-col gap-2 min-w-[200px] w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 md:pl-6">
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="btn btn-primary w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-slate-800 rounded px-4 py-2 font-medium"
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
                          className="btn btn-outline w-full flex items-center justify-center gap-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded px-4 py-2 font-medium"
                          aria-label={`Visit ${vendor.business_name} website`}
                        >
                          <Globe size={16} aria-hidden="true" />
                          <span>Website</span>
                          <ExternalLink size={12} className="opacity-60" aria-hidden="true" />
                        </a>
                      )}

                      <Link
                        href={`/vendor/${vendor.slug}`}
                        className="btn w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded px-4 py-2 font-medium"
                        aria-label={`View profile for ${vendor.business_name}`}
                      >
                        <Star size={16} aria-hidden="true" />
                        <span>View Profile</span>
                      </Link>

                      {vendor.contact_email && (
                        <a
                          href={`mailto:${vendor.contact_email}`}
                          className="btn w-full flex items-center justify-center gap-2 text-slate-600 hover:text-black font-medium py-2"
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

        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => updateUrl(currentPage - 1, q, suburb, category)}
              className="p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft size={20} />
            </button>
            
            <span className="px-4 text-sm font-medium text-slate-600">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => updateUrl(currentPage + 1, q, suburb, category)}
              className="p-2 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
