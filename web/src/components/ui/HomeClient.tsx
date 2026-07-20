"use client";

import { useEffect } from "react";
import { HeroSearch } from "@/components/ui/HeroSearch";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone, Shield, Store, MapPin, Globe, Star } from "lucide-react";
import { motion } from "framer-motion";

interface HomeClientProps {
  categories: { name: string; slug: string }[];
  suburbs: { name: string; slug: string }[];
  featuredVendors: Array<{
    id: string;
    slug: string;
    business_name: string;
    description: string | null;
    phone: string | null;
    website: string | null;
    street_address: string | null;
    suburbs: Array<{ name: string }>;
  }>;
}

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" },
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.12 } },
};

const valueProps = [
  {
    icon: Phone,
    title: "Direct Contact",
    desc: "When a business provides public contact details, SuburbMates displays them directly without selling the enquiry.",
  },
  {
    icon: Shield,
    title: "Local Discovery",
    desc: "Browse published listings organised by their stored suburb and category, with corrections handled through review.",
  },
  {
    icon: Store,
    title: "Real Local Listings",
    desc: "Discover real businesses across Darebin, including useful listings that are still being completed.",
  },
];

export function HomeClient({ categories, suburbs, featuredVendors }: HomeClientProps) {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) return;

    const completeMagicLink = async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        router.replace("/login?error=Unable%20to%20complete%20sign-in");
        return;
      }

      // Remove the one-time credentials from the address bar before navigation.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      window.location.replace("/dashboard");
    };

    void completeMagicLink();
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ── Hero ───────────────────────────────────────────── */}
      <section
        className="relative h-[85vh] min-h-[620px] flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: "var(--sm-surface-inverse)" }}
        aria-label="Hero section"
      >
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpg')" }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0"
          style={{ backgroundColor: "var(--sm-surface-overlay)" }}
          aria-hidden="true"
        />

        <div className="relative z-10 w-full max-w-4xl mx-auto px-6 text-center pt-16">
          <motion.div initial="initial" animate="animate" variants={staggerContainer}>
            <motion.h1
              variants={fadeInUp}
              className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-[0.88]"
              style={{ color: "var(--sm-text-on-inverse)" }}
            >
              LOCAL BUSINESSES.<br />
              ZERO NOISE.
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-xl md:text-2xl font-light tracking-wide mb-12 max-w-2xl mx-auto"
              style={{ color: "var(--sm-text-on-inverse-secondary)" }}
            >
              Find local businesses in your suburb instantly.
              No sign-ups. No middlemen. Just direct contact.
            </motion.p>

            <HeroSearch categories={categories} suburbs={suburbs} />

            <motion.div
              variants={fadeInUp}
              className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold tracking-widest uppercase"
              style={{ color: "rgba(255,255,255,0.85)" }}
              aria-label="Popular categories"
            >
              {categories.slice(0, 5).map((cat, i, arr) => (
                <span key={cat.slug} className="flex items-center gap-6">
                  <Link
                    href={`/categories/${cat.slug}`}
                    className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded"
                    style={{ color: "inherit" }}
                  >
                    {cat.name}
                  </Link>
                  {i < arr.length - 1 && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: "rgba(255,255,255,0.35)" }}
                      aria-hidden="true"
                    />
                  )}
                </span>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Local businesses ─────────────────────────────────────── */}
      {featuredVendors && featuredVendors.length > 0 && (
        <section
          className="py-24"
          style={{ backgroundColor: "var(--sm-surface-default)" }}
          aria-label="Local businesses"
        >
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-80px" }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="mb-12">
                <h2 className="text-3xl font-black tracking-tight mb-4" style={{ color: "var(--sm-text-primary)" }}>
                  Local Businesses
                </h2>
                <p className="text-lg" style={{ color: "var(--sm-text-secondary)" }}>
                  A selection of real businesses from across the local directory.
                </p>
              </motion.div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredVendors.map((vendor) => (
                  <motion.article
                    key={vendor.id}
                    variants={fadeInUp}
                    className="card relative overflow-hidden transition-all duration-300 border-slate-200 hover:border-black hover:shadow-lg flex flex-col h-full"
                  >
                    <div className="flex-1 p-6">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <h3 className="text-xl font-black tracking-tight text-black">
                          {vendor.business_name}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                        <MapPin size={14} className="text-slate-400" aria-hidden="true" />
                        <span>{vendor.street_address ? `${vendor.street_address} • ` : ''}Servicing {vendor.suburbs?.[0]?.name || 'Local Area'}</span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed mb-6 line-clamp-3">
                        {vendor.description || `No description provided. Contact ${vendor.business_name} directly using the details below.`}
                      </p>
                    </div>

                    <div className="p-6 pt-0 mt-auto flex flex-col gap-2">
                      {vendor.phone && (
                        <a
                          href={`tel:${vendor.phone}`}
                          className="btn btn-primary w-full flex items-center justify-center gap-2"
                        >
                          <Phone size={16} aria-hidden="true" />
                          <span>Call Direct</span>
                        </a>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <Link
                          href={`/vendor/${vendor.slug}`}
                          className="btn btn-ghost w-full flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-xs"
                        >
                          <Star size={14} aria-hidden="true" />
                          <span>View Profile</span>
                        </Link>
                        {vendor.website && (
                          <a
                            href={vendor.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-outline w-full flex items-center justify-center gap-2 text-xs"
                          >
                            <Globe size={14} aria-hidden="true" />
                            <span>Website</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── Value Props ─────────────────────────────────────── */}
      <section
        className="py-28"
        style={{ backgroundColor: "var(--sm-surface-muted)" }}
        aria-label="Why SuburbMates"
      >
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            {valueProps.map((prop) => (
              <motion.div
                key={prop.title}
                variants={fadeInUp}
                className="card group"
              >
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-2 transition-transform duration-300"
                  style={{
                    backgroundColor: "var(--sm-brand-bg)",
                    color: "var(--sm-brand-text)",
                  }}
                  aria-hidden="true"
                >
                  <prop.icon size={26} strokeWidth={2} />
                </div>

                <h2
                  className="text-xl font-black tracking-tight mb-3"
                  style={{ color: "var(--sm-text-primary)" }}
                >
                  {prop.title}
                </h2>

                <p
                  className="text-base leading-relaxed font-medium"
                  style={{ color: "var(--sm-text-tertiary)" }}
                >
                  {prop.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section
        className="relative py-28 overflow-hidden"
        style={{ backgroundColor: "var(--sm-surface-inverse)" }}
        aria-label="List your business"
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[120px] pointer-events-none"
          style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          aria-hidden="true"
        />

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="relative z-10 max-w-4xl mx-auto px-6 text-center"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-5xl md:text-7xl font-black tracking-tighter mb-6"
            style={{ color: "var(--sm-text-on-inverse)" }}
          >
            OWN A LOCAL BUSINESS?
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-xl font-light leading-relaxed mb-12 max-w-2xl mx-auto"
            style={{ color: "var(--sm-text-on-inverse-secondary)" }}
          >
            Join the most straightforward local directory. Get in front of customers
            looking for exactly what you do — no lock-in contracts.
          </motion.p>

          <motion.div variants={fadeInUp}>
            <Link
              href="/join"
              className="btn btn-inverse"
              aria-label="List your business on SuburbMates"
            >
              <span>List Your Business</span>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
