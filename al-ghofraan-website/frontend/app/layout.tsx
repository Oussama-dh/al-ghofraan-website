// app/layout.tsx

import type { Metadata } from "next";
import { Amiri, Outfit } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  getSiteSettings,
  getNavigationItems,
  getIconSettings,
  resolveIconKey,
  getAssetUrl,
  ICON_KEYS,
} from "@/lib/directus";

// In development direct verse data ophalen — wijzigingen in Directus
// zijn meteen zichtbaar na refresh. In productie weer gewone caching.
export const dynamic = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";

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

// Metadata wordt server-side gegenereerd op basis van site_settings
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const siteName    = settings?.site_name              || "DawahCommissie Al-Ghofraan";
  const description = settings?.default_seo_description ||
    "De DawahCommissie van moskee Al-Ghofraan organiseert lezingen, activiteiten en programma's voor de moslimgemeenschap.";

  const faviconUrl = getAssetUrl(settings?.favicon || null);
  const ogImageUrl = getAssetUrl(settings?.og_image || null);

  const metadata: Metadata = {
    title: {
      template: `%s | ${siteName}`,
      default:  settings?.default_seo_title || siteName,
    },
    description,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "https://al-ghofraan.com"
    ),
    openGraph: {
      siteName,
      locale: "nl_NL",
      type:   "website",
      ...(ogImageUrl && { images: [{ url: ogImageUrl }] }),
    },
  };

  // Favicon uit Directus, anders fallback naar /favicon.ico in public/
  if (faviconUrl) {
    metadata.icons = {
      icon:     [{ url: faviconUrl }],
      shortcut: faviconUrl,
      apple:    faviconUrl,
    };
  } else {
    metadata.icons = {
      icon:     "/favicon.ico",
      shortcut: "/favicon.ico",
    };
  }

  return metadata;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, headerNav, footerNav, iconMap] = await Promise.all([
    getSiteSettings(),
    getNavigationItems("header"),
    getNavigationItems("footer"),
    getIconSettings(),
  ]);

  const logoUrl     = getAssetUrl(settings?.logo || null);
  const emailIcon   = resolveIconKey(iconMap, ICON_KEYS.contactEmail);
  const phoneIcon   = resolveIconKey(iconMap, ICON_KEYS.contactPhone);
  const addressIcon = resolveIconKey(iconMap, ICON_KEYS.contactAddress);

  const showFooter = settings?.footer_enabled !== false; // default true

  return (
    <html lang="nl" className={`${amiri.variable} ${outfit.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header
          settings={settings}
          navItems={headerNav}
          logoUrl={logoUrl}
        />
        <main className="flex-1">{children}</main>
        {showFooter && (
          <Footer
            settings={settings}
            navItems={footerNav}
            logoUrl={logoUrl}
            emailIcon={emailIcon}
            phoneIcon={phoneIcon}
            addressIcon={addressIcon}
          />
        )}
      </body>
    </html>
  );
}
