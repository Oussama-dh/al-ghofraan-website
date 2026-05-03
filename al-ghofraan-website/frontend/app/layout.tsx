// app/layout.tsx

import type { Metadata } from "next";
import { Amiri, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getSiteSettings } from "@/lib/directus";

const amiri = Amiri({
  subsets:  ["arabic", "latin"],
  weight:   ["400", "700"],
  variable: "--font-amiri",
  display:  "swap",
});

const outfit = Outfit({
  subsets:  ["latin"],
  weight:   ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
  display:  "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | DawahCommissie Al-Ghofraan",
    default:  "DawahCommissie Al-Ghofraan",
  },
  description:
    "De DawahCommissie van moskee Al-Ghofraan organiseert lezingen, activiteiten en programma's voor de moslimgemeenschap.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://al-ghofraan.com"
  ),
  openGraph: {
    siteName: "Al-Ghofraan",
    locale:   "nl_NL",
    type:     "website",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings().catch(() => null);

  return (
    <html lang="nl" className={`${amiri.variable} ${outfit.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header settings={settings} />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
