import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error(
    "Error: Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SECRET_KEY " +
      "(or the legacy NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY names).",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false }
});

async function verify() {
  console.log("=== VENDORS TABLE VERIFICATION ===");
  const totalResult = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true });
  const publishedResult = await supabase
    .from('vendors')
    .select('id', { count: 'exact', head: true })
    .eq('is_published', true);
  const unpublishedResult = await supabase
    .from('vendors')
    .select('id, business_name, category_slug, suburb_slug, is_claimed, is_published')
    .eq('is_published', false)
    .order('business_name');

  const vendorError = totalResult.error ?? publishedResult.error ?? unpublishedResult.error;
  if (vendorError) {
    console.error("Error fetching vendors:", vendorError.message || JSON.stringify(vendorError));
  } else {
    console.table({
      total: totalResult.count ?? 0,
      published: publishedResult.count ?? 0,
      unpublished: unpublishedResult.data.length,
    });
    if (unpublishedResult.data.length > 0) {
      console.log("\nUnpublished vendors (read-only inspection):");
      console.table(unpublishedResult.data);
    }
  }

  console.log("\n=== CATEGORIES TABLE VERIFICATION ===");
  const { data: categories, error: cError } = await supabase
    .from('categories')
    .select('slug, name')
    .order('name');
  if (cError) {
    console.error("Error fetching categories:", cError.message);
  } else {
    console.log(`${categories.length} categories found.`);
  }

  console.log("\n=== SUBURBS TABLE VERIFICATION ===");
  const { data: suburbs, error: sError } = await supabase
    .from('suburbs')
    .select('slug, name')
    .order('name');
  if (sError) {
    console.error("Error fetching suburbs:", sError.message);
  } else {
    console.log(`${suburbs.length} suburbs found.`);
  }
}

verify().catch((error: unknown) => {
  console.error("Verification failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
