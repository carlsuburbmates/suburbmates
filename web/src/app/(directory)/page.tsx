import { createClient } from "@/utils/supabase/server";
import { HomeClient } from "@/components/ui/HomeClient";

export default async function Home() {
  const supabase = await createClient();

  const [categoriesRes, suburbsRes, featuredRes] = await Promise.all([
    supabase.from("categories").select("name, slug").order("name"),
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase
      .from("vendors")
      .select(`
        id, 
        business_name, 
        description, 
        phone, 
        website, 
        tier, 
        is_claimed, 
        category_slug, 
        suburb_slug,
        street_address,
        suburbs (
          name
        )
      `)
      .eq("is_published", true)
      .order("tier", { ascending: false })
      .limit(6)
  ]);

  return (
    <HomeClient 
      categories={categoriesRes.data || []}
      suburbs={suburbsRes.data || []}
      featuredVendors={featuredRes.data || []}
    />
  );
}
