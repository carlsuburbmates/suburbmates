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

async function runTest() {
  console.log('Fetching a control vendor...');
  const { data: vendor, error: vError } = await supabase
    .from('vendors')
    .select('id, business_name, suburb_slug, category_slug')
    .limit(1)
    .single();

  if (vError || !vendor) {
    console.error('Failed to fetch vendor:', vError?.message);
    process.exit(1);
  }

  console.log(`Selected Control Vendor: ${vendor.business_name} (${vendor.id})`);
  console.log('Firing Gemini Edge Function to generate localized SEO bio...');

  // Invoke the edge function
  const { data: funcData, error: funcError } = await supabase.functions.invoke('generate-bio', {
    body: { vendorId: vendor.id }
  });

  if (funcError) {
    console.error('Failed to invoke edge function:', funcError.message);
    process.exit(1);
  }

  console.log('✅ Gemini Edge Function returned successfully.');

  console.log('Flipping is_published to true...');
  const { data: updatedVendor, error: updateError } = await supabase
    .from('vendors')
    .update({ is_published: true })
    .eq('id', vendor.id)
    .select('description, is_published')
    .single();

  if (updateError || !updatedVendor) {
    console.error('Failed to publish vendor:', updateError?.message);
    process.exit(1);
  }

  console.log('✅ Vendor published.');
  console.log('\n=== GENERATED SEO BIO ===');
  console.log(updatedVendor.description);
  console.log('=========================\n');
  
  const pSeoUrl = `/${vendor.suburb_slug}/${vendor.category_slug}`;
  console.log(`Control test ready. You can now verify the render at: ${pSeoUrl}`);
}

runTest();
