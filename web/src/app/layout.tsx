import type { Metadata } from "next";
import "./globals.css";
import { AxeCore } from "@/components/AxeCore";

export const metadata: Metadata = {
  title: "SuburbMates — Local Trades, Zero Noise",
  description: "Find local tradespeople in your suburb. No paywalls, no middlemen. Direct contact.",
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
