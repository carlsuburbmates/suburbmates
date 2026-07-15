import { createClient } from '@supabase/supabase-js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { auditFile } from './audit-vendor-candidates';

// Usage: npx tsx --env-file=.env.local scripts/seed.ts data/initial_vendors.csv
const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = SUPABASE_URL && SUPABASE_SECRET_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SECRET_KEY ' +
        '(or the legacy NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY names).',
    );
  }
  return supabase;
}

const REQUIRED_HEADERS = ['business_name', 'category_slug', 'suburb_slug'] as const;
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NEW_IMPORT_LISTING_SOURCE = 'approved_import' as const;

type CsvRecord = Record<string, string>;
type LookupTable = 'categories' | 'suburbs';
type ExistingVendor = { id: string; streetAddress: string | null };

export function importPublicationPolicy(existingId: string | null): {
  label: string;
  isPublished?: false;
} {
  if (existingId) {
    return { label: 'Existing: preserve publication state' };
  }

  return {
    label: 'New: keep unpublished for operator review',
    isPublished: false,
  };
}

function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < input.length; index++) {
    const character = input[index];

    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        value += '"';
        index++;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(value.trim());
      value = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && input[index + 1] === '\n') index++;
      row.push(value.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      value = '';
    } else {
      value += character;
    }
  }

  if (quoted) throw new Error('CSV contains an unterminated quoted field.');

  row.push(value.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);

  return rows;
}

function recordsFromCsv(input: string): CsvRecord[] {
  const rows = parseCsv(input.replace(/^\uFEFF/, ''));
  if (rows.length === 0) throw new Error('CSV is empty.');

  const headers = rows[0];
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`CSV is missing required header(s): ${missingHeaders.join(', ')}`);
  }

  if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate headers.');

  return rows.slice(1).map((values, rowIndex) => {
    if (values.length > headers.length) {
      throw new Error(`CSV row ${rowIndex + 2} has more values than headers.`);
    }

    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });
}

function displayNameFromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeWebsite(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`invalid website URL "${value}"`);
  }

  return url.toString();
}

function normalizeCheckedOn(value: string): string {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || Number.isNaN(Date.parse(`${trimmed}T00:00:00Z`))) {
    throw new Error(`invalid source checked-on date "${value}"`);
  }

  return trimmed;
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function baseSourceKeyFor(record: { businessName: string; suburbSlug: string; categorySlug: string }): string {
  return `catalogue:${normalizeIdentity(record.businessName)}:${normalizeIdentity(record.suburbSlug)}:${record.categorySlug}`;
}

export function sourceKeyFor(
  record: { businessName: string; suburbSlug: string; categorySlug: string; address?: string },
  vendorsBySourceKey: Map<string, ExistingVendor> = new Map(),
): string {
  const baseKey = baseSourceKeyFor(record);
  const existing = vendorsBySourceKey.get(baseKey);
  const address = record.address ? normalizeIdentity(record.address) : '';

  // Keep legacy keys stable, but distinguish same-name businesses at different locations.
  if (existing?.streetAddress && address && normalizeIdentity(existing.streetAddress) !== address) {
    return `${baseKey}:${address}`;
  }

  return baseKey;
}

async function ensureLookup(table: LookupTable, slug: string): Promise<void> {
  const { error } = await requireSupabase().from(table).upsert(
    { slug, name: displayNameFromSlug(slug) },
    { onConflict: 'slug', ignoreDuplicates: true },
  );

  if (error) throw new Error(`Could not ensure ${table} row "${slug}": ${error.message}`);
}

async function loadExistingVendors(): Promise<Array<{
  id: string;
  contact_email: string | null;
  source_key: string | null;
  street_address: string | null;
}>> {
  const pageSize = 1000;
  const vendors: Array<{
    id: string;
    contact_email: string | null;
    source_key: string | null;
    street_address: string | null;
  }> = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await requireSupabase()
      .from('vendors')
      .select('id, contact_email, source_key, street_address')
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`Failed to preload existing vendors: ${error.message}`);

    vendors.push(...data);
    if (data.length < pageSize) return vendors;
  }
}

