"use client";

import { useEffect } from "react";
import ReactDOM from "react-dom";
import { HeroSearch } from "@/components/ui/HeroSearch";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Phone, Shield, Store, MapPin } from "lucide-react";
import { motion } from "framer-motion";

interface HomeClientProps {
  categories: { name: string; slug: string }[];
  suburbs: { name: string; slug: string }[];
  featuredVendors: Array<{
    id: string;
    slug: string;
    business_name: string;
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

  // This is the only above-the-fold image on the public home. The CSS background
  // would otherwise be discovered after the page body is parsed.
  ReactDOM.preload("/hero-bg.jpg", { as: "image", fetchPriority: "high" });

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
              Find local businesses across the City of Darebin instantly.
              No sign-ups. No middlemen. Just direct contact.
            </motion.p>

            <HeroSearch categories={categories} suburbs={suburbs} />
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

              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {featuredVendors.map((vendor) => (
                  <motion.article
                    key={vendor.id}
                    variants={fadeInUp}
                    className="h-full"
                  >
                    <Link
                      href={`/vendor/${vendor.slug}`}
                      className="group flex min-h-28 h-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
                    >
                      <div className="min-w-0">
                        <h3 className="truncate text-lg font-black tracking-tight text-black">
                          {vendor.business_name}
                        </h3>
                        <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                          <MapPin size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="truncate">{vendor.suburbs?.[0]?.name || "Local area"}</span>
                        </p>
                        <span className="mt-3 inline-block text-xs font-bold uppercase tracking-wider text-slate-700">View profile</span>
                      </div>
                      <span aria-hidden="true" className="text-2xl font-bold text-slate-400 transition-transform group-hover:translate-x-0.5">›</span>
                    </Link>
                  </motion.article>
                ))}
              </div>
              <div className="mt-8">
                <Link href="/businesses" className="btn btn-outline">Browse all businesses</Link>
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
            First, look for your existing Darebin business so you can claim it without creating a duplicate. If it is genuinely missing, add it for review.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/join"
              className="btn btn-inverse"
              aria-label="Find or claim your business on SuburbMates"
            >
              <span>Find or claim your business</span>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
            <Link href="/join?add=1" className="btn btn-outline border-white/70 text-white hover:bg-white hover:text-black" aria-label="Add a missing business to SuburbMates">
              Add a missing business
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </div>
  );
}
