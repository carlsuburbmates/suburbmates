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
  bakery: "local bakery fresh bread", cafe: "local cafe coffee", restaurant: "local restaurant dining", bar: "local cocktail bar", pub: "local pub interior",
  pet: "local pet care", "pet-grooming": "dog grooming salon", veterinary: "veterinarian caring for dog",
  hairdresser: "local hair salon", barber: "local barber at work", beauty: "local beauty salon",
  electrician: "electrician at work", plumber: "plumber at work", builder: "local builder at work", carpenter: "carpenter workshop",
  garden: "local garden plants", gardener: "gardener at work", florist: "local florist flowers",
  bicycle: "local bicycle shop", "car-repair": "car repair workshop", tyres: "car tyre service",
  dentist: "local dental clinic", pharmacy: "local pharmacy interior", clinic: "local health clinic",
  accountant: "local accountant office", lawyer: "local lawyer office", "tax-advisor": "tax advisor meeting",
  fitness: "local fitness class", dance: "local dance class", art: "local artist studio", books: "local bookshop interior",
  fashion: "local fashion boutique", furniture: "local furniture showroom", homewares: "local homewares shop",
};

const unsafeAlt = /\b(logo|brand|trademark|signage|watermark|text|lettering)\b/i;

export function categoryImageKeyword(categorySlug: string, services: string[] = []) {
  const direct = keywordByCategory[categorySlug];
  if (direct) return direct;
  const factualService = services.find((service) => /^[a-z][a-z -]{2,40}$/i.test(service) && !unsafeAlt.test(service));
  return factualService ? `${factualService} local service` : `local ${categorySlug.replaceAll("-", " ")}`;
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
