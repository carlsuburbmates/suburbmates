import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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

  const { data: categories } = await supabase
    .from('categories')
    .select('name, slug')
    .order('name');

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-[#121212] mb-8">Local Businesses in {suburbData.name}</h1>
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
