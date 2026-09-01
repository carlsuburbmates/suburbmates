import { cuisineProfileDetail, filterAndProcessElements, firstListedPhone, osmProfileDetail, osmSocialProfileUrl, osmTradingHours, slugify, escapeCsv, getTodayAest, requestFromOverpassEndpoints, requestOverpass } from './acquire-openstreetmap';
import assert from 'node:assert';
import { resolveVictorianLocality, type VictorianLocalityBoundary } from '../web/src/lib/automation/victorian-locality-boundaries';

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
  const healthcare = filterAndProcessElements([{ type: 'node', id: '2', tags: { name: 'Local Optometry', healthcare: 'optometrist' } }], catchments);
  assert.strictEqual(healthcare[0].category_slug, 'optician', 'An explicit OSM optometrist feature should use the existing Optician category.');
  const fitness = filterAndProcessElements([{ type: 'node', id: '4', tags: { name: 'Local Fitness', leisure: 'fitness_centre' } }], catchments);
  assert.strictEqual(fitness[0].category_slug, 'fitness', 'An explicit OSM fitness centre should use the dedicated Fitness category.');
  const accommodation = filterAndProcessElements([{ type: 'node', id: '5', tags: { name: 'Local Motel', tourism: 'motel' } }], catchments);
  assert.strictEqual(accommodation[0].category_slug, 'accommodation', 'An explicit OSM motel should use the dedicated Accommodation category.');
  const excludedPark = filterAndProcessElements([{ type: 'node', id: '6', tags: { name: 'Local Park', leisure: 'park' } }], catchments);
  assert.strictEqual(excludedPark.length, 0, 'Parks must not enter the commercial directory feed.');
  const excludedClinic = filterAndProcessElements([{ type: 'node', id: '7', tags: { name: 'Community Clinic', healthcare: 'clinic' } }], catchments);
  assert.strictEqual(excludedClinic.length, 0, 'Ambiguous healthcare classifications must not enter through the expanded source scope.');
  const excludedHostel = filterAndProcessElements([{ type: 'node', id: '8', tags: { name: 'Local Hostel', tourism: 'hostel' } }], catchments);
  assert.strictEqual(excludedHostel.length, 0, 'Hostels must not be presumed commercial accommodation.');
  const cuisine = filterAndProcessElements([{ type: 'node', id: '3', tags: { name: 'Pasta Place', amenity: 'restaurant', cuisine: 'italian;pizza' } }], catchments);
  assert.strictEqual(cuisine[0].description, 'Cuisine: Italian, Pizza.', 'A structured OSM cuisine tag should become a concise sourced profile detail.');
  assert.strictEqual(cuisineProfileDetail('italian', 'plumber'), '', 'Cuisine must not decorate non-food categories.');
  const hospitalityDetails = osmProfileDetail({ cuisine: 'italian', takeaway: 'yes', outdoor_seating: 'yes', 'diet:vegan': 'only' }, 'restaurant');
  assert.strictEqual(hospitalityDetails, 'Cuisine: Italian. Takeaway available. Outdoor seating. Vegan menu.', 'Structured hospitality tags should become bounded source-derived profile facts.');
  assert.strictEqual(osmProfileDetail({ takeaway: 'no', delivery: 'no', outdoor_seating: 'yes' }, 'plumber'), '', 'Hospitality facts must not decorate unrelated categories or treat no as availability.');
  assert.strictEqual(osmProfileDetail({ wheelchair: 'yes' }, 'plumber'), 'Source-reported wheelchair access.', 'An exact affirmative OSM accessibility tag should become a source-qualified profile detail.');
  assert.strictEqual(osmProfileDetail({ wheelchair: 'limited' }, 'cafe'), '', 'Ambiguous OSM accessibility values must not become a public access promise.');
  assert.strictEqual(osmProfileDetail({ wheelchair: 'no' }, 'cafe'), '', 'A negative OSM accessibility tag must not become a public profile detail.');
  assert.strictEqual(osmProfileDetail({ cuisine: 'italian', wheelchair: 'yes' }, 'restaurant'), 'Cuisine: Italian. Source-reported wheelchair access.', 'Accessibility evidence should compose with existing structured hospitality evidence.');
  assert.strictEqual(osmProfileDetail({ internet_access: 'wlan', 'payment:contactless': 'yes', drive_through: 'yes' }, 'fast-food'), 'Drive-through available. Source-reported Wi-Fi. Source-reported contactless payment.', 'Exact structured amenity tags should become bounded source-derived profile details.');
  assert.strictEqual(osmProfileDetail({ internet_access: 'no', 'payment:contactless': 'no', drive_through: 'no' }, 'fast-food'), '', 'Negative amenity tags must not create a public availability claim.');
  assert.strictEqual(osmProfileDetail({ drive_through: 'yes' }, 'plumber'), '', 'Drive-through must remain limited to food-and-drink profiles.');
  assert.strictEqual(osmTradingHours('Mo-Fr 09:00-17:00; Sa 09:00-13:00'), 'Mo-Fr 09:00-17:00; Sa 09:00-13:00', 'An explicit OSM schedule should be retained without rewriting it.');
  assert.strictEqual(osmTradingHours('by appointment'), '', 'A prose-only OSM hours value must not become a public schedule.');
  assert.strictEqual(firstListedPhone('+61 425 306 991;+61 424 574 844'), '+61 425 306 991', 'Multiple OSM phone values must not make the full candidate run fail.');
  assert.strictEqual(osmSocialProfileUrl('facebook.com/local-bakery?ref=osm', 'facebook'), 'https://facebook.com/local-bakery', 'A direct OSM Facebook profile link should be normalised without retaining tracking parameters.');
  assert.strictEqual(osmSocialProfileUrl('https://www.instagram.com/local_bakery/', 'instagram'), 'https://www.instagram.com/local_bakery/', 'A direct OSM Instagram profile link should be retained.');
  assert.strictEqual(osmSocialProfileUrl('https://facebook.evil.example/local-bakery', 'facebook'), '', 'Lookalike social hosts must never enter the candidate feed.');
  assert.strictEqual(osmSocialProfileUrl('https://www.facebook.com/', 'facebook'), '', 'A platform home page is not a business profile link.');

  const socialProfiles = filterAndProcessElements([{ type: 'node', id: 'social-1', tags: {
    name: 'Local Social Bakery', shop: 'bakery', 'addr:suburb': 'Northcote',
    'contact:facebook': 'facebook.com/local-social-bakery', 'contact:instagram': 'https://www.instagram.com/local_social_bakery/',
  } }], catchments);
  assert.equal(socialProfiles[0].facebook_url, 'https://facebook.com/local-social-bakery');
  assert.equal(socialProfiles[0].instagram_url, 'https://www.instagram.com/local_social_bakery/');

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

  const localityBoundaries: VictorianLocalityBoundary[] = [{
    name: 'Northcote', slug: 'northcote', sourceRecordKey: 'loc-test-northcote',
    polygons: [[[[144.99, -37.80], [145.02, -37.80], [145.02, -37.77], [144.99, -37.77], [144.99, -37.80]]]],
  }];
  assert.equal(resolveVictorianLocality(145.0, -37.79, localityBoundaries)?.slug, 'northcote', 'A coordinate inside an official locality polygon should resolve to that locality.');
  assert.equal(resolveVictorianLocality(145.10, -37.79, localityBoundaries), null, 'A coordinate outside the supplied locality polygons must remain unresolved.');
  const localityResolved = filterAndProcessElements([{ type: 'node', id: '10', lat: -37.79, lon: 145.0, tags: { name: 'Coordinate Bakery', shop: 'bakery' } }], catchments, localityBoundaries);
  assert.equal(localityResolved[0].suburb_slug, 'northcote', 'A coordinate-backed OSM business without addr:suburb should use the official locality boundary.');
  assert.deepEqual(localityResolved[0].suburb_evidence_source_key, 'geoscape_vic_localities');
  assert.deepEqual(localityResolved[0].suburb_evidence_record_key, 'loc-test-northcote');
  const explicitLocalityWins = filterAndProcessElements([{ type: 'node', id: '11', lat: -37.79, lon: 145.0, tags: { name: 'Explicit Preston Bakery', shop: 'bakery', 'addr:suburb': 'Preston' } }], catchments, localityBoundaries);
  assert.equal(explicitLocalityWins[0].suburb_slug, 'preston', 'An explicit OSM locality must remain authoritative over the supporting boundary resolver.');
  assert.equal(explicitLocalityWins[0].suburb_evidence_source_key, '', 'An explicit OSM locality must not claim boundary-derived evidence.');

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

  // Test 11: a transient all-provider outage gets one bounded retry rather
  // than silently producing a stale or empty candidate feed.
  let retryAttempts = 0;
  const retryWaits: number[] = [];
  const retryResponse = await requestFromOverpassEndpoints(
    ['https://first.example.test/interpreter', 'https://second.example.test/interpreter'],
    '[out:json];',
    async () => {
      retryAttempts += 1;
      if (retryAttempts <= 2) throw new Error('temporary provider outage');
      return { ok: true, status: 200, json: async () => ({ elements: [] }) } as Response;
    },
    { maxAttempts: 2, retryDelayMs: 1, wait: async (milliseconds) => { retryWaits.push(milliseconds); } },
  );
  assert.equal(retryAttempts, 3, 'The second provider pass should be attempted after a complete transient outage.');
  assert.deepEqual(retryWaits, [1], 'The retry must remain bounded and observable.');
  assert.deepEqual(retryResponse.elements, []);

  console.log('All tests passed.');
}

if (process.argv[1] && process.argv[1].endsWith('test-acquire-openstreetmap.ts')) {
  runTests().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
