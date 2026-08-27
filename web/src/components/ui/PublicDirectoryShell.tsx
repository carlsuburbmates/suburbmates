import Link from "next/link";

const publicLaunchEnabled =
  process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED === "true";

const primaryNavigation = [
  { href: "/businesses", label: "Browse" },
  { href: "/categories", label: "Categories" },
  { href: "/locations", label: "Locations" },
  { href: "/join", label: "For business owners" },
  { href: "/how-it-works", label: "How it works" },
];

const footerNavigation = [
  { href: "/businesses", label: "Browse directory" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/contact", label: "Contact or report a problem" },
  { href: "/privacy", label: "Privacy" },
  { href: "/login", label: "Sign in" },
];

export function PublicDirectoryShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main-content"
        className="sr-only absolute left-4 top-4 z-50 rounded-lg bg-white px-4 py-3 font-bold text-black shadow-lg focus:not-sr-only focus:outline-none focus:ring-4 focus:ring-black"
      >
        Skip to main content
      </a>
      <header
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b"
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          borderColor: "var(--sm-border)",
        }}
      >
        <div className="max-w-7xl mx-auto h-16 px-4 sm:h-20 sm:px-6 flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center text-xl font-black tracking-tighter uppercase focus-visible:outline-none rounded sm:text-2xl"
            style={{ color: "var(--sm-text-primary)" }}
            aria-label="SuburbMates home"
          >
            SuburbMates
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-5 lg:flex"
          >
            {primaryNavigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-11 items-center rounded px-1 py-2 text-sm font-bold text-slate-700 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded px-1 py-2 text-sm font-bold text-slate-700 transition-colors hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
            >
              Sign in
            </Link>
          </nav>

          <p
            className="hidden text-xs font-bold uppercase tracking-[0.16em] xl:block"
            style={{ color: "var(--sm-text-tertiary)" }}
          >
            {publicLaunchEnabled
              ? "Discover local businesses"
              : "Preparing for launch"}
          </p>

          <details className="relative lg:hidden">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded px-3 py-2 text-sm font-bold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black [&::-webkit-details-marker]:hidden">
              Menu
            </summary>
            <nav
              aria-label="Mobile navigation"
              className="absolute right-0 top-12 z-50 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              {primaryNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-lg px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/login"
                className="block rounded-lg px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black"
              >
                Sign in
              </Link>
            </nav>
          </details>
        </div>
      </header>

      <main className="flex-grow pt-16 sm:pt-20" id="main-content">
        {children}
      </main>

      <footer
        style={{
          backgroundColor: "var(--sm-surface-inverse)",
          color: "var(--sm-text-on-inverse)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
        }}
        className="py-12"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
            <Link
              href="/"
              className="text-xl font-black tracking-tighter uppercase focus-visible:outline-none focus-visible:ring-2 rounded"
              style={{ color: "var(--sm-text-on-inverse)" }}
              aria-label="SuburbMates home"
            >
              SuburbMates
            </Link>

            <nav
              aria-label="Footer navigation"
              className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3"
            >
              {footerNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded font-semibold text-white/80 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="text-center md:text-right">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--sm-text-on-inverse-secondary)" }}
              >
                {publicLaunchEnabled
                  ? "Darebin's local business directory"
                  : "Launching soon"}
              </p>
              <p
                className="mt-2 text-xs uppercase tracking-widest"
                style={{ color: "var(--sm-text-on-inverse-secondary)" }}
              >
                © {new Date().getFullYear()} SuburbMates
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
