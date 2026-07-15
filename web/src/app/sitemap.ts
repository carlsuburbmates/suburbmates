import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { buildPublicSitemapUrls, fetchAllPublishedVendorRouteRows } from '@/lib/public-catalogue';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://suburbmates.com.au';
  const vendors = await fetchAllPublishedVendorRouteRows(supabase);
  return buildPublicSitemapUrls(vendors, baseUrl).map((url) => ({ url }));
}
