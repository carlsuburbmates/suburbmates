"use client";

import { useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export function LaunchPage() {
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
        router.replace("/login?next=%2Fops&error=magic-link");
        return;
      }

      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      window.location.replace("/ops");
    };

    void completeMagicLink();
  }, [router]);

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#111111] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center px-6 py-20 sm:px-10">
        <section className="max-w-3xl">
          <p className="mb-8 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/75">
            Preparing for launch
          </p>
          <h1 className="max-w-3xl text-5xl font-black leading-[0.92] tracking-[-0.06em] sm:text-7xl">
            LOCAL BUSINESS.
            <br />
            DONE PROPERLY.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/70 sm:text-xl">
            SuburbMates is being carefully prepared for launch. We are building
            a more useful, less noisy way to discover local businesses.
          </p>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/50">
            We are not taking public listings or enquiries just yet. Thank you
            for your patience while we make the experience ready.
          </p>
          <div className="mt-14 flex items-center gap-3 text-sm font-semibold text-white/55">
            <span
              className="h-2.5 w-2.5 rounded-full bg-emerald-400"
              aria-hidden="true"
            />
            Melbourne&apos;s local directory, coming soon.
          </div>
        </section>
      </div>
    </div>
  );
}
