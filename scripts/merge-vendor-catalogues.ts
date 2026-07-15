import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

export const GENERIC_CATEGORIES = new Set(['yes', 'other', 'vacant', 'general', 'company', 'craft', 'trade']);
export const DAREBIN_CATCHMENT = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data/darebin-catchment.json'), 'utf8'));

export function normalizeString(s: string): string {
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

export function isDuplicate(a: any, b: any): boolean {
  if (normalizeString(a.business_name) !== normalizeString(b.business_name)) {
    return false;
  }

  const normAddressA = normalizeString(a.address);
  const normAddressB = normalizeString(b.address);
  
  if (normAddressA && normAddressB && normAddressA === normAddressB) {
    return true;
  }
  
  if (a.suburb_slug === b.suburb_slug) {
    return true;
  }
  
  if ((a.suburb_slug === 'darebin' && DAREBIN_CATCHMENT.includes(b.suburb_slug)) || 
      (b.suburb_slug === 'darebin' && DAREBIN_CATCHMENT.includes(a.suburb_slug))) {
    return true;
  }
  
  return false;
}

export function mergeRecords(manual: any[], osm: any[]): { merged: any[], duplicateCount: number } {
  const merged = [...manual];
  let duplicateCount = 0;

  for (const o of osm) {
    // Check generic category for OSM
    let osmCat = o.category_slug;
    let osmNotes = o.notes || '';
    if (GENERIC_CATEGORIES.has(osmCat)) {
      osmNotes = (osmNotes ? osmNotes + ' | ' : '') + `OSM Category: ${osmCat}`;
      osmCat = 'local-business';
    }
    const osmRecord = { ...o, category_slug: osmCat, notes: osmNotes };

    const duplicateIndex = merged.findIndex(m => isDuplicate(m, osmRecord));
    
    if (duplicateIndex !== -1) {
      duplicateCount++;
      const m = merged[duplicateIndex];
      // Prefer manual, fill missing from OSM
      for (const key of Object.keys(m)) {
        if (!m[key] && osmRecord[key]) {
          m[key] = osmRecord[key];
        }
      }
      
      // Keep source provenance in notes without losing manual note
      if (osmRecord.notes && !m.notes.includes(osmRecord.notes)) {
        m.notes = m.notes ? `${m.notes} | ${osmRecord.notes}` : osmRecord.notes;
      }
    } else {
      merged.push(osmRecord);
    }
  }

  // Stable sort: by business_name then suburb_slug
  merged.sort((a, b) => {
    const nameCmp = (a.business_name || '').localeCompare(b.business_name || '');
    if (nameCmp !== 0) return nameCmp;
    return (a.suburb_slug || '').localeCompare(b.suburb_slug || '');
  });

  return { merged, duplicateCount };
}

export function runMerge(manualPath: string, osmPath: string, outputPath: string) {
  const manualData = parse(fs.readFileSync(manualPath, 'utf8'), { columns: true, skip_empty_lines: true });
  const osmData = parse(fs.readFileSync(osmPath, 'utf8'), { columns: true, skip_empty_lines: true });

  const { merged, duplicateCount } = mergeRecords(manualData, osmData);

  const outputCsv = stringify(merged, { header: true });
  fs.writeFileSync(outputPath, outputCsv);

  console.log(`Manual input records: ${manualData.length}`);
  console.log(`OSM input records: ${osmData.length}`);
  console.log(`Duplicates merged: ${duplicateCount}`);
  console.log(`Final record count: ${merged.length}`);
}

if (path.basename(process.argv[1] || '') === 'merge-vendor-catalogues.ts') {
  runMerge(
    path.join(process.cwd(), 'data/vendor-candidates.csv'),
    path.join(process.cwd(), 'data/vendor-candidates-osm.csv'),
    path.join(process.cwd(), 'data/vendor-candidates-merged.csv')
  );
}
