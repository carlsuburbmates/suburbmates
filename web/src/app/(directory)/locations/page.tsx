import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export default async function LocationsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: suburbs } = await supabase
    .from('suburbs')
    .select('name, slug')
    .order('name');
  
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold text-[#121212] mb-8">Service Locations</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {suburbs?.map((suburb) => (
          <Link 
            key={suburb.slug} 
            href={`/${suburb.slug}`} 
            className="block p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <h2 className="text-xl font-semibold text-[#121212]">{suburb.name}</h2>
          </Link>
        ))}
      </div>
    </div>
  );
}
