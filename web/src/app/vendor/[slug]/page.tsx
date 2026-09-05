import { createClient } from "@/utils/supabase/server";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Camera,
  Clock3,
  Globe,
  Mail,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import { resolvePublicVendorRoute } from "@/lib/public-vendor-route";
import { DirectoryProfileView } from "@/components/observability/DirectoryObservabilityObserver";
import { PublicDirectoryShell } from "@/components/ui/PublicDirectoryShell";
import { DirectoryCategoryVisual } from "@/components/ui/DirectoryCategoryVisual";
import { displayDirectoryStreetAddress, isDirectoryCatchment } from "@/lib/directory-location";
import {
  extractPublicProfileFacts,
  hasOnlyStructuredPublicProfileFacts,
  type PublicProfileFact,
} from "@/lib/public-profile-facts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

type PublicMedia = {
  media_id: string;
  media_kind: string;
  alt_text: string;
};

type CategoryContextImage = {
  image_url: string;
  provider_url: string;
  photographer: string;
  photographer_url: string;
};

type PublicSourceSummary = {
  source_key: string;
  source_name: string;
  observed_on: string;
  supported_fields: string[];
};

type RelatedVendor = {
  id: string;
  slug: string;
  business_name: string;
  street_address: string | null;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const route = await resolvePublicVendorRoute(supabase, slug);
  if (!route) return { title: "Not Found" };
  const { data: vendor } = await supabase
    .from("published_vendors")
    .select(
      "business_name, description, suburb_slug, category_slug, is_published, suburbs(name), categories(name)",
    )
    .eq("id", route.vendorId)
    .single();
  if (!vendor) return { title: "Not Found" };
  const categoryRelation = vendor.categories as unknown as
    | { name: string }
    | { name: string }[]
    | null;
  const suburbRelation = vendor.suburbs as unknown as
    | { name: string }
    | { name: string }[]
    | null;
  const categoryName =
    (Array.isArray(categoryRelation)
      ? categoryRelation[0]?.name
      : categoryRelation?.name) ?? "Local business";
  const suburbName =
    (Array.isArray(suburbRelation)
      ? suburbRelation[0]?.name
      : suburbRelation?.name) ?? vendor.suburb_slug;
  const title = `${vendor.business_name} | ${categoryName} in ${suburbName}`;
  const description = vendor.description
    ? vendor.description.substring(0, 155)
    : `View public contact details for ${vendor.business_name} in ${suburbName}.`;
  const canonicalUrl = `/vendor/${route.currentSlug}`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: vendor.is_published ? undefined : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `https://suburbmates.com.au${canonicalUrl}`,
      siteName: "SuburbMates",
      type: "website",
    },
    twitter: { card: "summary", title, description },
  };
}

