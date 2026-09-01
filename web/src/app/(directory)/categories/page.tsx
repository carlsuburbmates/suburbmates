import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import type { Metadata } from "next";
import {
  fetchAllPublishedVendorRouteRows,
  publishedCategorySlugs,
} from "@/lib/public-catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business Categories | SuburbMates",
  description: "Browse categories with published local business listings.",
  alternates: { canonical: "/categories" },
};

export default async function CategoriesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const vendorRows = await fetchAllPublishedVendorRouteRows(supabase);
  const slugs = publishedCategorySlugs(vendorRows);
  const listingCountByCategory = new Map<string, number>();
  for (const row of vendorRows)
    if (row.category_slug)
      listingCountByCategory.set(
        row.category_slug,
        (listingCountByCategory.get(row.category_slug) ?? 0) + 1,
      );
  const { data: categories, error } = slugs.length
    ? await supabase
        .from("categories")
        .select("name, slug")
        .in("slug", slugs)
        .order("name")
    : { data: [], error: null };
  if (error) throw new Error("Published categories could not be loaded.");

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        Browse by service
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
        Business categories
      </h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Choose a service to see the local areas where published businesses are
        available.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <Link
            key={category.slug}
            href={`/categories/${category.slug}`}
            className="block min-h-36 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800"
          >
            <h2 className="text-xl font-black tracking-tight text-slate-950">
              {category.name}
            </h2>
            <p className="mt-3 text-sm text-slate-600">
              {(listingCountByCategory.get(category.slug) ?? 0).toLocaleString(
                "en-AU",
              )}{" "}
              published listings
            </p>
            <p className="mt-4 text-sm font-bold underline underline-offset-4">
              Browse locations
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
