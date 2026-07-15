import { filterAndProcessElements, slugify, escapeCsv, COMMERCIAL_AMENITIES } from './acquire-openstreetmap';
import assert from 'node:assert';

function runTests() {
  const catchments = ['northcote', 'preston', 'darebin'];
  
  // Test 1: filter out missing name
  const missingName = filterAndProcessElements([{ type: 'node', id: '1', tags: { shop: 'bakery' } }], catchments);
  assert.strictEqual(missingName.length, 0, 'Should filter out missing name');
  
  // Test 2: category fallback
  const fallbackCat = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Test', office: 'architect', craft: 'builder', shop: 'gift' } }], catchments);
  assert.strictEqual(fallbackCat[0].category_slug, 'gift', 'Shop should take precedence');

  // Test 3: amenities and non-commercial overrides
  const exclSchool = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Local School', amenity: 'school' } }], catchments);
  assert.strictEqual(exclSchool.length, 0, 'Should exclude school');

  const exclKindergarten = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Kindergarten', amenity: 'kindergarten' } }], catchments);
  assert.strictEqual(exclKindergarten.length, 0, 'Should exclude kindergarten');

  const inclCommercial = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Cool Cafe', amenity: 'cafe' } }], catchments);
  assert.strictEqual(inclCommercial.length, 1, 'Should include commercial amenity like cafe');

  const exclEduOffice = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Virtual School', office: 'educational_institution' } }], catchments);
  assert.strictEqual(exclEduOffice.length, 0, 'Should exclude educational_institution even if it is an office');

  const exclNgoShop = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Charity Shop', shop: 'charity' } }], catchments);
  assert.strictEqual(exclNgoShop.length, 0, 'Should exclude charity even if it is a shop');

  const exclCompoundToken = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Student Union', office: 'la_trobe_university_student_union' } }], catchments);
  assert.strictEqual(exclCompoundToken.length, 0, 'Should exclude compound non-commercial tag like la_trobe_university_student_union');

  // Test 4: suburb fallback
  const subFall = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'No Suburb', shop: 'bakery' } }], catchments);
  assert.strictEqual(subFall[0].suburb_slug, 'darebin', 'Should fallback to darebin');

  const subValid = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Northcote Bakery', shop: 'bakery', 'addr:suburb': 'Northcote' } }], catchments);
  assert.strictEqual(subValid[0].suburb_slug, 'northcote', 'Should use valid suburb');

  const subInvalid = filterAndProcessElements([{ type: 'node', id: '1', tags: { name: 'Fake Suburb Bakery', shop: 'bakery', 'addr:suburb': 'Faketown' } }], catchments);
  assert.strictEqual(subInvalid[0].suburb_slug, 'darebin', 'Should fallback to darebin for non-catchment suburb');

  // Test 5: deduplication
  const dupes = [
    { type: 'node', id: '1', tags: { name: 'Dup Bakery', shop: 'bakery', 'addr:suburb': 'Northcote' } },
    { type: 'node', id: '2', tags: { name: 'Dup Bakery', shop: 'bakery', 'addr:suburb': 'Northcote', 'contact:phone': '123' } }
  ];
  const dedup = filterAndProcessElements(dupes, catchments);
  assert.strictEqual(dedup.length, 1, 'Should deduplicate identical name/cat/suburb');

  // Test 6: slugify
  assert.strictEqual(slugify('Ice Cream & Gelato!'), 'ice-cream-gelato');

  // Test 7: CSV escaping
  assert.strictEqual(escapeCsv('Hello'), 'Hello');
  assert.strictEqual(escapeCsv('Hello, World'), '"Hello, World"');
  assert.strictEqual(escapeCsv('Hello "World"'), '"Hello ""World"""');
  assert.strictEqual(escapeCsv('Line\nBreak'), '"Line\nBreak"');

  console.log('All tests passed.');
}

if (process.argv[1] && process.argv[1].endsWith('test-acquire-openstreetmap.ts')) {
  runTests();
}
