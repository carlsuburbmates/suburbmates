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

type PublicSourceSummary = {
  source_key: string;
  source_name: string;
  observed_on: string;
  supported_fields: string[];
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
  const logo = media.find((item) => item.media_kind === "logo") ?? null;
  const photos = media.filter((item) => item.media_kind === "listing_image");
  const suburbName = vendor.suburbs?.name ?? vendor.suburb_slug;
  const categoryName = vendor.categories?.name ?? vendor.category_slug;
  const profileDescription = vendor.description?.trim() || null;
  const tradingHours = vendor.trading_hours?.trim() || null;
  const profileSummary = describeKnownProfile({
    businessName: vendor.business_name,
    categoryName,
    suburbName,
    streetAddress: vendor.street_address,
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
          addressLocality: suburbName,
          addressCountry: "AU",
        }
      : undefined,
    areaServed: suburbName ? { "@type": "Place", name: suburbName } : undefined,
    sameAs: vendor.website ? [vendor.website] : undefined,
  };
  const directionsUrl = vendor.street_address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([vendor.street_address, suburbName].filter(Boolean).join(", "))}`
    : null;

  return (
    <PublicDirectoryShell>
      <DirectoryProfileView />
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
                    {vendor.street_address && (
                      <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-600">
                        <MapPin size={16} aria-hidden="true" />
                        {vendor.street_address}, {suburbName}
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
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-tight">
                About this business
              </h2>
              {profileDescription ? (
                <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">
                  {profileDescription}
                </p>
              ) : (
                <div className="mt-5 rounded-2xl border border-teal-900/10 bg-teal-50/60 p-5 text-sm leading-6 text-slate-700">
                  <p className="font-bold text-slate-900">Known local details</p>
                  <p className="mt-1">{profileSummary}</p>
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
      </article>
    </PublicDirectoryShell>
  );
}

function describeKnownProfile({
  businessName,
  categoryName,
  suburbName,
  streetAddress,
  hasDirectContact,
}: {
  businessName: string;
  categoryName: string;
  suburbName: string;
  streetAddress: string | null;
  hasDirectContact: boolean;
}) {
  const location = streetAddress
    ? ` The recorded address is ${streetAddress}, ${suburbName}.`
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
  directionsUrl,
}: {
  phone: string | null;
  email: string | null;
  website: string | null;
  directionsUrl: string | null;
}) {
  const hasDirectContact = Boolean(phone || email || website);
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
      aria-label="Direct business contact"
    >
      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-600">
        Contact this business
      </h2>
      {hasDirectContact ? (
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
          Direct contact details have not yet been added to this public profile.
        </p>
      )}
    </section>
  );
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

const sourceFieldLabels: Record<string, string> = {
  business_name: "business name",
  category_slug: "category",
  suburb_slug: "suburb",
  street_address: "address",
  contact_email: "email",
  phone: "phone",
  website: "website",
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

function formatSourceDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(date);
}
