"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  MapPin,
  Phone,
  Globe,
  Mail,
  ExternalLink,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Sparkles,
  X,
  Building2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type DirectoryVendor = {
  id: string;
  slug: string;
  business_name: string;
  description: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
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
  const [expandedVendorId, setExpandedVendorId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isPending, startTransition] = useTransition();

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
    startTransition(() => router.push(`/businesses?${params.toString()}`));
  };

  const clearAllFilters = () => {
    setQ("");
    setSuburb("");
    setCategory("");
    updateUrl(1, "", "", "");
  };

  const toggleExpand = (id: string) => {
    setExpandedVendorId((prev) => (prev === id ? null : id));
  };

  const activeFiltersCount = (q ? 1 : 0) + (suburb ? 1 : 0) + (category ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24">
      {/* ── Header ───────────────────────────────────────────── */}
      <section
        className="relative bg-black px-6 py-14 text-white overflow-hidden"
        aria-label="Directory Header"
      >
        <div
          className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          aria-hidden="true"
        />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-widest text-slate-300 mb-4 border border-white/10">
                <Sparkles size={13} className="text-amber-400" />
                Hyper-Local Business Directory
              </span>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase leading-none">
                Browse Local Businesses
              </h1>
              <p className="text-base md:text-lg max-w-2xl font-light tracking-wide text-slate-300 mt-3">
                Discover <span className="font-bold text-white">{totalCount}</span> local businesses across Darebin. Direct contact, zero lead-selling.
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-black shadow-md scale-100"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
                aria-label="Grid view"
                aria-pressed={viewMode === "grid"}
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "list"
                    ? "bg-white text-black shadow-md scale-100"
                    : "text-slate-300 hover:text-white hover:bg-white/10"
                }`}
                aria-label="Compact list view"
                aria-pressed={viewMode === "list"}
              >
                <List size={15} />
                <span className="hidden sm:inline">Compact List</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Search & Filter Bar ────────────────────────────── */}
        <div className="bg-white/90 backdrop-blur-xl p-4 sm:p-5 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/80 mb-8 sticky top-20 z-30 transition-all">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <label className="sr-only" htmlFor="directory-search">
                Search by business name
              </label>
              <input
                id="directory-search"
                type="text"
                placeholder="Search business name or keyword..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black focus:bg-white text-black font-medium text-sm transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:w-[480px]">
              <div className="relative">
                <label className="sr-only" htmlFor="directory-category">
                  Filter by category
                </label>
                <select
                  id="directory-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    updateUrl(1, q, suburb, e.target.value);
                  }}
                  className="w-full pl-4 pr-9 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-black font-medium text-xs sm:text-sm appearance-none cursor-pointer truncate"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <label className="sr-only" htmlFor="directory-suburb">
                  Filter by suburb
                </label>
                <select
                  id="directory-suburb"
                  value={suburb}
                  onChange={(e) => {
                    setSuburb(e.target.value);
                    updateUrl(1, q, e.target.value, category);
                  }}
                  className="w-full pl-4 pr-9 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-black font-medium text-xs sm:text-sm appearance-none cursor-pointer truncate"
                >
                  <option value="">All Suburbs</option>
                  {suburbs.map((s) => (
                    <option key={s.slug} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="btn btn-primary flex-1 lg:flex-initial rounded-xl py-3 px-6 text-xs font-bold uppercase tracking-wider bg-black text-white hover:bg-slate-800 transition-all shadow-md active:scale-95"
              >
                Filter
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="btn btn-outline rounded-xl p-3 border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
                  title="Clear all filters"
                  aria-label="Clear all filters"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </form>

          <p className="sr-only" role="status" aria-live="polite">
            {isPending ? "Loading matching businesses…" : "Directory results are ready."}
          </p>

          {/* Active Filter Pills */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Active Filters:</span>
              {q && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 border border-slate-200">
                  Search: &quot;{q}&quot;
                  <button onClick={() => { setQ(""); updateUrl(1, "", suburb, category); }} aria-label="Remove search query filter"><X size={12} className="hover:text-black" /></button>
                </span>
              )}
              {category && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 border border-slate-200">
                  Category: {categories.find((c) => c.slug === category)?.name || category}
                  <button onClick={() => { setCategory(""); updateUrl(1, q, suburb, ""); }} aria-label="Remove category filter"><X size={12} className="hover:text-black" /></button>
                </span>
              )}
              {suburb && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 border border-slate-200">
                  Suburb: {suburbs.find((s) => s.slug === suburb)?.name || suburb}
                  <button onClick={() => { setSuburb(""); updateUrl(1, q, "", category); }} aria-label="Remove suburb filter"><X size={12} className="hover:text-black" /></button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-slate-500 hover:text-black underline ml-2 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Business Listings ─────────────────────────────── */}
        {vendors.length === 0 ? (
          <div className="text-center py-20 px-6 bg-white border border-slate-200 rounded-3xl max-w-lg mx-auto shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
              <Filter size={28} aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-black tracking-tight mb-2">No Businesses Found</h2>
            <p className="text-slate-600 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              We couldn&apos;t find any local listings matching your selected search criteria.
            </p>
            <button onClick={clearAllFilters} className="btn btn-primary rounded-xl px-6 py-3">
              Clear All Filters
            </button>
          </div>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid md:grid-cols-2 lg:grid-cols-3 gap-5"
                : "flex flex-col gap-3"
            }
          >
            {vendors.map((vendor) => {
              const subName = suburbs.find((s) => s.slug === vendor.suburb_slug)?.name || vendor.suburb_slug;
              const catName = categories.find((c) => c.slug === vendor.category_slug)?.name || vendor.category_slug;
              const isExpanded = expandedVendorId === vendor.id;

              return (
                <article
                  key={vendor.id}
                  className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-slate-400/80 transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Card Header & Compact Info */}
                  <div className="p-5 sm:p-6 flex-1">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 group-hover:text-black transition-colors leading-snug">
                        {vendor.business_name}
                      </h2>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-slate-100 rounded-full text-slate-700 border border-slate-200">
                        {catName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-4">
                      <MapPin size={14} className="text-slate-400 shrink-0" aria-hidden="true" />
                      <span className="truncate">
                        {vendor.street_address ? `${vendor.street_address} • ` : ""}Servicing {subName}
                      </span>
                    </div>

                    {/* Expandable Details Accordion */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden border-t border-slate-100 pt-4 mt-2 space-y-3 text-xs text-slate-600 leading-relaxed"
                        >
                          <p className="line-clamp-4">
                            {vendor.description ||
                              `No description provided. Contact ${vendor.business_name} directly using the details below.`}
                          </p>

                          {vendor.contact_email && (
                            <div className="flex items-center gap-2 font-medium text-slate-800">
                              <Mail size={13} className="text-slate-400" />
                              <a href={`mailto:${vendor.contact_email}`} className="hover:underline truncate">
                                {vendor.contact_email}
                              </a>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 sm:px-6 sm:pb-5 bg-slate-50/60 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {/* Expand / Collapse Button */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(vendor.id)}
                      className="flex items-center gap-1.5 font-bold text-slate-600 hover:text-black transition-colors py-1 px-2 rounded-lg hover:bg-slate-200/60"
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? "Hide details" : "Show quick details"} for ${vendor.business_name}`}
                    >
                      <span>{isExpanded ? "Hide Details" : "Quick Info"}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2">
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="btn btn-primary rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-1.5 bg-black text-white hover:bg-slate-800 transition-all active:scale-95 shadow-sm"
                          aria-label={`Call ${vendor.business_name}`}
                        >
                          <Phone size={13} />
                          <span className="hidden sm:inline">Call</span>
                        </a>
                      )}

                      {vendor.website && (
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-outline rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-1 border-slate-200 text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                          aria-label={`Visit ${vendor.business_name} website`}
                        >
                          <Globe size={13} />
                          <ExternalLink size={11} className="opacity-60" />
                        </a>
                      )}

                      <Link
                        href={`/vendor/${vendor.slug}`}
                        className="btn rounded-xl px-3.5 py-1.5 text-[11px] font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-black hover:text-white text-slate-800 border border-slate-200/80 transition-all active:scale-95"
                        aria-label={`View full profile for ${vendor.business_name}`}
                      >
                        <Building2 size={13} />
                        <span>Profile</span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ── Pagination ───────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-14 flex items-center justify-center gap-3">
            <button
              disabled={currentPage <= 1}
              onClick={() => updateUrl(currentPage - 1, q, suburb, category)}
              className="p-3 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
              aria-label="Previous page"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl shadow-sm">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => updateUrl(currentPage + 1, q, suburb, category)}
              className="p-3 border border-slate-200 rounded-xl bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all active:scale-95"
              aria-label="Next page"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
