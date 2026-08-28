export type CatalogueSourceKey = "openstreetmap" | "victorian_liquor_licences";

export type CatalogueSourceContract = {
  key: CatalogueSourceKey;
  displayName: string;
  version: string;
  allowedHosts: readonly string[];
  refreshIntervalDays: number;
  defaultSourceNotes: string;
};

export const CATALOGUE_SOURCE_CONTRACTS: Record<CatalogueSourceKey, CatalogueSourceContract> = {
  openstreetmap: {
    key: "openstreetmap",
    displayName: "OpenStreetMap",
    version: "openstreetmap-candidate-v1",
    allowedHosts: ["www.openstreetmap.org"],
    refreshIntervalDays: 7,
    defaultSourceNotes: "Approved OpenStreetMap candidate handoff.",
  },
  victorian_liquor_licences: {
    key: "victorian_liquor_licences",
    displayName: "Victorian liquor licences by location",
    version: "victorian-liquor-licences-v2",
    allowedHosts: ["www.vic.gov.au", "discover.data.vic.gov.au"],
    refreshIntervalDays: 31,
    defaultSourceNotes: "Approved Victorian liquor-licence candidate handoff.",
  },
};

export function getCatalogueSourceContract(value: string): CatalogueSourceContract | null {
  return Object.values(CATALOGUE_SOURCE_CONTRACTS).find((source) => source.key === value) ?? null;
}

export function hasCatalogueSourceContract(source: string, version: string) {
  return getCatalogueSourceContract(source)?.version === version;
}

export function isAllowedCatalogueSourceUrl(source: CatalogueSourceContract, value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && source.allowedHosts.includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}
