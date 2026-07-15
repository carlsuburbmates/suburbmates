import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase test credentials.');
}

const anonClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
const serviceClient = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

async function runTests() {
  const suffix = Date.now().toString();
  const ownerEmail = `claim-owner-${suffix}@example.test`;
  const updatedEmail = `claim-updated-${suffix}@example.test`;
  const otherEmail = `claim-other-${suffix}@example.test`;
  const sourceKey = `test:self-service-claim:${suffix}`;
  let ownerId: string | undefined;
  let otherId: string | undefined;
  let vendorId: string | undefined;

  try {
    const { data: ownerData, error: ownerError } = await serviceClient.auth.admin.createUser({
      email: ownerEmail,
      email_confirm: true,
      password: 'Temporary-password-123!',
    });
    if (ownerError || !ownerData.user) throw ownerError ?? new Error('Could not create owner test user.');
    ownerId = ownerData.user.id;

    const { data: otherData, error: otherError } = await serviceClient.auth.admin.createUser({
      email: otherEmail,
      email_confirm: true,
      password: 'Temporary-password-123!',
    });
    if (otherError || !otherData.user) throw otherError ?? new Error('Could not create non-owner test user.');
    otherId = otherData.user.id;

    const { data: vendor, error: vendorError } = await serviceClient
      .from('vendors')
      .insert({
        business_name: 'Self-service claim test',
        category_slug: 'local-business',
        suburb_slug: 'darebin',
        contact_email: ownerEmail,
        source_key: sourceKey,
        is_published: true,
        listing_status: 'published',
      })
      .select('id')
      .single();
    if (vendorError || !vendor) throw vendorError ?? new Error('Could not create test listing.');
    vendorId = vendor.id;

    const ownerClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    const otherClient = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false } });
    await ownerClient.auth.signInWithPassword({ email: ownerEmail, password: 'Temporary-password-123!' });
    await otherClient.auth.signInWithPassword({ email: otherEmail, password: 'Temporary-password-123!' });

    const { error: anonymousError } = await anonClient.rpc('list_claimable_vendors_for_current_email');
    if (!anonymousError) throw new Error('Anonymous user could inspect eligible claims.');

    const { data: ownerListings, error: ownerListingsError } = await ownerClient.rpc('list_claimable_vendors_for_current_email');
    if (ownerListingsError || !ownerListings?.some((listing) => listing.id === vendorId)) {
      throw ownerListingsError ?? new Error('Matching email did not receive its eligible listing.');
    }

    const { data: otherListings, error: otherListingsError } = await otherClient.rpc('list_claimable_vendors_for_current_email');
    if (otherListingsError || otherListings?.some((listing) => listing.id === vendorId)) {
      throw otherListingsError ?? new Error('Non-matching email received an eligible listing.');
    }

    const { error: deniedClaimError } = await otherClient.rpc('claim_vendor_for_current_email', { p_vendor_id: vendorId });
    if (!deniedClaimError) throw new Error('Non-matching email claimed a listing.');

    const { error: claimError } = await ownerClient.rpc('claim_vendor_for_current_email', { p_vendor_id: vendorId });
    if (claimError) throw claimError;

    const { data: claimedVendor, error: claimedVendorError } = await serviceClient
      .from('vendors')
      .select('owner_id, is_claimed, is_published')
      .eq('id', vendorId)
      .single();
    if (claimedVendorError || claimedVendor?.owner_id !== ownerId || !claimedVendor.is_claimed || !claimedVendor.is_published) {
      throw claimedVendorError ?? new Error('Claim did not atomically assign ownership while preserving publication.');
    }

    const { error: profileError } = await ownerClient.rpc('update_vendor_profile', {
      p_vendor_id: vendorId,
      p_business_name: 'Updated self-service claim test',
      p_street_address: '10 Test Lane, Northcote VIC 3070',
      p_contact_email: updatedEmail,
      p_phone: '0390000000',
      p_website: 'https://example.test',
      p_description: 'Owner-updated directory profile.',
    });
    if (profileError) throw profileError;

    const { data: enrichedVendor, error: enrichedVendorError } = await serviceClient
      .from('vendors')
      .select('business_name, street_address, contact_email, phone, website, description, is_published')
      .eq('id', vendorId)
      .single();
    if (
      enrichedVendorError ||
      enrichedVendor?.business_name !== 'Updated self-service claim test' ||
      enrichedVendor.street_address !== '10 Test Lane, Northcote VIC 3070' ||
      enrichedVendor.contact_email !== updatedEmail ||
      enrichedVendor.phone !== '0390000000' ||
      enrichedVendor.website !== 'https://example.test' ||
      enrichedVendor.description !== 'Owner-updated directory profile.' ||
      !enrichedVendor.is_published
    ) {
      throw enrichedVendorError ?? new Error('Claimed owner could not enrich public profile fields.');
    }

    const { data: afterClaim } = await ownerClient.rpc('list_claimable_vendors_for_current_email');
    if (afterClaim?.some((listing) => listing.id === vendorId)) {
      throw new Error('Claimed listing remained eligible for another claim.');
    }

    console.log('Self-service claim integration test passed.');
  } finally {
    if (vendorId) await serviceClient.from('vendors').delete().eq('id', vendorId);
    if (ownerId) await serviceClient.auth.admin.deleteUser(ownerId);
    if (otherId) await serviceClient.auth.admin.deleteUser(otherId);
  }
}

runTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