export default async function VendorWebsite({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const route = await resolvePublicVendorRoute(supabase, slug);
  if (!route) notFound();
  if (route.redirectRequired) permanentRedirect(`/vendor/${route.currentSlug}`);
  const [vendorResult, mediaResult, sourceSummaryResult] = await Promise.all([
    supabase
      .from("published_vendors")
      .select("*, suburbs(name), categories(name)")
      .eq("id", route.vendorId)
      .single(),
    supabase.rpc("list_public_vendor_media", { p_vendor_id: route.vendorId }),
    supabase.rpc("list_public_vendor_source_summaries", { p_vendor_id: route.vendorId }),
  ]);
  const vendor = vendorResult.data;
  if (vendorResult.error || !vendor) notFound();
  const media = (mediaResult.data ?? []) as PublicMedia[];
  const sourceSummaries = (sourceSummaryResult.data ?? []) as PublicSourceSummary[];
  const websiteEnriched = sourceSummaries.some((source) => source.source_key === "official_business_site");
  const logo = media.find((item) => item.media_kind === "logo") ?? null;
  const photos = media.filter((item) => item.media_kind === "listing_image");
  const suburbName = vendor.suburbs?.name ?? vendor.suburb_slug;
  const categoryName = vendor.categories?.name ?? vendor.category_slug;
  const isCatchment = isDirectoryCatchment(vendor.suburb_slug);
  const profileDescription = vendor.description?.trim() || null;
  const profileFacts = extractPublicProfileFacts(profileDescription);
  const hasOnlyStructuredFacts = hasOnlyStructuredPublicProfileFacts(profileDescription);
  const tradingHours = vendor.trading_hours?.trim() || null;
  const services = Array.isArray(vendor.services) ? vendor.services.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0) : [];
  const areaServed = Array.isArray(vendor.area_served) ? vendor.area_served.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0) : [];
  const accessibilityFeatures = Array.isArray(vendor.accessibility_features) ? vendor.accessibility_features.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0) : [];
  const displayedStreetAddress = displayDirectoryStreetAddress(vendor.street_address);
  const profileSummary = describeKnownProfile({
    businessName: vendor.business_name,
    categoryName,
    suburbName,
    streetAddress: vendor.street_address,
    isCatchment,
    hasDirectContact: Boolean(vendor.phone || vendor.contact_email || vendor.website),
  });
  const canonicalUrl = `https://suburbmates.com.au/vendor/${route.currentSlug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.business_name,
    description: profileDescription || undefined,
    url: canonicalUrl,
    telephone: vendor.phone || undefined,
    email: vendor.contact_email || undefined,
    address: vendor.street_address
      ? {
          "@type": "PostalAddress",
          streetAddress: vendor.street_address,
          addressLocality: isCatchment ? undefined : suburbName,
          addressCountry: "AU",
        }
      : undefined,
    areaServed: suburbName ? { "@type": "Place", name: suburbName } : undefined,
    sameAs: vendor.website ? [vendor.website] : undefined,
  };
  const directionsUrl = vendor.street_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([vendor.street_address, isCatchment ? "Darebin, Victoria, Australia" : suburbName].filter(Boolean).join(", "))}`
    : null;
  const relatedResult = await supabase
    .from("published_vendors")
    .select("id, slug, business_name, street_address")
    .eq("category_slug", vendor.category_slug)
    .eq("suburb_slug", vendor.suburb_slug)
    .neq("id", vendor.id)
    .order("business_name", { ascending: true })
    .limit(3);
  const relatedVendors = (relatedResult.data ?? []) as RelatedVendor[];
  const { data: categoryContextImage } = await supabase
    .from("licensed_category_context_images")
    .select("image_url, provider_url, photographer, photographer_url")
    .eq("category_slug", vendor.category_slug)
    .eq("active", true)
    .maybeSingle();

  return (
    <PublicDirectoryShell>
      <DirectoryProfileView
        rich={Boolean(vendor.description?.trim()) && services.length >= 3 && photos.length > 0 && Boolean(vendor.trading_hours?.trim())}
        websiteEnriched={websiteEnriched}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <article className="bg-[#f6f7f3] text-slate-950">
        <section className="border-b border-teal-900/10 bg-[linear-gradient(135deg,#e6f5ef_0%,#fff7e7_54%,#edf6fa_100%)] py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  {categoryName} · {suburbName}
                </p>
                <div className="mt-5 flex items-start gap-4">
                  <ProfileIdentityVisual
                    logo={logo}
                    categorySlug={vendor.category_slug}
                    categoryName={categoryName}
                  />
                  <div>
                    <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                      {vendor.business_name}
                    </h1>
                    {displayedStreetAddress && (
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <MapPin size={16} aria-hidden="true" />
                        {displayedStreetAddress}{!isCatchment && <>, {suburbName}</>}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="lg:justify-self-end">
                <ContactActions
                  phone={vendor.phone}
                  email={vendor.contact_email}
                  website={vendor.website}
                  bookingUrl={vendor.booking_url}
                  menuUrl={vendor.menu_url}
                  facebookUrl={vendor.facebook_url}
                  instagramUrl={vendor.instagram_url}
                  directionsUrl={directionsUrl}
                />
                {vendor.is_claimed === false && (
                  <Link
                    href={`/claim?listing=${encodeURIComponent(vendor.id)}`}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-700 underline decoration-teal-800/40 underline-offset-4 transition hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800"
                  >
                    <Camera size={16} aria-hidden="true" />
                    Own this business? Claim and improve this profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <PublicMediaGallery media={photos} />
            {vendor.is_claimed === false && photos.length === 0 && categoryContextImage && (
              <LicensedCategoryContextImage image={categoryContextImage as CategoryContextImage} categoryName={categoryName} businessName={vendor.business_name} />
            )}
            <PublicServiceDetails services={services} areaServed={areaServed} accessibilityFeatures={accessibilityFeatures} />
            <PublicProfileHighlights facts={profileFacts} />
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-tight">
                {hasOnlyStructuredFacts ? "Known local details" : "About this business"}
              </h2>
              {profileDescription && !hasOnlyStructuredFacts ? (
                <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">
                  {profileDescription}
                </p>
              ) : (
                <div className="mt-5 rounded-2xl border border-teal-900/10 bg-teal-50/60 p-5 text-sm leading-6 text-slate-700">
                  <p className="mt-1">{profileSummary}</p>
                  {hasOnlyStructuredFacts && (
                    <p className="mt-3 text-slate-600">The source-backed details currently available for this profile are shown above.</p>
                  )}
                </div>
              )}
            </section>
          </div>
          <aside className="space-y-4">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black">Listing details</h2>
              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="font-semibold text-slate-500">Category</dt>
                  <dd className="mt-1 font-bold">{categoryName}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Suburb</dt>
                  <dd className="mt-1 font-bold">{suburbName}</dd>
                </div>
                {tradingHours && (
                  <div>
                    <dt className="flex items-center gap-1.5 font-semibold text-slate-500">
                      <Clock3 size={14} aria-hidden="true" />
                      Source-reported hours
                    </dt>
                    <dd className="mt-1 font-bold leading-6">{tradingHours}</dd>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Hours can change. Check with the business before visiting.
                    </p>
                  </div>
                )}
                {vendor.abn_checked && (
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Business registration
                    </dt>
                    <dd className="mt-1 font-bold">ABN checked</dd>
                  </div>
                )}
              </dl>
            </section>
            <PublicSourceSummaries summaries={sourceSummaries} />
            {vendor.is_claimed === false && (
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black">Is this your business?</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Claim it to propose a better description, direct contact details
                  and owner-authorised images. Every change is reviewed before it
                  appears publicly.
                </p>
                <Link
                  href={`/claim?listing=${encodeURIComponent(vendor.id)}`}
                  className="btn btn-outline mt-5 w-full"
                >
                  <Camera size={16} aria-hidden="true" />
                  Claim and improve profile
                </Link>
              </section>
            )}
            <Link
              href={`/contact?topic=listing_correction&business=${encodeURIComponent(vendor.business_name)}`}
              className="block rounded-3xl border border-slate-200 bg-white p-5 text-sm font-bold underline underline-offset-4 shadow-sm hover:border-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800"
            >
              Report a problem with this listing
            </Link>
          </aside>
        </div>
        <RelatedLocalBusinesses
          vendors={relatedVendors}
          categoryName={categoryName}
          categorySlug={vendor.category_slug}
          suburbName={suburbName}
          suburbSlug={vendor.suburb_slug}
        />
      </article>
    </PublicDirectoryShell>
  );
}

function describeKnownProfile({
  businessName,
  categoryName,
  suburbName,
  streetAddress,
  isCatchment,
  hasDirectContact,
}: {
  businessName: string;
  categoryName: string;
  suburbName: string;
  streetAddress: string | null;
  isCatchment: boolean;
  hasDirectContact: boolean;
}) {
  const location = streetAddress
    ? isCatchment
      ? ` The recorded street address is ${streetAddress}; the listing is in the ${suburbName}.`
      : ` The recorded address is ${streetAddress}, ${suburbName}.`
    : ` The recorded local area is ${suburbName}.`;
  const contact = hasDirectContact
    ? " Use the direct contact options above to take the next step."
    : " Direct contact details have not yet been added to this profile.";
  return `${businessName} is listed as ${categoryName.toLocaleLowerCase()} in the local directory.${location}${contact}`;
}

function ContactActions({
  phone,
  email,
  website,
  bookingUrl,
  menuUrl,
  facebookUrl,
  instagramUrl,
  directionsUrl,
}: {
  phone: string | null;
  email: string | null;
  website: string | null;
  bookingUrl: string | null;
  menuUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  directionsUrl: string | null;
}) {
  const hasDirectContact = Boolean(phone || email || website || bookingUrl || menuUrl || facebookUrl || instagramUrl);
  const hasVisitAction = Boolean(directionsUrl);
  const hasAction = hasDirectContact || hasVisitAction;
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
      aria-label="Business contact and visit options"
    >
      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">
        Contact or visit this business
      </h2>
      {hasAction ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {phone && (
            <a href={`tel:${phone}`} className="btn btn-primary min-h-11">
              <Phone size={16} aria-hidden="true" />
              Call
            </a>
          )}
          {email && (
            <a href={`mailto:${email}`} className="btn btn-outline min-h-11">
              <Mail size={16} aria-hidden="true" />
              Email business
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline min-h-11"
            >
              <Globe size={16} aria-hidden="true" />
              Website <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          {bookingUrl && (
            <a href={bookingUrl} target="_blank" rel="noopener noreferrer" data-directory-action="booking" className="btn btn-primary min-h-11">
              Book <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          {menuUrl && (
            <a href={menuUrl} target="_blank" rel="noopener noreferrer" data-directory-action="menu" className="btn btn-outline min-h-11">
              Menu <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          {facebookUrl && (
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-11">
              <Globe size={16} aria-hidden="true" /> Facebook <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline min-h-11">
              <Globe size={16} aria-hidden="true" /> Instagram <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline min-h-11"
            >
              <Navigation size={16} aria-hidden="true" />
              Directions <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Direct contact or visit details have not yet been added to this public profile.
        </p>
      )}
    </section>
  );
}

function PublicServiceDetails({ services, areaServed, accessibilityFeatures }: { services: string[]; areaServed: string[]; accessibilityFeatures: string[] }) {
  if (services.length === 0 && areaServed.length === 0 && accessibilityFeatures.length === 0) return null;
  return <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><h2 className="text-2xl font-black tracking-tight">What this business offers</h2><div className="mt-5 grid gap-6 sm:grid-cols-2">{services.length > 0 && <DetailList title="Services and specialties" values={services} />}{areaServed.length > 0 && <DetailList title="Areas served" values={areaServed} />}{accessibilityFeatures.length > 0 && <DetailList title="Accessibility" values={accessibilityFeatures} />}</div></section>;
}

function DetailList({ title, values }: { title: string; values: string[] }) {
  return <div><h3 className="text-sm font-black uppercase tracking-[0.12em] text-slate-500">{title}</h3><ul className="mt-3 flex flex-wrap gap-2">{values.map((value) => <li key={value} className="rounded-full border border-teal-900/10 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-950">{value}</li>)}</ul></div>;
}

function ProfileIdentityVisual({
  logo,
  categorySlug,
  categoryName,
}: {
  logo: PublicMedia | null;
  categorySlug: string;
  categoryName: string;
}) {
  if (!logo) {
    return (
      <DirectoryCategoryVisual
        categorySlug={categorySlug}
        label={categoryName}
        className="h-16 w-16 shrink-0 rounded-2xl"
      />
    );
  }

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/80 bg-white p-2 shadow-sm sm:h-24 sm:w-24">
      <Image
        src={`/api/media/${logo.media_id}`}
        alt={logo.alt_text}
        width={192}
        height={192}
        sizes="(max-width: 640px) 80px, 96px"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

function PublicMediaGallery({ media }: { media: PublicMedia[] }) {
  if (media.length === 0) return null;
  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h2 className="text-lg font-black tracking-tight">From the business</h2>
        <p className="text-xs font-semibold text-slate-500">Owner-provided or licensed imagery, reviewed before publication</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {media.map((item) => (
          <Image
            key={item.media_id}
            src={`/api/media/${item.media_id}`}
            alt={item.alt_text}
            width={800}
            height={512}
            sizes="(max-width: 640px) 100vw, 50vw"
            className="h-64 w-full rounded-2xl object-cover"
          />
        ))}
      </div>
    </section>
  );
}

function LicensedCategoryContextImage({ image, categoryName, businessName }: { image: CategoryContextImage; categoryName: string; businessName: string }) {
  return (
    <figure className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <Image src={image.image_url} alt={`Licensed ${categoryName} category context. It does not depict ${businessName}.`} width={1600} height={900} unoptimized className="h-64 w-full object-cover sm:h-80" />
      <figcaption className="space-y-1 p-4 text-xs leading-5 text-slate-600">
        <p className="font-bold text-slate-800">Licensed category image — does not depict this business</p>
        <p>Photo by <a href={image.photographer_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">{image.photographer}</a> on <a href={image.provider_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Pexels</a>.</p>
      </figcaption>
    </figure>
  );
}

function PublicProfileHighlights({ facts }: { facts: PublicProfileFact[] }) {
  if (facts.length === 0) return null;
  return (
    <section className="mb-8 rounded-3xl border border-teal-900/10 bg-teal-50/60 p-5 shadow-sm sm:p-6" aria-label="Business highlights">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-900">At a glance</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {facts.map((fact) => (
          <li key={`${fact.label}-${fact.value ?? ""}`} className="rounded-full border border-teal-900/15 bg-white px-3 py-2 text-sm font-bold text-slate-800 shadow-sm">
            {fact.value ? <><span className="text-slate-500">{fact.label}: </span>{fact.value}</> : fact.label}
            {fact.sourceReported && <span className="ml-2 text-xs font-semibold text-slate-500">Source-reported</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

const sourceFieldLabels: Record<string, string> = {
  business_name: "business name",
  category_slug: "category",
  suburb_slug: "suburb",
  street_address: "address",
  contact_email: "email",
  phone: "phone",
  website: "website",
  facebook_url: "Facebook profile",
  instagram_url: "Instagram profile",
  description: "business details",
  trading_hours: "hours",
};

function PublicSourceSummaries({ summaries }: { summaries: PublicSourceSummary[] }) {
  if (summaries.length === 0) return null;
  return (
    <section className="rounded-3xl border border-teal-900/10 bg-teal-50/60 p-6 shadow-sm">
      <h2 className="text-lg font-black">Information sources</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Selected public details on this profile are backed by a public source.
        Source observations can change; owners can submit corrections for review.
      </p>
      <ul className="mt-5 space-y-4">
        {summaries.map((summary) => {
          const fields = summary.supported_fields
            .map((field) => sourceFieldLabels[field])
            .filter((field): field is string => Boolean(field));
          return (
            <li key={summary.source_key} className="border-t border-teal-900/10 pt-4 first:border-t-0 first:pt-0">
              <p className="font-bold text-slate-900">{summary.source_name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {fields.length > 0 && <>Supports {fields.join(", ")}. </>}
                Last source observation <time dateTime={summary.observed_on}>{formatSourceDate(summary.observed_on)}</time>.
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RelatedLocalBusinesses({
  vendors,
  categoryName,
  categorySlug,
  suburbName,
  suburbSlug,
}: {
  vendors: RelatedVendor[];
  categoryName: string;
  categorySlug: string;
  suburbName: string;
  suburbSlug: string;
}) {
  if (vendors.length === 0) return null;
  const browseHref = `/businesses?${new URLSearchParams({ category: categorySlug, suburb: suburbSlug }).toString()}`;
  return (
    <section className="border-t border-slate-200 bg-white py-12 sm:py-16" aria-label={`More ${categoryName} businesses in ${suburbName}`}>
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Keep exploring locally</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">More {categoryName} in {suburbName}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Browse nearby public profiles before deciding who to contact directly.
            </p>
          </div>
          <Link href={browseHref} className="btn btn-outline self-start sm:self-auto">
            View all {categoryName}
          </Link>
        </div>
        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {vendors.map((related) => (
            <article key={related.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:border-teal-700 hover:bg-white hover:shadow-lg">
              <DirectoryCategoryVisual categorySlug={categorySlug} label={categoryName} className="h-20" />
              <div className="p-5">
                <h3 className="text-lg font-black leading-tight tracking-tight">{related.business_name}</h3>
                {related.street_address && <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{related.street_address}</p>}
                <Link href={`/vendor/${related.slug}`} className="mt-5 inline-flex min-h-11 items-center text-sm font-bold text-teal-900 underline decoration-teal-800/40 underline-offset-4 transition group-hover:text-teal-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-800">
                  View profile
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function formatSourceDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
