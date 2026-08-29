import { cuisineProfileDetail, filterAndProcessElements, firstListedPhone, osmProfileDetail, osmTradingHours, slugify, escapeCsv, getTodayAest, requestFromOverpassEndpoints, requestOverpass } from './acquire-openstreetmap';
import assert from 'node:assert';

async function runTests() {
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
  const cuisine = filterAndProcessElements([{ type: 'node', id: '3', tags: { name: 'Pasta Place', amenity: 'restaurant', cuisine: 'italian;pizza' } }], catchments);
  assert.strictEqual(cuisine[0].description, 'Cuisine: Italian, Pizza.', 'A structured OSM cuisine tag should become a concise sourced profile detail.');
  assert.strictEqual(cuisineProfileDetail('italian', 'plumber'), '', 'Cuisine must not decorate non-food categories.');
  const hospitalityDetails = osmProfileDetail({ cuisine: 'italian', takeaway: 'yes', outdoor_seating: 'yes', 'diet:vegan': 'only' }, 'restaurant');
  assert.strictEqual(hospitalityDetails, 'Cuisine: Italian. Takeaway available. Outdoor seating. Vegan menu.', 'Structured hospitality tags should become bounded source-derived profile facts.');
  assert.strictEqual(osmProfileDetail({ takeaway: 'no', delivery: 'no', outdoor_seating: 'yes' }, 'plumber'), '', 'Hospitality facts must not decorate unrelated categories or treat no as availability.');
  assert.strictEqual(osmTradingHours('Mo-Fr 09:00-17:00; Sa 09:00-13:00'), 'Mo-Fr 09:00-17:00; Sa 09:00-13:00', 'An explicit OSM schedule should be retained without rewriting it.');
  assert.strictEqual(osmTradingHours('by appointment'), '', 'A prose-only OSM hours value must not become a public schedule.');
  assert.strictEqual(firstListedPhone('+61 425 306 991;+61 424 574 844'), '+61 425 306 991', 'Multiple OSM phone values must not make the full candidate run fail.');

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

  // Test 8: Melbourne dates stay ISO-formatted across a UTC day boundary.
  assert.strictEqual(getTodayAest(new Date('2026-07-18T14:30:00Z')), '2026-07-19');

  // Test 9: an Overpass response must be successful JSON with an elements array.
  const response = await requestOverpass('https://example.test/interpreter', '[out:json];', async () => ({
    ok: true,
    status: 200,
    json: async () => ({ elements: [] }),
  }) as Response);
  assert.deepStrictEqual(response.elements, []);
  await assert.rejects(
    requestOverpass('https://example.test/interpreter', '[out:json];', async () => ({
      ok: true,
      status: 200,
      json: async () => ({ invalid: true }),
    }) as Response),
    /invalid Overpass response/,
  );

  // Test 10: a failed provider leaves a clear trail and the next provider can supply the evidence.
  const attemptedEndpoints: string[] = [];
  const fallbackResponse = await requestFromOverpassEndpoints(
    ['https://first.example.test/interpreter', 'https://second.example.test/interpreter'],
    '[out:json];',
    async (endpoint) => {
      attemptedEndpoints.push(String(endpoint));
      if (String(endpoint).includes('first')) {
        throw new Error('provider unavailable');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ elements: [] }),
      } as Response;
    },
  );
  assert.deepStrictEqual(attemptedEndpoints, [
    'https://first.example.test/interpreter',
    'https://second.example.test/interpreter',
  ]);
  assert.deepStrictEqual(fallbackResponse.elements, []);

  console.log('All tests passed.');
}

if (process.argv[1] && process.argv[1].endsWith('test-acquire-openstreetmap.ts')) {
  runTests().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
