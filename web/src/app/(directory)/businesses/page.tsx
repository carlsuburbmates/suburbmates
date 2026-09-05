import { createClient } from "@/utils/supabase/server";
import { DirectoryBrowseClient } from "@/components/ui/DirectoryBrowseClient";
import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import {
  canonicalCategorySlug,
  canonicalDirectoryCategories,
  loadCategoryAliasMap,
} from "@/lib/category-aliases";

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
  const requestedCategory =
    typeof params.category === "string" ? params.category : "";
  const pageStr = typeof params.page === "string" ? params.page : "1";
  let requestedPage = parseInt(pageStr, 10);
  if (isNaN(requestedPage) || requestedPage < 1) requestedPage = 1;
  const pageSize = 24;

  const supabase = await createClient();
  const aliases = await loadCategoryAliasMap(supabase);
  const category = canonicalCategorySlug(requestedCategory, aliases);
  if (requestedCategory && category !== requestedCategory) {
    const nextParams = new URLSearchParams();
    if (q) nextParams.set("q", q);
    if (suburb) nextParams.set("suburb", suburb);
    nextParams.set("category", category);
    if (pageStr !== "1") nextParams.set("page", pageStr);
    permanentRedirect(`/businesses?${nextParams.toString()}`);
  }

  const searchQuery = q.trim();
  const vendorFields = "id, slug, business_name, description, contact_email, phone, website, is_claimed, street_address, trading_hours, suburb_slug, category_slug";

  const browsePage = (targetPage: number) => {
    const from = (targetPage - 1) * pageSize;
    let query = supabase.from("published_vendors").select(vendorFields, { count: "exact" });
    if (suburb) query = query.eq("suburb_slug", suburb);
    if (category) query = query.eq("category_slug", category);
    return query.order("business_name", { ascending: true }).range(from, from + pageSize - 1);
  };

  const searchPage = (targetPage: number) => supabase.rpc("search_published_vendors_with_hours", {
    p_query: searchQuery,
    p_suburb_slug: suburb || null,
    p_category_slug: category || null,
    p_limit: pageSize,
    p_offset: (targetPage - 1) * pageSize,
  });

  // Execute public reads concurrently. A short retry avoids turning a single
  // transient provider read failure into a public error screen during a busy
  // evidence refresh; persistent failures still fail visibly and safely.
  const loadDirectoryData = () => Promise.all([
    supabase.from("suburbs").select("name, slug").order("name"),
    supabase.from("categories").select("name, slug").order("name"),
    searchQuery ? searchPage(requestedPage) : browsePage(requestedPage),
    supabase.from("licensed_category_context_images").select("category_slug, image_url, provider_url, photographer, photographer_url").eq("active", true),
  ]);
  let [suburbsRes, categoriesRes, vendorsRes, categoryImagesRes] = await loadDirectoryData();
  if (suburbsRes.error || categoriesRes.error || vendorsRes.error || categoryImagesRes.error) {
    await new Promise((resolve) => setTimeout(resolve, 150));
    [suburbsRes, categoriesRes, vendorsRes, categoryImagesRes] = await loadDirectoryData();
  }

  if (suburbsRes.error || categoriesRes.error || vendorsRes.error || categoryImagesRes.error) {
    throw new Error("The directory could not be loaded.");
  }

  let totalCount = searchQuery
    ? Number(vendorsRes.data?.[0]?.total_count ?? 0)
    : vendorsRes.count || 0;
  if (searchQuery && totalCount === 0 && requestedPage > 1) {
    const firstSearchPage = await searchPage(1);
    if (firstSearchPage.error) throw new Error("The directory could not be loaded.");
    totalCount = Number(firstSearchPage.data?.[0]?.total_count ?? 0);
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const clampedPage = Math.max(1, Math.min(requestedPage, totalPages));
  let resolvedVendors = vendorsRes.data ?? [];
  if (clampedPage !== requestedPage) {
    const correctedPage = searchQuery ? await searchPage(clampedPage) : await browsePage(clampedPage);
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
      categories={canonicalDirectoryCategories(categoriesRes.data || [], aliases)}
      initialQ={q}
      initialSuburb={suburb}
      initialCategory={category}
      categoryImages={categoryImagesRes.data ?? []}
    />
  );
}