async function runSeed(): Promise<void> {
  const arguments_ = process.argv.slice(2);
  const dryRun = arguments_.includes('--dry-run');
  const csvFilePath = arguments_.find((argument) => argument !== '--dry-run');
  if (!csvFilePath) {
    throw new Error(
      'Provide a CSV path. Example: npm run seed -- --dry-run data/vendor-candidates.csv',
    );
  }

  const absolutePath = path.resolve(process.cwd(), csvFilePath);
  const inputFilename = path.basename(absolutePath);

  if (inputFilename.startsWith('vendor-candidates') || inputFilename === 'vendor-import-ready.csv') {
    const passed = auditFile(absolutePath, true);
    if (!passed) {
      throw new Error('Audit failed for vendor-candidates.csv. Fix the errors before seeding.');
    }
  }

  const records = recordsFromCsv(fs.readFileSync(absolutePath, 'utf8'));
  let succeeded = 0;
  let failed = 0;

  console.log(`Found ${records.length} record(s) to process.`);

  let vendorsByEmail = new Map<string, ExistingVendor>();
  let vendorsBySourceKey = new Map<string, ExistingVendor>();

  if (!dryRun) {
    console.log('Preloading existing vendors...');
    const existingVendors = await loadExistingVendors();
    
    for (const v of existingVendors) {
      const existing = { id: v.id, streetAddress: v.street_address };
      if (v.contact_email) vendorsByEmail.set(v.contact_email.toLowerCase(), existing);
      if (v.source_key) vendorsBySourceKey.set(v.source_key, existing);
    }
    console.log(`Preloaded ${existingVendors.length} existing vendors.`);
    
    const { categories, suburbs } = extractUniqueLookups(records);
    for (const category of categories) {
      await ensureLookup('categories', category);
    }
    for (const suburb of suburbs) {
      await ensureLookup('suburbs', suburb);
    }
    console.log(`Ensured ${categories.size} unique categories and ${suburbs.size} unique suburbs.`);
  } else if (process.env.TEST_MOCK_EXISTING_VENDOR === '1') {
    vendorsBySourceKey.set('catalogue:existing-plumbing:northcote:plumber', { id: 'mock-existing-id', streetAddress: null });
    vendorsByEmail.set('existing.email@test.com', { id: 'mock-email-id', streetAddress: null });
  }

  for (const [index, record] of records.entries()) {
    const lineNumber = index + 2;
    const businessName = record.business_name.trim();
    const address = record.address?.trim();
    const categorySlug = normalizeSlug(record.category_slug);
    const suburbSlug = normalizeSlug(record.suburb_slug);
    const contactEmail = record.contact_email?.trim().toLowerCase();
    const phone = record.phone?.trim();

    try {
      const website = record.website?.trim() ? normalizeWebsite(record.website) : undefined;
      const sourceUrl = record.source_url?.trim() ? normalizeWebsite(record.source_url) : undefined;
      const sourceCheckedOn = record.source_checked_on?.trim()
        ? normalizeCheckedOn(record.source_checked_on)
        : undefined;
      const verificationStatus = record.verification_status?.trim() || undefined;
      const sourceNotes = record.notes?.trim() || undefined;

      if (!businessName || !categorySlug || !suburbSlug) {
        throw new Error('missing a required value');
      }
      if (!VALID_SLUG.test(categorySlug)) throw new Error(`invalid category slug "${categorySlug}"`);
      if (!VALID_SLUG.test(suburbSlug)) throw new Error(`invalid suburb slug "${suburbSlug}"`);
      if (contactEmail && !VALID_EMAIL.test(contactEmail)) throw new Error(`invalid contact email "${contactEmail}"`);
      const sourceKey = sourceKeyFor({ businessName, suburbSlug, categorySlug, address }, vendorsBySourceKey);

      let existingId = null;
      if (contactEmail && vendorsByEmail.has(contactEmail)) {
        existingId = vendorsByEmail.get(contactEmail)?.id ?? null;
      }
      if (!existingId && vendorsBySourceKey.has(sourceKey)) {
        existingId = vendorsBySourceKey.get(sourceKey)?.id ?? null;
      }

      if (dryRun) {
        succeeded++;
        const publicationPolicy = importPublicationPolicy(existingId);
        console.log(`Validated ${businessName} (${sourceKey}) [${publicationPolicy.label}]`);
        continue;
      }

      const vendor: Record<string, any> = {
        business_name: businessName,
        category_slug: categorySlug,
        suburb_slug: suburbSlug,
        source_key: sourceKey,
      };

      // Empty optional CSV fields preserve existing vendor values during an update.
      if (address) vendor.street_address = address;
      if (contactEmail) vendor.contact_email = contactEmail;
      if (phone) vendor.phone = phone;
      if (website) vendor.website = website;
      if (sourceUrl) vendor.source_url = sourceUrl;
      if (sourceCheckedOn) vendor.source_checked_on = sourceCheckedOn;
      if (verificationStatus) vendor.verification_status = verificationStatus;
      if (sourceNotes) vendor.source_notes = sourceNotes;

      let queryResult;
      if (existingId) {
        queryResult = await requireSupabase().from('vendors').update(vendor).eq('id', existingId).select('id').single();
      } else {
        const publicationPolicy = importPublicationPolicy(existingId);
        vendor.is_published = publicationPolicy.isPublished;
        vendor.listing_status = 'pending_review';
        vendor.listing_source = NEW_IMPORT_LISTING_SOURCE;
        // Insert rather than upsert so a concurrent duplicate cannot have its
        // existing publication state changed by an import race.
        queryResult = await requireSupabase().from('vendors').insert(vendor).select('id').single();
      }

      const { data, error } = queryResult;
      if (error) throw new Error(`vendor upsert failed: ${error.message}`);

      succeeded++;
      console.log(`Upserted ${businessName} (ID: ${data.id})`);
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed line ${lineNumber} (${businessName || 'unnamed vendor'}): ${message}`);
    }
  }

  console.log(`Seeding complete: ${succeeded} succeeded, ${failed} failed.`);
  if (failed > 0) process.exitCode = 1;
}

export function extractUniqueLookups(records: CsvRecord[]): { categories: Set<string>; suburbs: Set<string> } {
  const categories = new Set<string>();
  const suburbs = new Set<string>();
  
  for (const record of records) {
    if (record.category_slug) {
      const slug = normalizeSlug(record.category_slug);
      if (VALID_SLUG.test(slug)) categories.add(slug);
    }
    if (record.suburb_slug) {
      const slug = normalizeSlug(record.suburb_slug);
      if (VALID_SLUG.test(slug)) suburbs.add(slug);
    }
  }
  
  return { categories, suburbs };
}

if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  runSeed().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Seed failed: ${message}`);
    process.exitCode = 1;
  });
}
