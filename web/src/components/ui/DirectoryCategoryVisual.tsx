import {
  BriefcaseBusiness,
  Brush,
  CarFront,
  Coffee,
  Dumbbell,
  Flower2,
  Hammer,
  Home,
  Martini,
  Package,
  PawPrint,
  Shirt,
  Scissors,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Theater,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from "lucide-react";

type CategoryVisual = {
  Icon: LucideIcon;
  className: string;
};

const visualByCategory: Record<string, CategoryVisual> = {
  cafe: { Icon: Coffee, className: "from-amber-100 via-orange-50 to-rose-100 text-amber-950" },
  bakery: { Icon: Coffee, className: "from-amber-100 via-orange-50 to-rose-100 text-amber-950" },
  restaurant: { Icon: UtensilsCrossed, className: "from-rose-100 via-orange-50 to-amber-100 text-rose-950" },
  bar: { Icon: Martini, className: "from-violet-100 via-fuchsia-50 to-rose-100 text-violet-950" },
  pub: { Icon: Martini, className: "from-violet-100 via-fuchsia-50 to-rose-100 text-violet-950" },
  wine: { Icon: Martini, className: "from-violet-100 via-fuchsia-50 to-rose-100 text-violet-950" },
  alcohol: { Icon: Martini, className: "from-violet-100 via-fuchsia-50 to-rose-100 text-violet-950" },
  pet: { Icon: PawPrint, className: "from-emerald-100 via-teal-50 to-cyan-100 text-emerald-950" },
  "pet-grooming": { Icon: PawPrint, className: "from-emerald-100 via-teal-50 to-cyan-100 text-emerald-950" },
  veterinary: { Icon: PawPrint, className: "from-emerald-100 via-teal-50 to-cyan-100 text-emerald-950" },
  hairdresser: { Icon: Scissors, className: "from-pink-100 via-fuchsia-50 to-violet-100 text-pink-950" },
  barber: { Icon: Scissors, className: "from-pink-100 via-fuchsia-50 to-violet-100 text-pink-950" },
  electrician: { Icon: Wrench, className: "from-sky-100 via-cyan-50 to-teal-100 text-sky-950" },
  plumber: { Icon: Wrench, className: "from-sky-100 via-cyan-50 to-teal-100 text-sky-950" },
};

// Category art is deliberately a first-party, abstract fallback. It gives every
// profile an identifiable visual treatment without implying that it is an image
// of the business. Owner-provided or licensed media still takes precedence on
// public profiles.
const visualFamilies: Array<{ slugs: string[]; visual: CategoryVisual }> = [
  {
    slugs: ["bakery", "beverages", "butcher", "caterer", "confectionery", "deli", "dessert", "fast-food", "greengrocer", "health-food", "ice-cream", "nuts", "pastry", "seafood", "supermarket"],
    visual: { Icon: UtensilsCrossed, className: "from-amber-100 via-orange-50 to-rose-100 text-amber-950" },
  },
  {
    slugs: ["alcohol", "bar", "brewery", "nightclub", "pub", "wine"],
    visual: { Icon: Martini, className: "from-violet-100 via-fuchsia-50 to-rose-100 text-violet-950" },
  },
  {
    slugs: ["chemist", "clinic", "dentist", "doctors", "hearing-aids", "herbalist", "massage", "medical-supply", "nutrition-supplements", "optician", "pharmacy"],
    visual: { Icon: Stethoscope, className: "from-sky-100 via-cyan-50 to-emerald-100 text-sky-950" },
  },
  {
    slugs: ["beauty", "cosmetics", "hairdresser", "hairdresser-supply", "perfumery", "tattoo"],
    visual: { Icon: Sparkles, className: "from-pink-100 via-fuchsia-50 to-violet-100 text-pink-950" },
  },
  {
    slugs: ["pet", "pet-grooming", "veterinary"],
    visual: { Icon: PawPrint, className: "from-emerald-100 via-teal-50 to-cyan-100 text-emerald-950" },
  },
  {
    slugs: ["bicycle", "car", "car-parts", "car-rental", "car-repair", "car-wash", "fuel", "motorcycle", "tyres"],
    visual: { Icon: CarFront, className: "from-indigo-100 via-sky-50 to-cyan-100 text-indigo-950" },
  },
  {
    slugs: ["builder", "carpenter", "doors", "electrical", "electrician", "gas", "glaziery", "hardware", "locksmith", "metal-construction", "paint", "painter", "plumber", "tiler", "tiles"],
    visual: { Icon: Hammer, className: "from-orange-100 via-amber-50 to-yellow-100 text-orange-950" },
  },
  {
    slugs: ["architect", "bathroom-furnishing", "bed", "carpet", "curtain", "fabric", "furniture", "homewares", "household-linen", "houseware", "interior-decoration", "kitchen", "lighting", "window-blind"],
    visual: { Icon: Home, className: "from-teal-100 via-sky-50 to-indigo-100 text-teal-950" },
  },
  {
    slugs: ["garden-centre", "gardener", "landscaper", "outdoor"],
    visual: { Icon: Flower2, className: "from-lime-100 via-emerald-50 to-teal-100 text-emerald-950" },
  },
  {
    slugs: ["clothes", "fashion", "leather", "shoemaker", "shoes", "tailor", "wool"],
    visual: { Icon: Shirt, className: "from-rose-100 via-pink-50 to-amber-100 text-rose-950" },
  },
  {
    slugs: ["antiques", "art", "atelier", "books", "clockmaker", "collector", "frame", "glassblower", "handicraft", "jeweller", "jewelry", "music", "musical-instrument", "pottery", "sculptor", "second-hand", "thrift-store"],
    visual: { Icon: Brush, className: "from-purple-100 via-violet-50 to-fuchsia-100 text-purple-950" },
  },
  {
    slugs: ["cinema", "theatre", "video", "video-games"],
    visual: { Icon: Theater, className: "from-fuchsia-100 via-pink-50 to-rose-100 text-fuchsia-950" },
  },
  {
    slugs: ["computer", "electronics", "electronics-repair", "hifi", "it", "mobile-phone", "telecommunication"],
    visual: { Icon: Smartphone, className: "from-cyan-100 via-sky-50 to-indigo-100 text-cyan-950" },
  },
  {
    slugs: ["accountant", "advertising-agency", "employment-agency", "estate-agent", "financial", "financial-advisor", "insurance", "lawyer", "property-management", "tax-advisor", "travel-agency"],
    visual: { Icon: BriefcaseBusiness, className: "from-slate-200 via-sky-50 to-blue-100 text-slate-950" },
  },
  {
    slugs: ["bookmaker", "golf", "sports", "water-sports"],
    visual: { Icon: Dumbbell, className: "from-lime-100 via-cyan-50 to-sky-100 text-lime-950" },
  },
  {
    slugs: ["baby-goods", "gift", "kiosk", "local-business", "mall", "marketplace", "newsagent", "shopping-centre", "specialty-retail", "stationery", "toys", "variety-store", "wholesale"],
    visual: { Icon: ShoppingBag, className: "from-teal-100 via-sky-50 to-amber-100 text-teal-950" },
  },
  {
    slugs: ["appliance", "cleaner", "cleaning", "cleaning-products", "copyshop", "doityourself", "energy-supplier", "farm", "funeral-directors", "guide", "laundry", "lottery", "pawnbroker", "psychic", "signmaker", "storage-rental", "studio", "tobacco", "weapons"],
    visual: { Icon: Package, className: "from-stone-200 via-amber-50 to-slate-100 text-stone-950" },
  },
];

for (const family of visualFamilies) {
  for (const slug of family.slugs) visualByCategory[slug] ??= family.visual;
}

export function DirectoryCategoryVisual({
  categorySlug,
  label,
  className = "",
}: {
  categorySlug: string | null;
  label: string;
  className?: string;
}) {
  const visual = categorySlug ? visualByCategory[categorySlug] : undefined;
  const Icon = visual?.Icon ?? (categorySlug === "local-business" ? Store : ShoppingBag);
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${visual?.className ?? "from-teal-100 via-sky-50 to-amber-100 text-teal-950"} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute -right-6 -top-7 h-28 w-28 rounded-full border border-current/10 bg-white/35" />
      <div className="absolute -bottom-9 -left-7 h-24 w-24 rounded-full border border-current/10 bg-white/35" />
      <div className="relative flex h-full items-center justify-center">
        <Icon className="drop-shadow-sm" size={32} strokeWidth={1.8} />
        <span className="sr-only">{label}</span>
      </div>
    </div>
  );
}
