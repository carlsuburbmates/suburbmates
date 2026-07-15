import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase test credentials.');
}

const supabaseHostname = new URL(supabaseUrl).hostname;
const isLocalDatabase = supabaseHostname === 'localhost' || supabaseHostname === '127.0.0.1';
if (!isLocalDatabase && process.env.ALLOW_APPEND_ONLY_TEST_AUDIT !== 'true') {
  throw new Error(
    'Claim mutation tests leave append-only audit records. Run against a local/disposable Supabase project, or explicitly set ALLOW_APPEND_ONLY_TEST_AUDIT=true.',
  );
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
  let claimRequestId: string | undefined;

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

    const { error: removedImmediateClaimError } = await ownerClient.rpc('claim_vendor_for_current_email', {
      p_vendor_id: vendorId,
    });
    if (!removedImmediateClaimError) throw new Error('The legacy immediate-ownership RPC is still executable.');

    const { error: deniedClaimError } = await otherClient.rpc('submit_claim_for_current_email', {
      p_vendor_id: vendorId,
      p_claimant_note: 'Automated claim integration test',
    });
    if (!deniedClaimError) throw new Error('Non-matching email submitted a claim request.');

    const { data: claimData, error: claimError } = await ownerClient.rpc('submit_claim_for_current_email', {
      p_vendor_id: vendorId,
      p_claimant_note: 'Automated claim integration test',
    });
    if (claimError || !claimData?.[0]) throw claimError ?? new Error('Matching email could not submit a claim.');
    claimRequestId = claimData[0].claim_request_id;

    const { data: pendingVendor, error: pendingVendorError } = await serviceClient
      .from('vendors')
      .select('owner_id, is_claimed, is_published, ownership_status')
      .eq('id', vendorId)
      .single();
    if (
      pendingVendorError ||
      pendingVendor?.owner_id !== null ||
      pendingVendor.is_claimed ||
      !pendingVendor.is_published ||
      pendingVendor.ownership_status !== 'claim_pending'
    ) {
      throw pendingVendorError ?? new Error('Claim request changed ownership or publication incorrectly.');
    }

    const { data: pendingClaim, error: pendingClaimError } = await serviceClient
      .from('claim_requests')
      .select('id, vendor_id, claimant_user_id, claim_status, evidence')
      .eq('id', claimRequestId)
      .single();
    if (
      pendingClaimError ||
      pendingClaim?.vendor_id !== vendorId ||
      pendingClaim.claimant_user_id !== ownerId ||
      pendingClaim.claim_status !== 'pending' ||
      pendingClaim.evidence?.email_match !== true
    ) {
      throw pendingClaimError ?? new Error('Pending claim evidence was not recorded correctly.');
    }

    const { data: auditRows, error: auditError } = await serviceClient
      .from('audit_events')
      .select('action, entity_id, after_data')
      .eq('action', 'claim_submitted')
      .eq('entity_id', vendorId);
    if (auditError || auditRows?.length !== 1 || auditRows[0].after_data?.publication_unchanged !== true) {
      throw auditError ?? new Error('Claim submission audit event was not written.');
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
    if (!profileError) throw new Error('Pending claimant edited the public listing before approval.');

    const { data: afterClaim } = await ownerClient.rpc('list_claimable_vendors_for_current_email');
    if (afterClaim?.some((listing) => listing.id === vendorId)) {
      throw new Error('Listing with a pending claim remained eligible for another request.');
    }

    console.log('Reviewed claim submission integration test passed.');
  } finally {
    if (claimRequestId) await serviceClient.from('claim_requests').delete().eq('id', claimRequestId);
    if (vendorId) await serviceClient.from('vendors').delete().eq('id', vendorId);
    if (ownerId) await serviceClient.auth.admin.deleteUser(ownerId);
    if (otherId) await serviceClient.auth.admin.deleteUser(otherId);
  }
}

runTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
