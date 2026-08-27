"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Phone, Search, Store } from "lucide-react";
import { HeroSearch } from "@/components/ui/HeroSearch";
import { createClient } from "@/utils/supabase/client";

interface HomeClientProps {
  categories: { name: string; slug: string }[];
  suburbs: { name: string; slug: string }[];
  featuredVendors: Array<{
    id: string;
    slug: string;
    business_name: string;
    suburb_slug: string | null;
    category_slug: string | null;
    description: string | null;
  }>;
  publishedCount: number;
}

const valueProps = [
  {
    icon: Search,
    title: "Find what you need",
    desc: "Search a business name or service, then narrow by suburb when it helps.",
  },
  {
    icon: Phone,
    title: "Contact businesses directly",
    desc: "Use the public contact details on a business profile. SuburbMates does not sell your enquiry.",
  },
  {
    icon: Store,
    title: "Keep details useful",
    desc: "Business owners can claim an existing profile and propose reviewed updates.",
  },
];

function conciseDetail(description: string | null) {
  if (!description) return null;
  const firstLine = description.replace(/\s+/g, " ").trim();
  return firstLine.length > 118
    ? `${firstLine.slice(0, 115).trimEnd()}…`
    : firstLine;
}

export function HomeClient({
  categories,
  suburbs,
  featuredVendors,
  publishedCount,
}: HomeClientProps) {
  const router = useRouter();
  const categoryNames = new Map(
    categories.map((category) => [category.slug, category.name]),
  );
  const suburbNames = new Map(
    suburbs.map((suburb) => [suburb.slug, suburb.name]),
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;
    const completeMagicLink = async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        router.replace("/login?error=Unable%20to%20complete%20sign-in");
        return;
      }
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      window.location.replace("/dashboard");
    };
    void completeMagicLink();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col">
      <section
        className="border-b border-slate-800 bg-slate-950 py-14 text-white sm:py-20"
        aria-label="Directory search"
      >
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            Darebin business directory
          </p>
          <div className="mt-5 max-w-3xl">
            <h1 className="text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
              Local businesses. Zero noise.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Find a local business, view its public profile, then contact it
              directly. No sign-ups. No middlemen.
            </p>
          </div>
          <div className="mt-8 sm:mt-10">
            <HeroSearch categories={categories} suburbs={suburbs} />
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-300">
            <span className="font-semibold text-white">
              {publishedCount.toLocaleString("en-AU")} published local listings
            </span>
            <Link
              href="/categories"
              className="font-semibold underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Browse all categories
            </Link>
            <Link
              href="/locations"
              className="font-semibold underline underline-offset-4 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Browse locations
            </Link>
          </div>
        </div>
      </section>

      {featuredVendors.length > 0 && (
        <section
          className="bg-white py-14 sm:py-20"
          aria-label="Featured local businesses"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  Explore the directory
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  A few local businesses
                </h2>
                <p className="mt-3 max-w-2xl text-slate-600">
                  Start with a profile for the details that are publicly
                  available.
                </p>
              </div>
              <Link
                href="/businesses"
                className="btn btn-outline self-start sm:self-auto"
              >
                Browse all businesses
              </Link>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {featuredVendors.map((vendor) => {
                const suburbName = vendor.suburb_slug
                  ? suburbNames.get(vendor.suburb_slug)
                  : null;
                const categoryName = vendor.category_slug
                  ? categoryNames.get(vendor.category_slug)
                  : null;
                const detail = conciseDetail(vendor.description);
                return (
                  <article
                    key={vendor.id}
                    className="flex min-h-56 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-black leading-tight tracking-tight text-slate-950">
                        {vendor.business_name}
                      </h3>
                      {categoryName && (
                        <span className="badge badge-muted max-w-32 truncate">
                          {categoryName}
                        </span>
                      )}
                    </div>
                    {suburbName && (
                      <p className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-slate-600">
                        <MapPin size={15} aria-hidden="true" />
                        {suburbName}
                      </p>
                    )}
                    {detail && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {detail}
                      </p>
                    )}
                    <Link
                      href={`/vendor/${vendor.slug}`}
                      className="btn btn-primary mt-auto w-full sm:w-auto sm:self-start"
                      aria-label={`View profile for ${vendor.business_name}`}
                    >
                      View profile <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section
        className="bg-slate-50 py-14 sm:py-20"
        aria-label="Why use SuburbMates"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {valueProps.map((prop) => (
              <section
                key={prop.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <prop.icon
                  size={24}
                  aria-hidden="true"
                  className="text-slate-700"
                />
                <h2 className="mt-5 text-xl font-black tracking-tight">
                  {prop.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {prop.desc}
                </p>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section
        className="bg-slate-950 py-14 text-white sm:py-20"
        aria-label="Business owner options"
      >
        <div className="mx-auto max-w-4xl px-5 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-300">
            For business owners
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
            Find your business first
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Search for an existing Darebin listing before claiming it. Add a
            missing business only when there is no match, and every submission
            is reviewed privately.
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href="/join"
              className="btn btn-inverse min-h-11"
              aria-label="Find your business on SuburbMates"
            >
              Find your business <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              href="/join#find-business"
              className="btn min-h-11 border-2 border-white/70 bg-transparent text-white hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Add a genuinely missing business to SuburbMates"
            >
              Add a missing business
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
