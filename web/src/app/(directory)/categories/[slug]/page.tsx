import { createClient } from "@/utils/supabase/server";
import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { isTaxonomyPageEligible } from "@/lib/taxonomy-eligibility";
import {
  canonicalCategorySlug,
  loadCategoryAliasMap,
} from "@/lib/category-aliases";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const categorySlug = canonicalCategorySlug(
    slug,
    await loadCategoryAliasMap(supabase),
  );
  const [categoryResult, isEligible] = await Promise.all([
    supabase.from("categories").select("name").eq("slug", categorySlug).single(),
    isTaxonomyPageEligible(supabase, {
      routeType: "category",
      categorySlug,
    }),
  ]);
  const name = categoryResult.data?.name ?? categorySlug;
  return {
    title: `${name} by Location | SuburbMates`,
    description: `Browse published ${name.toLowerCase()} listings by location.`,
    alternates: { canonical: `/categories/${categorySlug}` },
    robots: isEligible ? undefined : { index: false, follow: true },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const categorySlug = canonicalCategorySlug(
    slug,
    await loadCategoryAliasMap(supabase),
  );
  if (categorySlug !== slug) permanentRedirect("/categories/" + categorySlug);

  const { data: categoryData } = await supabase
    .from("categories")
    .select("name, slug")
    .eq("slug", categorySlug)
    .single();

  if (!categoryData) {
    notFound();
  }

  const { data: vendorSuburbs } = await supabase
    .from("published_vendors")
    .select("suburb_slug")
    .eq("category_slug", categorySlug);
  const suburbSlugs = [
    ...new Set(
      (vendorSuburbs ?? []).map((vendor) => vendor.suburb_slug).filter(Boolean),
    ),
  ] as string[];
  const listingCountBySuburb = new Map<string, number>();
  for (const vendor of vendorSuburbs ?? [])
    if (vendor.suburb_slug)
      listingCountBySuburb.set(
        vendor.suburb_slug,
        (listingCountBySuburb.get(vendor.suburb_slug) ?? 0) + 1,
      );
  const { data: suburbs } = suburbSlugs.length
    ? await supabase
        .from("suburbs")
        .select("name, slug")
        .in("slug", suburbSlugs)
        .order("name")
    : { data: [] };

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        Browse by location
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950">
        {categoryData.name} by location
      </h1>
      <p className="mt-4 max-w-2xl text-slate-600">
        Choose an area to view the available public business profiles.
      </p>
      {!suburbs?.length && (
        <p className="rounded-xl bg-slate-100 p-6 text-slate-600">
          No published listings are available in this category yet.
        </p>
      )}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suburbs?.map((suburb) => (
          <Link
            key={suburb.slug}
            href={`/${suburb.slug}/${categoryData.slug}`}
            className="block min-h-36 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-500 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800"
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
              View businesses
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
