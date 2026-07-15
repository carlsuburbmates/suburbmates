import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, category_slug, suburb_slug')
    .eq('is_published', true);

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://suburbmates.com.au';

  const routes: MetadataRoute.Sitemap = [
    { url: baseUrl },
    { url: `${baseUrl}/businesses` },
    { url: `${baseUrl}/locations` },
    { url: `${baseUrl}/categories` },
    { url: `${baseUrl}/how-it-works` },
    { url: `${baseUrl}/contact` },
  ];

  if (vendors) {
    const dynamicRoutes = new Set<string>();

    vendors.forEach((v) => {
      if (v.id) {
        dynamicRoutes.add(`${baseUrl}/vendor/${v.id}`);
      }
      if (v.suburb_slug) {
        dynamicRoutes.add(`${baseUrl}/${v.suburb_slug}`);
      }
      if (v.category_slug) {
        dynamicRoutes.add(`${baseUrl}/categories/${v.category_slug}`);
      }
      if (v.suburb_slug && v.category_slug) {
        dynamicRoutes.add(`${baseUrl}/${v.suburb_slug}/${v.category_slug}`);
      }
    });

    dynamicRoutes.forEach((url) => {
      routes.push({ url });
    });
  }

  return routes;
}
