import Link from "next/link";

export default function DirectoryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Header ───────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b"
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          borderColor: "var(--sm-border)",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-black tracking-tighter uppercase focus-visible:outline-none rounded"
            style={{ color: "var(--sm-text-primary)" }}
            aria-label="SuburbMates home"
          >
            SuburbMates
          </Link>

          {/* Desktop Nav */}
          <nav className="flex items-center gap-6" aria-label="Main navigation">

            <Link href="/login" className="nav-link">
              Sign In
            </Link>

            <Link href="/join" className="btn btn-primary">
              List Business
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="flex-grow pt-20" id="main-content">
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer
        style={{
          backgroundColor: "var(--sm-surface-inverse)",
          color: "var(--sm-text-on-inverse)",
          borderTop: "1px solid rgba(255,255,255,0.10)",
        }}
        className="py-12"
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">

          <Link
            href="/"
            className="text-xl font-black tracking-tighter uppercase focus-visible:outline-none focus-visible:ring-2 rounded"
            style={{ color: "var(--sm-text-on-inverse)" }}
            aria-label="SuburbMates home"
          >
            SuburbMates
          </Link>

          <nav aria-label="Footer navigation" className="flex items-center gap-6">
            <Link
              href="/how-it-works"
              className="text-xs uppercase tracking-widest font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded px-1"
              style={{ color: "var(--sm-text-on-inverse-secondary)" }}
            >
              How It Works
            </Link>
            <Link
              href="/join"
              className="text-xs uppercase tracking-widest font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded px-1"
              style={{ color: "var(--sm-text-on-inverse-secondary)" }}
            >
              List Business
            </Link>
            <Link
              href="/contact"
              className="text-xs uppercase tracking-widest font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white rounded px-1"
              style={{ color: "var(--sm-text-on-inverse-secondary)" }}
            >
              Contact
            </Link>
          </nav>

          {/* Copyright — gray-300 on black = 10.7:1 ✅ */}
          <p
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--sm-text-on-inverse-secondary)" }}
          >
            © {new Date().getFullYear()} SuburbMates
          </p>
        </div>
      </footer>
    </div>
  );
}
