import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { isTaxonomyPageEligible } from '@/lib/taxonomy-eligibility';

export async function generateMetadata({ params }: { params: Promise<{ suburb: string }> }): Promise<Metadata> {
  const { suburb } = await params;
  const supabase = await createClient();
  const [suburbResult, isEligible] = await Promise.all([
    supabase.from('suburbs').select('name').eq('slug', suburb).single(),
    isTaxonomyPageEligible(supabase, { routeType: 'suburb', suburbSlug: suburb }),
  ]);
  const name = suburbResult.data?.name ?? suburb;
  return {
    title: `Local Businesses in ${name} | SuburbMates`,
    description: `Browse published local business listings serving ${name}.`,
    alternates: { canonical: `/${suburb}` },
    robots: isEligible ? undefined : { index: false, follow: true },
  };
}

export default async function SuburbPage({ params }: { params: Promise<{ suburb: string }> }) {
  const { suburb } = await params;
  const supabase = await createClient();

  const { data: suburbData } = await supabase
    .from('suburbs')
    .select('name, slug')
    .eq('slug', suburb)
    .single();

  if (!suburbData) {
    notFound();
  }

  const { data: vendorCategories } = await supabase
    .from('published_vendors')
    .select('category_slug')
    .eq('suburb_slug', suburb);
  const categorySlugs = [...new Set((vendorCategories ?? []).map((vendor) => vendor.category_slug).filter(Boolean))] as string[];
  const { data: categories } = categorySlugs.length
    ? await supabase.from('categories').select('name, slug').in('slug', categorySlugs).order('name')
    : { data: [] };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-[#121212] mb-8">Local Businesses in {suburbData.name}</h1>
      {!categories?.length && <p className="rounded-xl bg-slate-100 p-6 text-slate-600">No published business listings are available in this location yet.</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {categories?.map((category) => (
          <Link 
            key={category.slug} 
            href={`/${suburbData.slug}/${category.slug}`} 
            className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-[#121212]">{category.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
