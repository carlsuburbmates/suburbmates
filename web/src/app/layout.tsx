import type { Metadata } from "next";
import "./globals.css";
import { AxeCore } from "@/components/AxeCore";

const publicLaunchEnabled = process.env.NEXT_PUBLIC_PUBLIC_LAUNCH_ENABLED === "true";

export const metadata: Metadata = {
  metadataBase: new URL("https://suburbmates.com.au"),
  title: publicLaunchEnabled ? "SuburbMates — Discover local businesses" : "SuburbMates — Preparing for launch",
  description: publicLaunchEnabled
    ? "Discover local businesses across Melbourne's suburbs."
    : "SuburbMates is preparing a better way to discover local businesses.",
  alternates: { canonical: "/" },
  robots: publicLaunchEnabled ? undefined : { index: false, follow: false },
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
        {children}
      </body>
    </html>
  );
}
