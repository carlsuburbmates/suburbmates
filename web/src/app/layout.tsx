import type { Metadata } from "next";
import "./globals.css";
import { AxeCore } from "@/components/AxeCore";
import { DirectoryObservabilityObserver } from "@/components/observability/DirectoryObservabilityObserver";

const publicLaunchEnabled = process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED === "true";

export const metadata: Metadata = {
  metadataBase: new URL("https://suburbmates.com.au"),
  title: publicLaunchEnabled ? "SuburbMates — Discover local businesses" : "SuburbMates — Preparing for launch",
  description: publicLaunchEnabled
    ? "Discover local businesses across the City of Darebin."
    : "SuburbMates is preparing a better way to discover local businesses.",
  alternates: { canonical: "/" },
  robots: publicLaunchEnabled ? undefined : { index: false, follow: false },
  openGraph: {
    title: publicLaunchEnabled ? "SuburbMates — Discover local businesses" : "SuburbMates — Preparing for launch",
    description: publicLaunchEnabled
      ? "Discover local businesses across the City of Darebin."
      : "SuburbMates is preparing a better way to discover local businesses.",
    url: "https://suburbmates.com.au",
    siteName: "SuburbMates",
    locale: "en_AU",
    type: "website",
    images: [{ url: "/hero-bg.jpg", width: 1024, height: 1024, alt: "SuburbMates local business directory" }],
  },
  twitter: {
    card: "summary_large_image",
    title: publicLaunchEnabled ? "SuburbMates — Discover local businesses" : "SuburbMates — Preparing for launch",
    description: publicLaunchEnabled
      ? "Discover local businesses across the City of Darebin."
      : "SuburbMates is preparing a better way to discover local businesses.",
    images: ["/hero-bg.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <AxeCore />
        <DirectoryObservabilityObserver />
        {children}
      </body>
    </html>
  );
}
