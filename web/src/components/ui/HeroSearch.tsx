"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface HeroSearchProps {
  categories: { name: string; slug: string }[];
  suburbs: { name: string; slug: string }[];
}

const popularCategorySlugs = [
  "cafe",
  "restaurant",
  "electrician",
  "plumber",
  "hairdresser",
  "accountant",
];

export function HeroSearch({ categories, suburbs }: HeroSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [service, setService] = useState("");
  const [selectedSuburb, setSelectedSuburb] = useState("");
  const categoryByName = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.name.toLocaleLowerCase(),
          category.slug,
        ]),
      ),
    [categories],
  );
  const popularCategories = categories
    .filter((category) => popularCategorySlugs.includes(category.slug))
    .slice(0, 5);

  const navigate = (categorySlug?: string) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    const selectedCategory =
      categorySlug ?? categoryByName.get(service.trim().toLocaleLowerCase());
    if (selectedCategory) params.set("category", selectedCategory);
    if (selectedSuburb) params.set("suburb", selectedSuburb);
    router.push(`/businesses${params.size ? `?${params.toString()}` : ""}`);
  };

  return (
    <form
      action="/businesses"
      method="get"
      onSubmit={(event) => {
        event.preventDefault();
        navigate();
      }}
      className="w-full"
      role="search"
    >
      <div className="rounded-2xl border border-white/25 bg-white p-3 text-slate-950 shadow-2xl shadow-black/20">
        <div className="grid gap-2 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.85fr)_minmax(0,0.7fr)_auto]">
          <div>
            <label className="sr-only" htmlFor="hero-search">
              Search business name or keyword
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={19}
                aria-hidden="true"
              />
              <input
                id="hero-search"
                name="q"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search business name or keyword"
                className="form-input min-h-12 border-slate-300 pl-11"
              />
            </div>
          </div>
          <div>
            <label className="sr-only" htmlFor="hero-service">
              Optional service
            </label>
            <input
              id="hero-service"
              type="text"
              list="hero-service-options"
              value={service}
              onChange={(event) => setService(event.target.value)}
              placeholder="Optional service"
              className="form-input min-h-12"
              aria-describedby="hero-service-help"
            />
            <datalist id="hero-service-options">
              {categories.map((category) => (
                <option key={category.slug} value={category.name} />
              ))}
            </datalist>
            <span id="hero-service-help" className="sr-only">
              Start typing to find a service from the directory.
            </span>
          </div>
          <div>
            <label className="sr-only" htmlFor="hero-suburb">
              Optional suburb
            </label>
            <select
              id="hero-suburb"
              name="suburb"
              value={selectedSuburb}
              onChange={(event) => setSelectedSuburb(event.target.value)}
              className="form-input min-h-12 cursor-pointer bg-white"
            >
              <option value="">Any suburb</option>
              {suburbs.map((suburb) => (
                <option key={suburb.slug} value={suburb.slug}>
                  {suburb.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary min-h-12 px-6"
            aria-label="Search directory"
          >
            Search
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-sm">
          <span className="font-semibold text-slate-600">Popular:</span>
          {popularCategories.map((category) => (
            <button
              key={category.slug}
              type="button"
              onClick={() => navigate(category.slug)}
              className="min-h-11 rounded-full border border-slate-300 px-3 py-1.5 font-semibold text-slate-700 hover:border-slate-950 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950"
            >
              {category.name}
            </button>
          ))}
          <Link
            href="/categories"
            className="inline-flex min-h-11 items-center font-semibold text-slate-700 underline underline-offset-4 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800"
          >
            All categories
          </Link>
        </div>
      </div>
    </form>
  );
}
