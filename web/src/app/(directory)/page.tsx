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
  const [categoriesResult, suburbsResult, listingsResult, publishedCountResult, categoryImagesResult, aliases] = await Promise.all([
    supabase.from("categories").select("name, slug").order("name"),
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase
      .from("published_vendors")
      .select(
        "id, slug, business_name, suburb_slug, category_slug, description, street_address, trading_hours, contact_email, phone, website",
        { count: "exact" },
      )
      // The home is an invitation to explore, not a ranked result set. Show a
      // small, deterministic sample only where a visitor can see both a useful
      // public detail and a direct way to take the next step. The full
      // directory remains the neutral, alphabetical/intent-ranked browse path.
      .not("description", "is", null)
      .or("phone.not.is.null,contact_email.not.is.null,website.not.is.null")
      .order("trading_hours", { ascending: false, nullsFirst: false })
      .order("business_name", { ascending: true })
      .limit(6),
    // The hero's coverage cue must describe the full public directory, not
    // the deliberately smaller rich-profile sample above.
    supabase.from("published_vendors").select("id", { count: "exact", head: true }),
    supabase
      .from("licensed_category_context_images")
      .select("category_slug, image_url, provider_url, photographer, photographer_url")
      .eq("active", true),
    loadCategoryAliasMap(supabase),
  ]);

  if (categoriesResult.error || suburbsResult.error || listingsResult.error || publishedCountResult.error || categoryImagesResult.error) {
    throw new Error("The directory home could not be loaded.");
  }

  return (
    <HomeClient
      categories={canonicalDirectoryCategories(categoriesResult.data ?? [], aliases)}
      suburbs={suburbsResult.data ?? []}
      sampleVendors={listingsResult.data ?? []}
      publishedCount={publishedCountResult.count ?? 0}
      categoryImages={categoryImagesResult.data ?? []}
    />
  );
}
