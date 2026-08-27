import {
  Coffee,
  Martini,
  PawPrint,
  Scissors,
  ShoppingBag,
  Store,
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
