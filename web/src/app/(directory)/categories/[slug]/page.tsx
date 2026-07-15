import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const [categoryResult, vendorResult] = await Promise.all([
    supabase.from('categories').select('name').eq('slug', slug).single(),
    supabase.from('vendors').select('id', { count: 'exact', head: true }).eq('category_slug', slug).eq('is_published', true),
  ]);
  const name = categoryResult.data?.name ?? slug;
  return {
    title: `${name} by Location | SuburbMates`,
    description: `Browse published ${name.toLowerCase()} listings by location.`,
    alternates: { canonical: `/categories/${slug}` },
    robots: vendorResult.count ? undefined : { index: false, follow: true },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: categoryData } = await supabase
    .from('categories')
    .select('name, slug')
    .eq('slug', slug)
    .single();

  if (!categoryData) {
    notFound();
  }

  const { data: vendorSuburbs } = await supabase
    .from('vendors')
    .select('suburb_slug')
    .eq('category_slug', slug)
    .eq('is_published', true);
  const suburbSlugs = [...new Set((vendorSuburbs ?? []).map((vendor) => vendor.suburb_slug).filter(Boolean))] as string[];
  const { data: suburbs } = suburbSlugs.length
    ? await supabase.from('suburbs').select('name, slug').in('slug', suburbSlugs).order('name')
    : { data: [] };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-[#121212] mb-8">{categoryData.name} by Location</h1>
      {!suburbs?.length && <p className="rounded-xl bg-slate-100 p-6 text-slate-600">No published listings are available in this category yet.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {suburbs?.map((suburb) => (
          <Link 
            key={suburb.slug} 
            href={`/${suburb.slug}/${categoryData.slug}`} 
            className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-[#121212]">{suburb.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
