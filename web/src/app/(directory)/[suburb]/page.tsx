import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isTaxonomyPageEligible } from "@/lib/taxonomy-eligibility";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ suburb: string }>;
}): Promise<Metadata> {
  const { suburb } = await params;
  const supabase = await createClient();
  const [suburbResult, isEligible] = await Promise.all([
    supabase.from("suburbs").select("name").eq("slug", suburb).single(),
    isTaxonomyPageEligible(supabase, {
      routeType: "suburb",
      suburbSlug: suburb,
    }),
  ]);
  const name = suburbResult.data?.name ?? suburb;
  return {
    title: `Local Businesses in ${name} | SuburbMates`,
    description: `Browse published local business listings in ${name}.`,
    alternates: { canonical: `/${suburb}` },
    robots: isEligible ? undefined : { index: false, follow: true },
  };
}

export default async function SuburbPage({
  params,
}: {
  params: Promise<{ suburb: string }>;
}) {
  const { suburb } = await params;
  const supabase = await createClient();

  const { data: suburbData } = await supabase
    .from("suburbs")
    .select("name, slug")
    .eq("slug", suburb)
    .single();

  if (!suburbData) {
    notFound();
  }

  const { data: vendorCategories } = await supabase
    .from("published_vendors")
    .select("category_slug")
    .eq("suburb_slug", suburb);
  const categorySlugs = [
    ...new Set(
      (vendorCategories ?? [])
        .map((vendor) => vendor.category_slug)
        .filter(Boolean),
    ),
  ] as string[];
  const listingCountByCategory = new Map<string, number>();
  for (const vendor of vendorCategories ?? [])
    if (vendor.category_slug)
      listingCountByCategory.set(
        vendor.category_slug,
        (listingCountByCategory.get(vendor.category_slug) ?? 0) + 1,
      );
  const { data: categories } = categorySlugs.length
    ? await supabase
        .from("categories")
        .select("name, slug")
        .in("slug", categorySlugs)
        .order("name")
    : { data: [] };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        Browse by service
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
        Local businesses in {suburbData.name}
      </h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Choose a service to view available public profiles in this area.
      </p>
      {!categories?.length && (
        <p className="rounded-xl bg-slate-100 p-6 text-slate-600">
          No published business listings are available in this location yet.
        </p>
      )}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories?.map((category) => (
          <Link
            key={category.slug}
            href={`/${suburbData.slug}/${category.slug}`}
            className="block min-h-36 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
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
              View businesses
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
