import type { SupabaseClient } from "@supabase/supabase-js";

export type TaxonomyRouteType = "pair" | "suburb" | "category";

export type TaxonomyPageEligibilityRow = {
  route_type: TaxonomyRouteType;
  suburb_slug: string | null;
  category_slug: string | null;
  qualified_listing_count: number;
};

type TaxonomyRoute =
  | { routeType: "suburb"; suburbSlug: string }
  | { routeType: "category"; categorySlug: string }
  | { routeType: "pair"; suburbSlug: string; categorySlug: string };

export function taxonomyEligibilityKey(row: TaxonomyPageEligibilityRow): string {
  return `${row.route_type}:${row.suburb_slug ?? ""}:${row.category_slug ?? ""}`;
}

export async function isTaxonomyPageEligible(
  client: SupabaseClient,
  route: TaxonomyRoute,
): Promise<boolean> {
  let query = client
    .from("taxonomy_page_eligibility")
    .select("route_type")
    .eq("route_type", route.routeType);

  if (route.routeType === "suburb") {
    query = query.eq("suburb_slug", route.suburbSlug).is("category_slug", null);
  } else if (route.routeType === "category") {
    query = query.eq("category_slug", route.categorySlug).is("suburb_slug", null);
  } else {
    query = query.eq("suburb_slug", route.suburbSlug).eq("category_slug", route.categorySlug);
  }

  const { data, error } = await query.maybeSingle();
  return !error && data !== null;
}
