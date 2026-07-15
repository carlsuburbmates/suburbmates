import type { Metadata } from "next";
import "./globals.css";
import { AxeCore } from "@/components/AxeCore";

export const metadata: Metadata = {
  metadataBase: new URL("https://suburbmates.com.au"),
  title: "SuburbMates — Preparing for launch",
  description: "SuburbMates is preparing a better way to discover local businesses.",
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
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
