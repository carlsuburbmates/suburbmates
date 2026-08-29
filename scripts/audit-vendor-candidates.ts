import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const ALLOWED_SUBURBS = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/darebin-catchment.json'), 'utf8'));
const HTML_ENTITY_REGEX = /&[a-zA-Z]+;|&#\d+;/;

function isGeneric(name: string): boolean {
  const generic = ['home', 'about', 'welcome', 'index', 'contact', 'services'];
  return generic.includes(name.trim().toLowerCase());
}

function checkUrl(urlString: string, fieldName: string, required = true): string[] {
  const errors: string[] = [];
  if (!urlString) {
    if (required) errors.push(`${fieldName} is missing`);
    return errors;
  }
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'https:') {
      errors.push(`${fieldName} must use https: protocol`);
    }
  } catch {
    errors.push(`${fieldName} is not a valid URL`);
  }
  return errors;
}

export function validateRow(record: any, todayAest: string): string[] {
  const rowErrors: string[] = [];

  // Check categories and suburbs
  if (!record.category_slug || !VALID_SLUG.test(record.category_slug)) {
    rowErrors.push(`Category '${record.category_slug}' is invalid (must be non-empty valid slug)`);
  }
  
  if (!ALLOWED_SUBURBS.includes(record.suburb_slug)) {
    rowErrors.push(`Suburb '${record.suburb_slug}' is not in allowlist`);
  }
  
  // Check URLs
  rowErrors.push(...checkUrl(record.website, 'website', false));
  rowErrors.push(...checkUrl(record.source_url, 'source_url', false));

  // Email check
  if (record.contact_email) {
    const email = record.contact_email.toLowerCase();
    if (email.includes('example.com') || email.includes('domain.com')) {
      rowErrors.push(`Placeholder email rejected: ${record.contact_email}`);
    }
  }
  
  // Phone check
  if (record.phone) {
    const p = record.phone.trim();
    const norm = p.replace(/[\s\-\(\)]/g, '');
    const isE164 = /^\+[1-9]\d{7,14}$/.test(norm);
    
    // Australian geographic/mobile: 02, 03, 04, 07, 08 (and matching 61/+61 variants)
    const isAusGeoMobile = /^(0[23478]|61[23478]|\+61[23478])\d{8}$/.test(norm);
    
    // Australian service numbers: 13, 1300, 1800
    const isService = /^(13\d{4}|1300\d{6}|1800\d{6})$/.test(norm);
    
    if (!(isE164 || isAusGeoMobile || isService)) {
      rowErrors.push(`Malformed phone number (must be valid E.164, Australian 02/03/04/07/08 or +61 variant, or 13/1300/1800 service number): ${record.phone}`);
    }
  }
  
  // HTML entities across all fields
  const allValues = [
    record.business_name, record.address, record.category_slug, record.suburb_slug, record.description,
    record.contact_email, record.phone, record.website, 
    record.source_url, record.source_checked_on, record.verification_status, record.notes
  ];
  if (allValues.some(val => val && HTML_ENTITY_REGEX.test(val))) {
    rowErrors.push('HTML entities found in candidate fields');
  }
  
  // Business name generic check
  if (isGeneric(record.business_name || '')) {
    rowErrors.push(`Generic business name rejected: ${record.business_name}`);
  }
  
  // Notes preserve provenance for later publication review; they are not proof gates.
  const notes = (record.notes || '').trim().toLowerCase();
  if (!notes) {
    rowErrors.push('Notes must record the source or any known evidence limitation');
  }
  
  return rowErrors;
}

export function getTodayAest(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

export function auditFile(csvPath: string, reportAndExit: boolean = false): boolean {
  const csvData = fs.readFileSync(csvPath, 'utf8');
  const records = parse(csvData, { columns: true, skip_empty_lines: true });
  
  let failures = 0;
  let rowIdx = 1;
  const cats: Record<string, number> = {};
  const subs: Record<string, number> = {};
  
  const todayAest = getTodayAest();

  for (const record of records) {
    rowIdx++;
    const rowErrors = validateRow(record, todayAest);
    
    cats[record.category_slug] = (cats[record.category_slug] || 0) + 1;
    subs[record.suburb_slug] = (subs[record.suburb_slug] || 0) + 1;
    
    if (rowErrors.length > 0) {
      if (reportAndExit) {
        console.error(`Row ${rowIdx} (${record.business_name || 'unnamed'}):`);
        for (const err of rowErrors) {
          console.error(`  - ${err}`);
        }
      }
      failures++;
    }
  }
  
  if (reportAndExit) {
    console.log('\n--- Distribution ---');
    console.log('Categories:', cats);
    console.log('Suburbs:', subs);
    console.log('--------------------');
    
    if (failures > 0) {
      console.error(`\nAudit failed: ${failures} rows contain errors.`);
      process.exit(1);
    } else {
      console.log('\nAudit passed. All candidates meet catalogue data-hygiene requirements.');
    }
  }
  
  return failures === 0;
}

async function runAudit() {
  if (process.argv[1] && !process.argv[1].endsWith('audit-vendor-candidates.ts')) {
    return;
  }
  const csvPath = path.resolve(process.cwd(), process.argv[2] || 'data/vendor-candidates.csv');
  auditFile(csvPath, true);
}

runAudit();
