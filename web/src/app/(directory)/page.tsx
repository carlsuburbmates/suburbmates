import { HomeClient } from "@/components/ui/HomeClient";
import { LaunchPage } from "@/components/ui/LaunchPage";
import {
  canonicalDirectoryCategories,
  loadCategoryAliasMap,
} from "@/lib/category-aliases";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED !== "true") {
    return <LaunchPage />;
  }

  const supabase = await createClient();
  const [categoriesResult, suburbsResult, listingsResult, aliases] = await Promise.all([
    supabase.from("categories").select("name, slug").order("name"),
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase
      .from("published_vendors")
      .select(
        "id, slug, business_name, suburb_slug, category_slug, description, street_address, phone, website",
        { count: "exact" },
      )
      .order("business_name", { ascending: true })
      .limit(6),
    loadCategoryAliasMap(supabase),
  ]);

  if (categoriesResult.error || suburbsResult.error || listingsResult.error) {
    throw new Error("The directory home could not be loaded.");
  }

  return (
    <HomeClient
      categories={canonicalDirectoryCategories(categoriesResult.data ?? [], aliases)}
      suburbs={suburbsResult.data ?? []}
      featuredVendors={listingsResult.data ?? []}
      publishedCount={listingsResult.count ?? 0}
    />
  );
}
