import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Business Categories | SuburbMates',
  description: 'Browse categories with published local business listings.',
  alternates: { canonical: '/categories' },
};

export default async function CategoriesPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: vendorCategories } = await supabase.from('vendors').select('category_slug').eq('is_published', true);
  const slugs = [...new Set((vendorCategories ?? []).map((vendor) => vendor.category_slug).filter(Boolean))] as string[];
  const { data: categories } = slugs.length
    ? await supabase.from('categories').select('name, slug').in('slug', slugs).order('name')
    : { data: [] };
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-[#121212] mb-8">Business Categories</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {categories?.map((category) => (
          <Link 
            key={category.slug} 
            href={`/categories/${category.slug}`} 
            className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-[#121212]">{category.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
