import { createClient } from "@/utils/supabase/server";
import { DirectoryBrowseClient } from "@/components/ui/DirectoryBrowseClient";
import type { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const hasVariant = Object.values(params).some(
    (value) => value !== undefined && value !== "" && value !== "1"
  );
  return {
    title: "Browse Local Businesses | SuburbMates",
    description: "Search and browse local businesses across the City of Darebin.",
    alternates: { canonical: "/businesses" },
    robots: hasVariant ? { index: false, follow: true } : undefined,
  };
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const suburb = typeof params.suburb === "string" ? params.suburb : "";
  const category = typeof params.category === "string" ? params.category : "";
  const pageStr = typeof params.page === "string" ? params.page : "1";
  let requestedPage = parseInt(pageStr, 10);
  if (isNaN(requestedPage) || requestedPage < 1) requestedPage = 1;
  const pageSize = 24;

  const supabase = await createClient();

  const escapedQ = q ? q.replace(/[%_\\]/g, "\\$&") : "";
  const vendorFields = "id, slug, business_name, description, contact_email, phone, website, is_claimed, street_address, suburb_slug, category_slug";

  const vendorPage = (targetPage: number) => {
    const from = (targetPage - 1) * pageSize;
    let query = supabase.from("published_vendors").select(vendorFields, { count: "exact" });
    if (escapedQ) query = query.ilike("business_name", `%${escapedQ}%`);
    if (suburb) query = query.eq("suburb_slug", suburb);
    if (category) query = query.eq("category_slug", category);
    return query.order("business_name", { ascending: true }).range(from, from + pageSize - 1);
  };

  // Execute suburbs, categories, and vendor query concurrently in a single parallel batch
  const [suburbsRes, categoriesRes, vendorsRes] = await Promise.all([
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase.from("categories").select("name, slug").order("name"),
    vendorPage(requestedPage),
  ]);

  if (suburbsRes.error || categoriesRes.error || vendorsRes.error) {
    throw new Error("The directory could not be loaded.");
  }

  const totalCount = vendorsRes.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.max(1, Math.min(requestedPage, totalPages));
  let resolvedVendors = vendorsRes.data ?? [];
  if (clampedPage !== requestedPage) {
    const correctedPage = await vendorPage(clampedPage);
    if (correctedPage.error) throw new Error("The directory could not be loaded.");
    resolvedVendors = correctedPage.data ?? [];
  }

  return (
    <DirectoryBrowseClient
      key={`${q}:${suburb}:${category}:${clampedPage}`}
      vendors={resolvedVendors}
      totalCount={totalCount}
      currentPage={clampedPage}
      pageSize={pageSize}
      suburbs={suburbsRes.data || []}
      categories={categoriesRes.data || []}
      initialQ={q}
      initialSuburb={suburb}
      initialCategory={category}
    />
  );
}
