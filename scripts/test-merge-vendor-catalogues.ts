import assert from 'node:assert';
import { mergeRecords, isDuplicate, normalizeString, GENERIC_CATEGORIES } from './merge-vendor-catalogues.js';
import { parse } from 'csv-parse/sync';

function runTests() {
  console.log('Running merge tests...');

  // Test 1: normalizeString
  assert.strictEqual(normalizeString('  Cafe & Bar 123! '), 'cafe bar 123', 'Should lower and remove punctuation');

  // Test 2: Exact dedupe (name + exact address)
  const manual1 = { business_name: 'The Cafe', address: '123 High St', suburb_slug: 'preston', notes: 'Manual' };
  const osm1 = { business_name: 'The Cafe', address: '123 High St.', suburb_slug: 'preston', notes: 'OSM' };
  assert.strictEqual(isDuplicate(manual1, osm1), true, 'Exact dedupe by name and address should match');

  // Test 3: Generic darebin fallback match
  const manual2 = { business_name: 'Joe Plumber', address: '', suburb_slug: 'northcote', notes: 'Manual' };
  const osm2 = { business_name: 'Joe Plumber', address: '', suburb_slug: 'darebin', notes: 'OSM' };
  assert.strictEqual(isDuplicate(manual2, osm2), true, 'Darebin generic fallback should match catchment suburb');

  // Test 4: Manual priority enrichment and note appending
  const manual3 = { business_name: 'Hair Salon', category_slug: 'hairdresser', address: '', phone: '', notes: 'Verified' };
  const osm3 = { business_name: 'Hair Salon', category_slug: 'hairdresser', address: '456 High St', phone: '1300000000', notes: 'OSM Source' };
  
  const { merged: mergedA } = mergeRecords([manual3], [osm3]);
  assert.strictEqual(mergedA.length, 1, 'Should deduplicate');
  assert.strictEqual(mergedA[0].address, '456 High St', 'Should enrich missing address');
  assert.strictEqual(mergedA[0].phone, '1300000000', 'Should enrich missing phone');
  assert.strictEqual(mergedA[0].category_slug, 'hairdresser', 'Should keep manual category');
  assert.strictEqual(mergedA[0].notes, 'Verified | OSM Source', 'Should append notes');

  // Test 5: Category mapping for generic OSM categories
  const manualEmpty = [];
  const osmGeneric = [
    { business_name: 'General Store', category_slug: 'yes', suburb_slug: 'preston', notes: 'Initial' },
    { business_name: 'Some Company', category_slug: 'company', suburb_slug: 'northcote', notes: '' }
  ];

  const { merged: mergedB } = mergeRecords(manualEmpty, osmGeneric);
  assert.strictEqual(mergedB.length, 2, 'Should keep both');
  assert.strictEqual(mergedB[0].category_slug, 'local-business', 'Should map generic category');
  assert.strictEqual(mergedB[0].notes, 'Initial | OSM Category: yes', 'Should append mapped category to notes');
  assert.strictEqual(mergedB[1].category_slug, 'local-business', 'Should map generic category');
  assert.strictEqual(mergedB[1].notes, 'OSM Category: company', 'Should create notes with mapped category');

  // Test 6: Quoted CSV parsing safety
  const rawCsv = `"business_name","address","suburb_slug"\n"Bob, The Builder","123, High St","preston"\n`;
  const parsed = parse(rawCsv, { columns: true });
  assert.strictEqual(parsed[0].business_name, 'Bob, The Builder', 'Should parse quotes correctly');

  console.log('All tests passed.');
}

runTests();
