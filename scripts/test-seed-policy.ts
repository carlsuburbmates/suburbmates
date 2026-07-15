import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { sourceKeyFor } from './seed';
import { extractUniqueLookups } from './seed';

const tempDir = path.resolve(process.cwd(), '.tmp-test-seed');

function setup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir);
}

function cleanup() {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function getTodayAest(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

function runSeed(filePath: string, env: Record<string, string> = {}): { success: boolean, output: string } {
  try {
    const output = execSync(`npx tsx --env-file=.env.local scripts/seed.ts --dry-run ${filePath}`, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      env: { ...process.env, ...env }
    });
    return { success: true, output };
  } catch (error: any) {
    return { success: false, output: error.stdout + error.stderr };
  }
}

function runTests() {
  const today = getTodayAest();
  
  // Test 1: Valid candidate file reaches normal dry-run
  const validPath = path.join(tempDir, 'vendor-candidates.csv');
  const validCsv = `business_name,address,category_slug,suburb_slug,contact_email,phone,website,source_url,source_checked_on,verification_status,notes
Test Plumbing,"1 Example Street, Northcote VIC 3070",plumber,northcote,,0418 555 804,https://www.testplumbing.com/,https://www.testplumbing.com/plumber-northcote,${today},pending_review,Official service page at testplumbing.com explicitly states Plumber in Northcote.`;
  fs.writeFileSync(validPath, validCsv);
  
  const res1 = runSeed(validPath);
  if (!res1.success || !res1.output.includes('Validated Test Plumbing (catalogue:test-plumbing:northcote:plumber) [New/Existing-unknown: auto-publish]')) {
    console.error('Test 1 Failed: Valid candidate file should pass audit and reach dry-run validation (New).');
    console.error(res1.output);
    process.exit(1);
  }
  console.log('Test 1 Passed: Valid candidate file reaches normal dry-run validation path.');

  // Test 2: Structurally invalid candidate file is rejected before seeding
  const invalidPath = path.join(tempDir, 'vendor-candidates.csv'); // overwrites previous
  const invalidCsv = `business_name,address,category_slug,suburb_slug,contact_email,phone,website,source_url,source_checked_on,verification_status,notes
Bad Plumbing,,plumber,faketown,,0418 555 804,https://www.badplumbing.com/,https://www.badplumbing.com/plumber-northcote,${today},pending_review,`;
  fs.writeFileSync(invalidPath, invalidCsv);
  
  const res2 = runSeed(invalidPath);
  if (res2.success || !res2.output.includes('Audit failed:')) {
    console.error('Test 2 Failed: Invalid candidate file should be rejected by the audit gate.');
    console.error(res2.output);
    process.exit(1);
  }
  console.log('Test 2 Passed: Structurally invalid candidate file is rejected before seeding.');

  // Test 3: Non-candidate CSV is not subject to candidate-only policy
  const otherPath = path.join(tempDir, 'other-vendors.csv');
  const otherCsv = `business_name,address,category_slug,suburb_slug,contact_email,phone,website,source_url,source_checked_on,verification_status,notes
Generic Plumbing,"1 Example Street, Northcote VIC 3070",plumber,northcote,,0418 555 804,https://www.generic.com/,,,,`;
  fs.writeFileSync(otherPath, otherCsv);
  
  const res3 = runSeed(otherPath);
  if (!res3.success || !res3.output.includes('Validated Generic Plumbing (catalogue:generic-plumbing:northcote:plumber) [New/Existing-unknown: auto-publish]')) {
    console.error('Test 3 Failed: Non-candidate CSV should bypass audit and reach dry-run (New).');
    console.error(res3.output);
    process.exit(1);
  }
  console.log('Test 3 Passed: Non-candidate CSV is not subject to candidate-only policy.');

  // Test 4: A business without a vendor website can still be catalogued.
  const noWebsitePath = path.join(tempDir, 'vendor-candidates.csv');
  const noWebsiteCsv = `business_name,address,category_slug,suburb_slug,contact_email,phone,website,source_url,source_checked_on,verification_status,notes
No Website Plumbing,"1 Example Street, Northcote VIC 3070",plumber,northcote,hello@example.org,,,,,,Recorded from a public source page.`;
  fs.writeFileSync(noWebsitePath, noWebsiteCsv);
  const res4 = runSeed(noWebsitePath);
  if (!res4.success || !res4.output.includes('Validated No Website Plumbing (catalogue:no-website-plumbing:northcote:plumber) [New/Existing-unknown: auto-publish]')) {
    console.error('Test 4 Failed: Business without a website should reach dry-run validation (New).');
    console.error(res4.output);
    process.exit(1);
  }
  console.log('Test 4 Passed: Business without a website reaches normal validation.');

  // Test 5: Existing vendor preserves is_published (tests duplicate map preload logic)
  const existingPath = path.join(tempDir, 'other-vendors.csv');
  const existingCsv = `business_name,address,category_slug,suburb_slug,contact_email,phone,website,source_url,source_checked_on,verification_status,notes
Existing Plumbing,"1 Example Street, Northcote VIC 3070",plumber,northcote,,0418 555 804,https://www.generic.com/,,,,
Another Plumbing,"1 Example Street, Northcote VIC 3070",plumber,northcote,existing.email@test.com,0418 555 804,https://www.another.com/,,,,`;
  fs.writeFileSync(existingPath, existingCsv);
  const res5 = runSeed(existingPath, { TEST_MOCK_EXISTING_VENDOR: '1' });
  if (!res5.success || !res5.output.includes('Validated Existing Plumbing (catalogue:existing-plumbing:northcote:plumber) [Existing: preserve is_published]')) {
    console.error('Test 5 Failed: Existing business by source_key should preserve is_published status.');
    console.error(res5.output);
    process.exit(1);
  }
  if (!res5.success || !res5.output.includes('Validated Another Plumbing (catalogue:another-plumbing:northcote:plumber) [Existing: preserve is_published]')) {
    console.error('Test 5 Failed: Existing business by email should preserve is_published status.');
    console.error(res5.output);
    process.exit(1);
  }
  console.log('Test 5 Passed: Existing business duplicate detection uses preloaded maps successfully.');

  // Test 6: Incomplete candidate (only required fields) is valid
  const incompletePath = path.join(tempDir, 'vendor-candidates.csv');
  const incompleteCsv = `business_name,address,category_slug,suburb_slug,contact_email,phone,website,source_url,source_checked_on,verification_status,notes
Incomplete Plumbing,,plumber,northcote,,,,,,,Recorded from a flyer.`;
  fs.writeFileSync(incompletePath, incompleteCsv);
  
  // Also pass a fake Supabase URL to prove dry-run makes no network calls
  const res6 = runSeed(incompletePath, {
    SUPABASE_URL: 'http://localhost:9999/should-fail-if-called',
    SUPABASE_SECRET_KEY: 'fake-key-that-doesnt-matter'
  });
  
  if (!res6.success || !res6.output.includes('Validated Incomplete Plumbing (catalogue:incomplete-plumbing:northcote:plumber) [New/Existing-unknown: auto-publish]')) {
    console.error('Test 6 Failed: Incomplete candidate should reach dry-run validation (New).');
    console.error(res6.output);
    process.exit(1);
  }
  console.log('Test 6 Passed: Incomplete candidate reaches normal validation and proves dry-run makes absolutely zero database calls.');

  // Test 7: Different addressed locations with a legacy key remain distinct and stable.
  const existingLocations = new Map([
    ['catalogue:lui-boss:darebin:restaurant', { id: 'first-location', streetAddress: '298 High Street' }],
    ['catalogue:lui-boss:darebin:restaurant:1-cook-street', { id: 'second-location', streetAddress: '1 Cook Street' }],
  ]);
  const secondLocation = sourceKeyFor(
    { businessName: 'lui.boss', suburbSlug: 'darebin', categorySlug: 'restaurant', address: '1 Cook Street' },
    existingLocations,
  );
  if (secondLocation !== 'catalogue:lui-boss:darebin:restaurant:1-cook-street' || !existingLocations.has(secondLocation)) {
    console.error('Test 7 Failed: A distinct addressed location must receive and reuse an address-qualified key.');
    process.exit(1);
  }
  console.log('Test 7 Passed: Different addressed locations receive stable distinct source keys.');

  // Test 7: extractUniqueLookups deduplicates repeated slugs
  const mockRecords = [
    { category_slug: 'plumber', suburb_slug: 'northcote' },
    { category_slug: 'plumber', suburb_slug: 'preston' },
    { category_slug: 'electrician', suburb_slug: 'northcote' },
    { category_slug: ' Plumber ', suburb_slug: ' Preston ' }
  ];
  
  const { categories, suburbs } = extractUniqueLookups(mockRecords);
  if (categories.size !== 2 || !categories.has('plumber') || !categories.has('electrician')) {
    console.error(`Test 7 Failed: Categories not deduplicated properly. Got ${categories.size}`);
    process.exit(1);
  }
  if (suburbs.size !== 2 || !suburbs.has('northcote') || !suburbs.has('preston')) {
    console.error(`Test 7 Failed: Suburbs not deduplicated properly. Got ${suburbs.size}`);
    process.exit(1);
  }
  console.log('Test 7 Passed: Unique lookup preparation deduplicates repeated slugs properly.');

  console.log('\nAll seed policy tests passed!');
}

setup();
try {
  runTests();
} finally {
  cleanup();
}
