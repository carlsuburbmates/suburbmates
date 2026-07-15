import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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

  const { data: suburbs } = await supabase
    .from('suburbs')
    .select('name, slug')
    .order('name');

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-[#121212] mb-8">{categoryData.name} by Location</h1>
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
