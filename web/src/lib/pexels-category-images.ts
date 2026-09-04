import "server-only";

export type LicensedCategoryImage = {
  provider: "pexels";
  providerPhotoId: number;
  providerUrl: string;
  photographer: string;
  photographerUrl: string;
  imageUrl: string;
  alt: string;
  keyword: string;
};

type PexelsPhoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: { large: string };
  alt?: string;
};

const keywordByCategory: Record<string, string> = {
  bakery: "fresh bread", cafe: "coffee cup", restaurant: "restaurant table", bar: "cocktail glass", pub: "pub interior",
  pet: "dog toy", "pet-grooming": "dog grooming tools", veterinary: "veterinary stethoscope",
  hairdresser: "hair styling tools", barber: "barber tools", beauty: "beauty products",
  electrician: "electrical pliers isolated", plumber: "plumbing tools", builder: "construction tools", carpenter: "woodworking tools",
  garden: "garden plants", gardener: "garden tools", florist: "flowers still life",
  bicycle: "bicycle detail", "car-repair": "car repair tools", tyres: "car tyre detail",
  dentist: "dental tools", pharmacy: "pharmacy shelves", clinic: "medical equipment",
  accountant: "calculator desk", lawyer: "law books", "tax-advisor": "calculator documents",
  fitness: "gym equipment", dance: "dance studio", art: "artist paint brushes", books: "bookshelf",
  fashion: "clothing rack", furniture: "wooden chair still life", homewares: "homeware objects",
};

// These terms keep a category visual from suggesting a particular person,
// business, logo, premises or branded product. This is a conservative lexical
// gate, not a claim that the asset depicts the listed business.
const unsafeAlt = /\b(person|people|woman|women|man|men|child|children|baby|face|portrait|selfie|team|employee|customer|worker|working|mechanic|technician|electrician|hand|hands|logo|brand|sign|storefront|shopfront|shop|store|workshop|garage|building|hotel|office|interior|living room|restaurant exterior|business exterior|text|lettering)\b/i;

export function categoryImageKeyword(categorySlug: string, services: string[] = []) {
  const direct = keywordByCategory[categorySlug];
  if (direct) return direct;
  const factualService = services.find((service) => /^[a-z][a-z -]{2,40}$/i.test(service) && !unsafeAlt.test(service));
  return factualService ? `${factualService} still life` : null;
}

export function selectPexelsCategoryImage(photos: PexelsPhoto[], keyword: string, excludedPhotoIds = new Set<number>()): LicensedCategoryImage | null {
  const eligible = photos
    .filter((photo) => Number.isInteger(photo.id) && photo.width >= photo.height && photo.height > 0)
    .filter((photo) => Boolean(photo.src?.large && photo.url && photo.photographer && photo.photographer_url))
    .filter((photo) => typeof photo.alt === "string" && photo.alt.trim().length >= 5 && photo.alt.trim().length <= 180)
    .filter((photo) => !unsafeAlt.test(photo.alt ?? ""))
    .filter((photo) => !excludedPhotoIds.has(photo.id));
  const photo = eligible[0];
  if (!photo) return null;
  return { provider: "pexels", providerPhotoId: photo.id, providerUrl: photo.url, photographer: photo.photographer, photographerUrl: photo.photographer_url, imageUrl: photo.src.large, alt: photo.alt?.trim() || `Licensed category context for ${keyword}`, keyword };
}

export async function findPexelsCategoryImage(categorySlug: string, services: string[] = [], excludedPhotoIds = new Set<number>()) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return { state: "held" as const, reason: "Pexels provider key is not configured." };
  const keyword = categoryImageKeyword(categorySlug, services);
  if (!keyword) return { state: "skipped" as const, reason: "No category-safe imagery query is defined." };
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", keyword);
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("size", "medium");
  url.searchParams.set("per_page", "15");
  const response = await fetch(url, { headers: { Authorization: apiKey, Accept: "application/json" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Pexels category image search failed (${response.status}).`);
  const payload = await response.json() as { photos?: PexelsPhoto[] };
  return { state: "selected" as const, image: selectPexelsCategoryImage(payload.photos ?? [], keyword, excludedPhotoIds), keyword };
}
