import Image from "next/image";

export type LicensedCategoryImage = {
  category_slug: string;
  image_url: string;
  provider_url: string;
  photographer: string;
  photographer_url: string;
};

export function LicensedCategoryVisual({
  image,
  categoryName,
  className = "h-28",
  businessContext = false,
}: {
  image: LicensedCategoryImage;
  categoryName: string;
  className?: string;
  businessContext?: boolean;
}) {
  return (
    <figure className={`relative overflow-hidden bg-slate-200 ${className}`}>
      <Image
        src={image.image_url}
        alt={businessContext
          ? `Licensed ${categoryName} category context. It does not depict the listed business.`
          : `Licensed ${categoryName} category context.`}
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover transition duration-500 group-hover:scale-[1.02]"
      />
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/70 to-transparent px-3 pb-2 pt-8 text-[10px] leading-4 text-white">
        <span className="block font-bold">
          {businessContext ? "Category image · not this business" : "Licensed category context"}
        </span>
        <span className="block text-white/85">
          Photo by{" "}
          <a href={image.photographer_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            {image.photographer}
          </a>{" "}
          on{" "}
          <a href={image.provider_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Pexels
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
