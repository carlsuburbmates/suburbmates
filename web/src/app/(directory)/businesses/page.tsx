import { createClient } from "@/utils/supabase/server";
import { DirectoryBrowseClient } from "@/components/ui/DirectoryBrowseClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Local Businesses | SuburbMates",
  description: "Search and browse local businesses in your area.",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q : '';
  const suburb = typeof params.suburb === 'string' ? params.suburb : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const pageStr = typeof params.page === 'string' ? params.page : '1';
  let page = parseInt(pageStr, 10);
  if (isNaN(page) || page < 1) page = 1;
  const pageSize = 24;

  const supabase = await createClient();

  const [suburbsRes, categoriesRes] = await Promise.all([
    supabase.from('suburbs').select('name, slug').order('name'),
    supabase.from('categories').select('name, slug').order('name'),
  ]);

  // 1. Get total count and clamp page
  let countQuery = supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);

  const escapedQ = q ? q.replace(/[%_\\]/g, '\\$&') : '';

  if (escapedQ) countQuery = countQuery.ilike('business_name', `%${escapedQ}%`);
  if (suburb) countQuery = countQuery.eq('suburb_slug', suburb);
  if (category) countQuery = countQuery.eq('category_slug', category);

  const { count } = await countQuery;
  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  
  page = Math.max(1, Math.min(page, totalPages));

  // 2. Fetch clamped page data
  let query = supabase
    .from('vendors')
    .select('id, business_name, description, contact_email, phone, website, tier, is_claimed, street_address, suburb_slug, category_slug')
    .eq('is_published', true);

  if (escapedQ) query = query.ilike('business_name', `%${escapedQ}%`);
  if (suburb) query = query.eq('suburb_slug', suburb);
  if (category) query = query.eq('category_slug', category);

  query = query.order('tier', { ascending: false }).order('business_name', { ascending: true });
  
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: vendors } = await query;

  return (
    <DirectoryBrowseClient
      vendors={vendors || []}
      totalCount={totalCount}
      currentPage={page}
      pageSize={pageSize}
      suburbs={suburbsRes.data || []}
      categories={categoriesRes.data || []}
      initialQ={q}
      initialSuburb={suburb}
      initialCategory={category}
    />
  );
}
