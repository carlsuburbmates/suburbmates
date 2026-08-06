import { HomeClient } from "@/components/ui/HomeClient";
import { LaunchPage } from "@/components/ui/LaunchPage";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED !== "true") {
    return <LaunchPage />;
  }

  const supabase = await createClient();
  const [categoriesResult, suburbsResult, listingsResult] = await Promise.all([
    supabase.from("categories").select("name, slug").order("name"),
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase
      .from("published_vendors")
      .select("id, slug, business_name, suburbs(name)")
      .order("business_name", { ascending: true })
      .limit(6),
  ]);

  if (categoriesResult.error || suburbsResult.error || listingsResult.error) {
    throw new Error("The directory home could not be loaded.");
  }

  return (
    <HomeClient
      categories={categoriesResult.data ?? []}
      suburbs={suburbsResult.data ?? []}
      featuredVendors={listingsResult.data ?? []}
    />
  );
}
