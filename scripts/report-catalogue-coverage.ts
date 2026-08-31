import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

type Candidate = {
  business_name?: string;
  address?: string;
  category_slug?: string;
  suburb_slug?: string;
  contact_email?: string;
  phone?: string;
  website?: string;
  source_url?: string;
  source_checked_on?: string;
};

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function countBy(rows: Candidate[], field: keyof Candidate): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = row[field]?.trim() || 'unknown';
    counts[value] = (counts[value] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function sourceHost(sourceUrl: string | undefined): string {
  if (!present(sourceUrl)) return 'missing';
  try {
    return new URL(sourceUrl!).hostname;
  } catch {
    return 'invalid';
  }
}

function run(): void {
  const input = process.argv[2] || 'data/vendor-candidates-osm.csv';
  const inputPath = path.resolve(process.cwd(), input);
  const rows = parse(fs.readFileSync(inputPath, 'utf8'), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Candidate[];

  const total = rows.length;
  const withContact = rows.filter((row) => present(row.phone) || present(row.contact_email)).length;
  const sourceHosts = rows.reduce<Record<string, number>>((counts, row) => {
    const host = sourceHost(row.source_url);
    counts[host] = (counts[host] || 0) + 1;
    return counts;
  }, {});

  console.log(JSON.stringify({
    input,
    total,
    required_fields: {
      business_name: rows.filter((row) => present(row.business_name)).length,
      address: rows.filter((row) => present(row.address)).length,
      category: rows.filter((row) => present(row.category_slug)).length,
      contact: withContact,
    },
    optional_fields: {
      website: rows.filter((row) => present(row.website)).length,
      source_url: rows.filter((row) => present(row.source_url)).length,
      source_checked_on: rows.filter((row) => present(row.source_checked_on)).length,
    },
    by_suburb: countBy(rows, 'suburb_slug'),
    by_source_host: Object.fromEntries(Object.entries(sourceHosts).sort(([a], [b]) => a.localeCompare(b))),
  }, null, 2));
}

run();
