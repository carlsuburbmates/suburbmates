import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Metadata } from "next";
import {
  fetchAllPublishedVendorRouteRows,
  publishedSuburbSlugs,
} from "@/lib/public-catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Service Locations | SuburbMates",
  description: "Browse locations with published local business listings.",
  alternates: { canonical: "/locations" },
};

export default async function LocationsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const vendorRows = await fetchAllPublishedVendorRouteRows(supabase);
  const slugs = publishedSuburbSlugs(vendorRows);
  const listingCountBySuburb = new Map<string, number>();
  for (const row of vendorRows)
    if (row.suburb_slug)
      listingCountBySuburb.set(
        row.suburb_slug,
        (listingCountBySuburb.get(row.suburb_slug) ?? 0) + 1,
      );
  const { data: suburbs, error } = slugs.length
    ? await supabase
        .from("suburbs")
        .select("name, slug")
        .in("slug", slugs)
        .order("name")
    : { data: [], error: null };
  if (error) throw new Error("Published locations could not be loaded.");

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        Browse by area
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
        Service locations
      </h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Choose a local area to browse the categories with published businesses.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suburbs?.map((suburb) => (
          <Link
            key={suburb.slug}
            href={`/${suburb.slug}`}
            className="block min-h-36 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
          >
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              {suburb.name}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              {(listingCountBySuburb.get(suburb.slug) ?? 0).toLocaleString(
                "en-AU",
              )}{" "}
              published listings
            </p>
            <p className="mt-4 text-sm font-bold underline underline-offset-4">
              Browse services
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
