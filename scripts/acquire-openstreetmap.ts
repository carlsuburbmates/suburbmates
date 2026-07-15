import fs from 'node:fs';
import path from 'node:path';

export const COMMERCIAL_AMENITIES = new Set([
  'bar', 'cafe', 'car_rental', 'car_wash', 'casino', 'cinema', 'clinic',
  'dentists', 'doctors', 'fast_food', 'food_court', 'fuel', 'ice_cream',
  'marketplace', 'nightclub', 'pharmacy', 'pub', 'restaurant', 'studio',
  'theatre', 'veterinary'
]);

export const NON_COMMERCIAL_TOKENS = new Set([
  'school', 'kindergarten', 'college', 'university', 'education', 'educational',
  'government', 'municipal', 'union', 'foundation', 'political', 
  'ngo', 'charity', 'library', 'townhall'
]);

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function escapeCsv(val: string): string {
  if (!val) return '';
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
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

export function filterAndProcessElements(elements: any[], catchments: string[]): any[] {
  const results = [];
  const seen = new Set<string>();
  
  for (const el of elements) {
    if (!el.tags) continue;
    
    const name = el.tags.name || el.tags['name:en'];
    if (!name) continue;
    
    const tagsVals = [el.tags.shop, el.tags.craft, el.tags.office, el.tags.amenity].filter(Boolean);
    const hasNonCommercial = tagsVals.some(v => {
      const norm = v.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const tokens = norm.split('-');
      if (tokens.some(t => NON_COMMERCIAL_TOKENS.has(t))) return true;
      if (norm.includes('community-centre')) return true;
      return false;
    });
    
    if (hasNonCommercial) {
      continue;
    }
    
    // Determine category
    let category = '';
    if (el.tags.shop) category = el.tags.shop;
    else if (el.tags.craft) category = el.tags.craft;
    else if (el.tags.office) category = el.tags.office;
    else if (el.tags.amenity) {
      if (!COMMERCIAL_AMENITIES.has(el.tags.amenity)) continue;
      category = el.tags.amenity;
    } else {
      continue;
    }
    
    const categorySlug = slugify(category);
    if (!categorySlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug)) continue;
    
    let suburbSlug = 'darebin';
    if (el.tags['addr:suburb']) {
      const parsedSuburb = slugify(el.tags['addr:suburb']);
      if (catchments.includes(parsedSuburb)) {
        suburbSlug = parsedSuburb;
      }
    }
    
    const dedupKey = `${name.toLowerCase()}|${categorySlug}|${suburbSlug}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    
    const email = el.tags['contact:email'] || el.tags.email || '';
    const phone = el.tags['contact:phone'] || el.tags.phone || '';
    let website = el.tags['contact:website'] || el.tags.website || '';
    if (website) {
      if (!website.startsWith('http')) website = 'https://' + website;
      else if (website.startsWith('http://')) website = website.replace('http://', 'https://');
      try {
        const u = new URL(website);
        if (u.protocol !== 'https:') website = '';
      } catch {
        website = '';
      }
    }
    
    const addrParts = [];
    if (el.tags['addr:housenumber']) addrParts.push(el.tags['addr:housenumber']);
    if (el.tags['addr:street']) addrParts.push(el.tags['addr:street']);
    let streetAddress = addrParts.join(' ');
    
    // optional: add suburb, state, postcode if present
    if (el.tags['addr:suburb'] || el.tags['addr:postcode']) {
      const rest = [el.tags['addr:suburb'] || '', el.tags['addr:state'] || 'VIC', el.tags['addr:postcode'] || ''].filter(Boolean).join(' ');
      if (streetAddress && rest) streetAddress += `, ${rest}`;
    }

    const typeStr = el.type === 'node' ? 'node' : el.type === 'way' ? 'way' : 'relation';
    const sourceUrl = `https://www.openstreetmap.org/${typeStr}/${el.id}`;
    
    results.push({
      business_name: name,
      address: streetAddress,
      category_slug: categorySlug,
      suburb_slug: suburbSlug,
      contact_email: email,
      phone,
      website,
      source_url: sourceUrl,
      source_checked_on: getTodayAest(),
      verification_status: 'pending_review',
      notes: 'Imported from OpenStreetMap.'
    });
  }
  
  return results;
}

export async function acquireOsmData() {
  const catchmentPath = path.resolve(process.cwd(), 'data/darebin-catchment.json');
  const catchments = JSON.parse(fs.readFileSync(catchmentPath, 'utf8'));

  const endpoints = [
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter'
  ];

  const query = `[out:json];
area["name"="City of Darebin"]->.searchArea;
(
  nwr["shop"](area.searchArea);
  nwr["craft"](area.searchArea);
  nwr["office"](area.searchArea);
  nwr["amenity"](area.searchArea);
);
out tags center;`;

  let data = null;
  for (const endpoint of endpoints) {
    console.log(`Trying ${endpoint}...`);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        'User-Agent': 'SuburbMates-directory-importer/1.0 (+https://suburbmates.com.au/contact)'
        },
        body: `data=${encodeURIComponent(query)}`
      });
      if (response.ok) {
        data = await response.json();
        console.log(`Successfully fetched from ${endpoint}`);
        break;
      } else {
        console.warn(`Endpoint ${endpoint} returned status ${response.status}`);
      }
    } catch (e) {
      console.warn(`Error connecting to ${endpoint}:`, e);
    }
  }

  if (!data || !data.elements) {
    console.error('Failed to acquire OSM data from all endpoints.');
    process.exit(1);
  }

  const processed = filterAndProcessElements(data.elements, catchments);

  const outPath = path.resolve(process.cwd(), 'data/vendor-candidates-osm.csv');
  const outLines = [
    'business_name,address,category_slug,suburb_slug,contact_email,phone,website,source_url,source_checked_on,verification_status,notes'
  ];

  for (const p of processed) {
    const row = [
      escapeCsv(p.business_name),
      escapeCsv(p.address),
      escapeCsv(p.category_slug),
      escapeCsv(p.suburb_slug),
      escapeCsv(p.contact_email),
      escapeCsv(p.phone),
      escapeCsv(p.website),
      escapeCsv(p.source_url),
      escapeCsv(p.source_checked_on),
      escapeCsv(p.verification_status),
      escapeCsv(p.notes)
    ];
    outLines.push(row.join(','));
  }

  fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
  console.log(`Wrote ${processed.length} records to ${outPath}`);
  console.log(`Excluded non-commercial or missing names: ${data.elements.length - processed.length} elements.`);
}

if (process.argv[1] && path.basename(process.argv[1]) === 'acquire-openstreetmap.ts') {
  acquireOsmData();
}
