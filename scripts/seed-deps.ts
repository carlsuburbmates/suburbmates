import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: Missing Supabase environment variables.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function seedDeps() {
  console.log('Seeding categories...');
  const categories = [
    { slug: 'plumber', name: 'Plumber' },
    { slug: 'electrician', name: 'Electrician' },
    { slug: 'landscaper', name: 'Landscaper' }
  ];
  
  for (const cat of categories) {
    await supabase.from('categories').upsert(cat, { onConflict: 'slug' });
  }

  console.log('Seeding suburbs...');
  const suburbs = [
    { slug: 'darebin', name: 'Darebin' },
    { slug: 'northcote', name: 'Northcote' }
  ];

  for (const sub of suburbs) {
    await supabase.from('suburbs').upsert(sub, { onConflict: 'slug' });
  }

  console.log('Dependencies seeded successfully.');
}

seedDeps();
