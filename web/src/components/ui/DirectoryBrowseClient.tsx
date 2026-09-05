"use client";

import { useMemo, useState, useTransition } from "react";
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
  Clock3,
  LayoutGrid,
  List,
  X,
  Building2,
} from "lucide-react";
import { DirectoryCategoryVisual } from "@/components/ui/DirectoryCategoryVisual";
import { LicensedCategoryVisual, type LicensedCategoryImage } from "@/components/ui/LicensedCategoryVisual";
import { displayDirectoryStreetAddress } from "@/lib/directory-location";

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
  trading_hours: string | null;
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
  categoryImages: LicensedCategoryImage[];
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
  categoryImages,
}: DirectoryBrowseClientProps) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [suburb, setSuburb] = useState(initialSuburb);
  const [category, setCategory] = useState(initialCategory);
  const [service, setService] = useState(
    () => categories.find((item) => item.slug === initialCategory)?.name ?? "",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isPending, startTransition] = useTransition();
  const categoryByName = useMemo(
    () =>
      new Map(
        categories.map((item) => [item.name.trim().toLocaleLowerCase(), item]),
      ),
    [categories],
  );
  const popularCategories = categories.filter((item) =>
    ["cafe", "restaurant", "electrician", "plumber", "hairdresser"].includes(
      item.slug,
    ),
  );
  const categoryImageBySlug = useMemo(
    () => new Map(categoryImages.map((image) => [image.category_slug, image])),
    [categoryImages],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasAppliedFilters = Boolean(initialQ || initialSuburb || initialCategory);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl(1, q, suburb, category);
  };

  const setServiceFilter = (value: string) => {
    setService(value);
    setCategory(categoryByName.get(value.trim().toLocaleLowerCase())?.slug ?? "");
  };

  const chooseCategory = (nextCategory: { name: string; slug: string }) => {
    setService(nextCategory.name);
    setCategory(nextCategory.slug);
    updateUrl(1, q, suburb, nextCategory.slug);
  };

  const updateUrl = (
    page: number,
    searchQ: string,
    sub: string,
    cat: string,
  ) => {
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

  const activeFiltersCount =
    (q ? 1 : 0) + (suburb ? 1 : 0) + (category ? 1 : 0);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24">
      {/* ── Header ───────────────────────────────────────────── */}
      <section
        className="border-b border-teal-950/40 bg-[#073b3a] px-5 py-12 text-white sm:px-6 sm:py-16"
        aria-label="Directory header"
      >
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300 mb-4">
                Darebin business directory
              </p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
                Browse Local Businesses
              </h1>
              <p className="text-base md:text-lg max-w-2xl text-slate-300 mt-3">
                {totalCount.toLocaleString("en-AU")} {hasAppliedFilters ? "matching listings" : "published listings"}. Open a
                profile for the available public details, then contact the business directly.
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-1 bg-white/10 p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`flex min-h-11 items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "grid"
                    ? "bg-white text-teal-950 shadow-md scale-100"
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
                className={`flex min-h-11 items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "list"
                    ? "bg-white text-teal-950 shadow-md scale-100"
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Search & Filter Bar ────────────────────────────── */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 mb-8 sticky top-20 z-30 transition-all">
          <form
            onSubmit={handleSearch}
            className="flex flex-col lg:flex-row gap-3"
          >
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
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-800 focus:bg-white text-teal-950 font-medium text-sm transition-all placeholder:text-slate-400"
              />
            </div>

            <div className="min-w-0 lg:w-72">
              <label className="sr-only" htmlFor="directory-service">
                Optional service
              </label>
              <input
                id="directory-service"
                type="text"
                list="directory-service-options"
                value={service}
                onChange={(event) => setServiceFilter(event.target.value)}
                placeholder="Optional service"
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-teal-950 transition-all placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-800"
                aria-describedby="directory-service-help"
              />
              <datalist id="directory-service-options">
                {categories.map((item) => (
                  <option key={item.slug} value={item.name} />
                ))}
              </datalist>
              <span id="directory-service-help" className="sr-only">
                Start typing to narrow the directory by service.
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="btn btn-primary min-h-11 flex-1 lg:flex-initial rounded-xl px-6 text-xs font-bold uppercase tracking-wider shadow-md active:scale-95"
              >
                Search
              </button>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="btn btn-outline min-h-11 min-w-11 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
                  title="Clear all filters"
                  aria-label="Clear all filters"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
              Popular services
            </span>
            {popularCategories.map((item) => (
              <button
                key={item.slug}
                type="button"
                onClick={() => chooseCategory(item)}
                className="min-h-11 rounded-full border border-slate-200 px-3 text-xs font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
              >
                {item.name}
              </button>
            ))}
            <details className="relative ml-auto text-sm">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 font-bold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 [&::-webkit-details-marker]:hidden">
                <MapPin size={15} aria-hidden="true" />
                {suburb
                  ? `Suburb: ${suburbs.find((item) => item.slug === suburb)?.name ?? suburb}`
                  : "Add a suburb"}
                <ChevronDown size={15} aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                <label className="sr-only" htmlFor="directory-suburb">
                  Filter by suburb
                </label>
                <select
                  id="directory-suburb"
                  value={suburb}
                  onChange={(event) => setSuburb(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-800"
                >
                  <option value="">Any suburb</option>
                  {suburbs.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Choose a suburb, then search to apply it.
                </p>
              </div>
            </details>
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {isPending
              ? "Loading matching businesses…"
              : "Directory results are ready."}
          </p>

          {/* Active Filter Pills */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                Active Filters:
              </span>
              {q && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 border border-slate-200">
                  Search: &quot;{q}&quot;
                  <button
                    onClick={() => {
                      setQ("");
                      updateUrl(1, "", suburb, category);
                    }}
                    aria-label="Remove search query filter"
                  >
                    <X size={12} className="hover:text-teal-900" />
                  </button>
                </span>
              )}
              {category && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 border border-slate-200">
                  Category:{" "}
                  {categories.find((c) => c.slug === category)?.name ||
                    category}
                  <button
                    onClick={() => {
                      setCategory("");
                      updateUrl(1, q, suburb, "");
                    }}
                    aria-label="Remove category filter"
                  >
                    <X size={12} className="hover:text-teal-900" />
                  </button>
                </span>
              )}
              {suburb && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 font-semibold text-slate-800 border border-slate-200">
                  Suburb:{" "}
                  {suburbs.find((s) => s.slug === suburb)?.name || suburb}
                  <button
                    onClick={() => {
                      setSuburb("");
                      updateUrl(1, q, "", category);
                    }}
                    aria-label="Remove suburb filter"
                  >
                    <X size={12} className="hover:text-teal-900" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-slate-500 hover:text-teal-900 underline ml-2 transition-colors"
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
            <h2 className="text-2xl font-black tracking-tight mb-2">
              No Businesses Found
            </h2>
            <p className="text-slate-600 text-sm mb-6 max-w-sm mx-auto leading-relaxed">
              We couldn&apos;t find any local listings matching your selected
              search criteria.
            </p>
            <button
              onClick={clearAllFilters}
              className="btn btn-primary rounded-xl px-6 py-3"
            >
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
              const subName =
                suburbs.find((s) => s.slug === vendor.suburb_slug)?.name ||
                vendor.suburb_slug;
              const catName =
                categories.find((c) => c.slug === vendor.category_slug)?.name ||
                vendor.category_slug;
              const detail = vendor.description?.replace(/\s+/g, " ").trim();
              const hours = vendor.trading_hours?.replace(/\s+/g, " ").trim();
              const displayedAddress = displayDirectoryStreetAddress(vendor.street_address);
              const categoryImage = categoryImageBySlug.get(vendor.category_slug);

              return (
                <article
                  key={vendor.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[border-color,box-shadow,transform] hover:border-slate-400 hover:shadow-md"
                >
                  {viewMode === "grid" && (
                    categoryImage ? (
                      <LicensedCategoryVisual image={categoryImage} categoryName={catName} className="h-32" businessContext />
                    ) : (
                      <DirectoryCategoryVisual categorySlug={vendor.category_slug} label={catName} className="h-20" />
                    )
                  )}
                  {/* Card Header & Compact Info */}
                  <div className="p-5 sm:p-6 flex-1">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h2 className="min-w-0 break-words text-lg font-black leading-snug tracking-tight text-slate-900 transition-colors group-hover:text-teal-900 sm:text-xl">
                        {vendor.business_name}
                      </h2>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-slate-100 rounded-full text-slate-700 border border-slate-200">
                        {catName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-4">
                      <MapPin
                        size={14}
                        className="text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {displayedAddress
                          ? `${displayedAddress} · `
                          : ""}
                        {subName}
                      </span>
                    </div>
                    {detail && (
                      <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                        {detail}
                      </p>
                    )}
                    {hours && (
                      <p className="mt-3 flex items-start gap-1.5 text-xs font-semibold leading-5 text-slate-600">
                        <Clock3 size={14} className="mt-0.5 shrink-0 text-teal-800" aria-hidden="true" />
                        <span className="line-clamp-2">Hours: {hours}</span>
                      </p>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-4 sm:px-6 sm:pb-5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
                    <Link
                      href={`/vendor/${vendor.slug}`}
                      className="btn btn-primary min-h-11 rounded-xl px-4 text-[11px] font-bold flex items-center gap-1.5"
                      aria-label={`View full profile for ${vendor.business_name}`}
                    >
                      <Building2 size={14} />
                      <span>View profile</span>
                    </Link>
                    <div className="flex flex-wrap items-center gap-2">
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="btn btn-outline min-h-11 rounded-xl px-3 text-[11px] font-bold flex items-center gap-1.5"
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
                          className="btn btn-outline min-h-11 rounded-xl px-3 text-[11px] font-bold flex items-center gap-1"
                          aria-label={`Visit ${vendor.business_name} website`}
                        >
                          <Globe size={13} />
                          <ExternalLink size={11} className="opacity-60" />
                        </a>
                      )}

                      {vendor.contact_email && (
                        <a
                          href={`mailto:${vendor.contact_email}`}
                          className="btn btn-outline min-h-11 rounded-xl px-3 text-[11px] font-bold flex items-center gap-1"
                          aria-label={`Email ${vendor.business_name}`}
                        >
                          <Mail size={13} />
                          <span className="hidden sm:inline">Email</span>
                        </a>
                      )}
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
      </div>
    </div>
  );
}
