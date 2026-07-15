import type { SupabaseClient } from "@supabase/supabase-js";
import { taxonomyEligibilityKey, type TaxonomyPageEligibilityRow } from "./taxonomy-eligibility";

export const PUBLIC_CATALOGUE_PAGE_SIZE = 1000;

export type PublicVendorRouteRow = {
  id: string;
  slug: string;
  category_slug: string | null;
  suburb_slug: string | null;
};

export type CataloguePage<T> = {
  data: T[] | null;
  count: number | null;
  error: { code?: string; message?: string } | null;
};

export class PublicCatalogueReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicCatalogueReadError";
  }
}

export async function collectAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<CataloguePage<T>>,
  pageSize = PUBLIC_CATALOGUE_PAGE_SIZE,
  identifyRow: (row: T) => string = (row) => String((row as { id?: unknown }).id ?? ""),
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new PublicCatalogueReadError("Invalid public catalogue page size.");
  }

  const rows: T[] = [];
  const ids = new Set<string>();
  let expectedCount: number | null = null;

  while (expectedCount === null || rows.length < expectedCount) {
    const from = rows.length;
    const page = await fetchPage(from, from + pageSize - 1);

    if (page.error) {
      throw new PublicCatalogueReadError(`Public catalogue page failed at offset ${from}${page.error.code ? ` (${page.error.code})` : ""}.`);
    }
    const pageCount = page.count;
    if (pageCount === null || !Number.isInteger(pageCount) || pageCount < 0) {
      throw new PublicCatalogueReadError(`Public catalogue count is missing at offset ${from}.`);
    }
    if (expectedCount === null) expectedCount = pageCount;
    if (pageCount !== expectedCount) {
      throw new PublicCatalogueReadError(`Public catalogue count changed at offset ${from}.`);
    }
    if (!page.data) {
      throw new PublicCatalogueReadError(`Public catalogue data is missing at offset ${from}.`);
    }
    if (page.data.length === 0 && rows.length < pageCount) {
      throw new PublicCatalogueReadError(`Public catalogue ended early at offset ${from}.`);
    }

    for (const row of page.data) {
      const id = identifyRow(row);
      if (!id || ids.has(id)) {
        throw new PublicCatalogueReadError(`Public catalogue contains a duplicate or missing ID at offset ${from}.`);
      }
      ids.add(id);
      rows.push(row);
      if (rows.length > pageCount) {
        throw new PublicCatalogueReadError("Public catalogue returned more rows than its exact count.");
      }
    }
  }

  if (expectedCount === null || rows.length !== expectedCount) {
    throw new PublicCatalogueReadError("Public catalogue did not match its exact count.");
  }
  return rows;
}

export async function fetchAllTaxonomyPageEligibility(
  client: SupabaseClient,
): Promise<TaxonomyPageEligibilityRow[]> {
  return collectAllPages(async (from, to) => {
    const result = await client
      .from("taxonomy_page_eligibility")
      .select("route_type, suburb_slug, category_slug, qualified_listing_count", { count: "exact" })
      .order("route_type", { ascending: true })
      .order("suburb_slug", { ascending: true })
      .order("category_slug", { ascending: true })
      .range(from, to);
    return result as CataloguePage<TaxonomyPageEligibilityRow>;
  }, PUBLIC_CATALOGUE_PAGE_SIZE, taxonomyEligibilityKey);
}

export async function fetchAllPublishedVendorRouteRows(
  client: SupabaseClient,
): Promise<PublicVendorRouteRow[]> {
  return collectAllPages(async (from, to) => {
    const result = await client
      .from("published_vendors")
      .select("id, slug, category_slug, suburb_slug", { count: "exact" })
      .order("id", { ascending: true })
      .range(from, to);
    return result as CataloguePage<PublicVendorRouteRow>;
  });
}

export function publishedCategorySlugs(rows: PublicVendorRouteRow[]): string[] {
  return [...new Set(rows.flatMap((row) => row.category_slug ? [row.category_slug] : []))].sort();
}

export function publishedSuburbSlugs(rows: PublicVendorRouteRow[]): string[] {
  return [...new Set(rows.flatMap((row) => row.suburb_slug ? [row.suburb_slug] : []))].sort();
}

export function buildPublicSitemapUrls(
  rows: PublicVendorRouteRow[],
  taxonomyRows: TaxonomyPageEligibilityRow[],
  baseUrl = "https://suburbmates.com.au",
): string[] {
  const base = baseUrl.replace(/\/+$/, "");
  const urls = new Set([
    base,
    `${base}/businesses`,
    `${base}/locations`,
    `${base}/categories`,
    `${base}/how-it-works`,
    `${base}/contact`,
    `${base}/privacy`,
  ]);

  for (const row of rows) {
    urls.add(`${base}/vendor/${row.slug}`);
  }

  for (const row of taxonomyRows) {
    if (row.route_type === "suburb" && row.suburb_slug && row.category_slug === null) {
      urls.add(`${base}/${row.suburb_slug}`);
    } else if (row.route_type === "category" && row.category_slug && row.suburb_slug === null) {
      urls.add(`${base}/categories/${row.category_slug}`);
    } else if (row.route_type === "pair" && row.suburb_slug && row.category_slug) {
      urls.add(`${base}/${row.suburb_slug}/${row.category_slug}`);
    }
  }

  return [...urls];
}
