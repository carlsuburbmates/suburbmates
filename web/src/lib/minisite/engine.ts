import { MinisiteConfig } from './config';

// Converts a UUID (e.g., "2a24f6c2-...") into a predictable integer
function hashStringToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Maps the integer to specific design choices with version safety
export function getVendorDesign(vendorId: string, createdAtDateStr: string) {
  const hash = hashStringToInt(vendorId);
  const createdAt = new Date(createdAtDateStr);
  
  // Determine configuration matrix version based on creation date
  // This isolates old vendors from new design matrix expansions
  const isV2 = createdAt > new Date('2026-06-01'); // Replace with future date when rolling out v2
  const config = isV2 ? MinisiteConfig.v1 : MinisiteConfig.v1; // Currently both map to v1 until we add v2

  return {
    palette: config.palettes[hash % config.palettes.length],
    font: config.fonts[hash % config.fonts.length],
    corners: config.corners[hash % config.corners.length],
    hero: config.heroStructures[hash % config.heroStructures.length],
    contact: config.contactStructures[hash % config.contactStructures.length],
  };
}

export type VendorDesign = ReturnType<typeof getVendorDesign>;

export type MinisiteVendor = {
  business_name: string;
  phone?: string | null;
  is_claimed?: boolean;
  suburbs?: { name?: string | null } | null;
  categories?: { name?: string | null } | null;
};
