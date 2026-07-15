import { validateRow } from './audit-vendor-candidates';

function getTodayAest(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(new Date());
}

const today = getTodayAest();

const validRecord = {
  business_name: 'Super Plumbers',
  address: '1 Example Street, Northcote VIC 3070',
  category_slug: 'plumber',
  suburb_slug: 'northcote',
  contact_email: 'hello@superplumbers.com.au',
  phone: '0400123456',
  website: 'https://superplumbers.com.au',
  source_url: 'https://superplumbers.com.au/contact',
  source_checked_on: today,
  verification_status: 'pending_review',
  notes: 'Found official website with clear pricing and ABN. Phone number verified.'
};

const tests = [
  {
    name: 'Valid record passes',
    record: { ...validRecord },
    expectFail: false
  },
  {
    name: 'Invalid category_slug',
    record: { ...validRecord, category_slug: 'fake cat' },
    expectFail: true,
    errorMatch: /Category 'fake cat' is invalid/
  },
  {
    name: 'Invalid suburb_slug',
    record: { ...validRecord, suburb_slug: 'fakesuburb' },
    expectFail: true,
    errorMatch: /Suburb 'fakesuburb' is not in allowlist/
  },
  {
    name: 'Missing vendor website passes',
    record: { ...validRecord, website: '' },
    expectFail: false
  },
  {
    name: 'Malformed website (not URL)',
    record: { ...validRecord, website: 'https://not a valid host' },
    expectFail: true,
    errorMatch: /website is not a valid URL/
  },
  {
    name: 'Malformed website (just protocol)',
    record: { ...validRecord, website: 'https://' },
    expectFail: true,
    errorMatch: /website is not a valid URL/
  },
  {
    name: 'Website HTTP instead of HTTPS',
    record: { ...validRecord, website: 'http://superplumbers.com.au' },
    expectFail: true,
    errorMatch: /website must use https:/
  },
  {
    name: 'Missing source_url',
    record: { ...validRecord, source_url: '' },
    expectFail: false
  },
  {
    name: 'source_url HTTP instead of HTTPS',
    record: { ...validRecord, source_url: 'http://superplumbers.com.au/contact' },
    expectFail: true,
    errorMatch: /source_url must use https:/
  },
  {
    name: 'Independent source URL passes',
    record: { ...validRecord, website: '', source_url: 'https://example.com/superplumbers' },
    expectFail: false
  },
  {
    name: 'HTML entity in business_name',
    record: { ...validRecord, business_name: 'Super &amp; Plumbers' },
    expectFail: true,
    errorMatch: /HTML entities found/
  },
  {
    name: 'HTML entity in notes',
    record: { ...validRecord, notes: 'Found &#123; ABN.' },
    expectFail: true,
    errorMatch: /HTML entities found/
  },
  {
    name: 'Brief provenance note passes',
    record: { ...validRecord, notes: 'Imported from the business website.' },
    expectFail: false
  },
  {
    name: 'Missing notes fail',
    record: { ...validRecord, notes: '' },
    expectFail: true,
    errorMatch: /Notes must record the source/
  },
  {
    name: 'Generic business name',
    record: { ...validRecord, business_name: 'Home ' },
    expectFail: true,
    errorMatch: /Generic business name rejected/
  },
  {
    name: 'Placeholder email example.com',
    record: { ...validRecord, contact_email: 'test@example.com' },
    expectFail: true,
    errorMatch: /Placeholder email rejected/
  },
  {
    name: 'Malformed phone (arbitrary 8 digits)',
    record: { ...validRecord, phone: '12345678' },
    expectFail: true,
    errorMatch: /Malformed phone number \(must be valid E\.164/
  },
  {
    name: 'Malformed phone (starts with 01)',
    record: { ...validRecord, phone: '0199999999' },
    expectFail: true,
    errorMatch: /Malformed phone number \(must be valid E\.164/
  },
  {
    name: 'Malformed phone (starts with 619)',
    record: { ...validRecord, phone: '6199999999' },
    expectFail: true,
    errorMatch: /Malformed phone number \(must be valid E\.164/
  },
  {
    name: 'Valid phone format (1300)',
    record: { ...validRecord, phone: '1300 123 456' },
    expectFail: false
  },
  {
    name: 'Valid phone format (1800)',
    record: { ...validRecord, phone: '1800 123 456' },
    expectFail: false
  },
  {
    name: 'Valid phone format (13)',
    record: { ...validRecord, phone: '13 12 34' },
    expectFail: false
  },
  {
    name: 'Valid phone format (+61 4)',
    record: { ...validRecord, phone: '+61 400 123 456' },
    expectFail: false
  },
  {
    name: 'Valid phone format (04)',
    record: { ...validRecord, phone: '0400 123 456' },
    expectFail: false
  },
  {
    name: 'Valid phone format (03)',
    record: { ...validRecord, phone: '03 9123 4567' },
    expectFail: false
  },
  {
    name: 'Missing address passes',
    record: { ...validRecord, address: '' },
    expectFail: false
  },
  {
    name: 'Missing contact method passes',
    record: { ...validRecord, contact_email: '', phone: '' },
    expectFail: false
  }
];

let failed = 0;
for (const test of tests) {
  const errors = validateRow(test.record, today);
  const hasErrors = errors.length > 0;
  
  if (test.expectFail && !hasErrors) {
    console.error(`FAIL: ${test.name} - Expected to fail but passed.`);
    failed++;
  } else if (!test.expectFail && hasErrors) {
    console.error(`FAIL: ${test.name} - Expected to pass but failed with errors: ${errors.join(', ')}`);
    failed++;
  } else if (test.expectFail && test.errorMatch) {
    const matched = errors.some(e => test.errorMatch!.test(e));
    if (!matched) {
      console.error(`FAIL: ${test.name} - Failed as expected, but didn't match error regex ${test.errorMatch}. Errors: ${errors.join(', ')}`);
      failed++;
    }
  }
}

if (failed > 0) {
  console.error(`\nTest suite failed. ${failed} tests failed.`);
  process.exit(1);
} else {
  console.log('All tests passed! The audit script logic correctly catches bad candidate data.');
}
