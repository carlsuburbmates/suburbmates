import { createClient } from "@/utils/supabase/server";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  Globe,
  Mail,
  MapPin,
  Navigation,
  Phone,
} from "lucide-react";
import { resolvePublicVendorRoute } from "@/lib/public-vendor-route";
import { DirectoryProfileView } from "@/components/observability/DirectoryObservabilityObserver";
import { PublicDirectoryShell } from "@/components/ui/PublicDirectoryShell";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  params: Promise<{ slug: string }>;
}

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
  const [vendorResult, mediaResult] = await Promise.all([
    supabase
      .from("published_vendors")
      .select("*, suburbs(name), categories(name)")
      .eq("id", route.vendorId)
      .single(),
    supabase.rpc("list_public_vendor_media", { p_vendor_id: route.vendorId }),
  ]);
  const vendor = vendorResult.data;
  if (vendorResult.error || !vendor) notFound();
  const media = (mediaResult.data ?? []) as {
    media_id: string;
    media_kind: string;
    alt_text: string;
  }[];
  const suburbName = vendor.suburbs?.name ?? vendor.suburb_slug;
  const categoryName = vendor.categories?.name ?? vendor.category_slug;
  const profileDescription = vendor.description?.trim() || null;
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
      <article className="bg-slate-50 text-slate-950">
        <section className="border-b border-slate-200 bg-white py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-6">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                  {categoryName} · {suburbName}
                </p>
                <div className="mt-5 flex items-start gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-2xl font-black text-white"
                    aria-hidden="true"
                  >
                    {vendor.business_name.charAt(0)}
                  </div>
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
              <ContactActions
                phone={vendor.phone}
                email={vendor.contact_email}
                website={vendor.website}
                directionsUrl={directionsUrl}
              />
            </div>
          </div>
        </section>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            <PublicMediaGallery media={media} />
            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-2xl font-black tracking-tight">
                About this business
              </h2>
              {profileDescription ? (
                <p className="mt-5 whitespace-pre-wrap text-base leading-7 text-slate-700">
                  {profileDescription}
                </p>
              ) : (
                <p className="mt-5 text-base leading-7 text-slate-600">
                  No public business description has been added.
                </p>
              )}
            </section>
          </div>
          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-6">
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
            {vendor.is_claimed === false && (
              <section className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-black">Is this your business?</h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Claiming is reviewed and does not change this profile
                  automatically.
                </p>
                <Link
                  href={`/claim?listing=${encodeURIComponent(vendor.id)}`}
                  className="btn btn-outline mt-5 w-full"
                >
                  Request ownership
                </Link>
              </section>
            )}
            <Link
              href={`/contact?topic=listing_correction&business=${encodeURIComponent(vendor.business_name)}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold underline underline-offset-4 hover:border-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Report a problem with this listing
            </Link>
          </aside>
        </div>
      </article>
    </PublicDirectoryShell>
  );
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

function PublicMediaGallery({
  media,
}: {
  media: { media_id: string; media_kind: string; alt_text: string }[];
}) {
  if (media.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="sr-only">Business photos</h2>
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
