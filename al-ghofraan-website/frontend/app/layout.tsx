// app/layout.tsx

import type { Metadata } from "next";
import Script           from "next/script";
import localFont        from "next/font/local";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ThemeScript     from "@/components/theme/ThemeScript";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import {
  getSiteSettings,
  getNavigationItems,
  getIconSettings,
  resolveIconKey,
  getAssetUrl,
  ICON_KEYS,
} from "@/lib/directus";
import { getSiteUrl } from "@/lib/utils";

// In development direct verse data ophalen — wijzigingen in Directus
// zijn meteen zichtbaar na refresh. In productie weer gewone caching.
export const dynamic = "force-dynamic";

// ─── Fonts (delivery 27) ─────────────────────────────────────────
// Bogart Arabic is sinds delivery 27 het primaire font voor de hele
// website, inclusief Latijnse tekst, Arabische tekst, headings en
// body. Eén variable font-bestand dekt de weight-range 300–800; geen
// statische weights nodig.
//
// Constructie:
//   Bestaande Tailwind config (locked) verwijst naar twee CSS-variabelen
//   --font-amiri en --font-outfit. We doen geen Tailwind-refactor maar
//   laten beide variabelen wijzen naar hetzelfde Bogart-bestand, via
//   twee aliassen op dezelfde lokale font. Next.js dedupliceert het
//   binary onder de motorkap, dus het bestand wordt maar één keer
//   gefetched. Resultaat: `font-display`, `font-body` en `font-arabic`
//   Tailwind-classes wijzen automatisch naar Bogart Arabic zonder
//   wijzigingen aan tailwind.config.ts, globals.css of componenten.
//
// De variabele-namen heten nog `--font-amiri`/`--font-outfit` om de
// koppeling met de bestaande Tailwind-config te behouden — dat is
// cosmetisch raar, maar minimaliseert de impact van deze delivery.


// Beide aliassen verwijzen naar hetzelfde bestand; Next.js
// dedupliceert het binary in de build.
const bogartAsDisplayAndArabic = localFont({
  src: "./fonts/bogart-arabic/Bogart-Arabic-Variable-Roman.woff2",
  weight: "300 800",
  display: "swap",
  variable: "--font-amiri",
  fallback: ["Arial", "sans-serif"],
});

const bogartAsBody = localFont({
  src: "./fonts/bogart-arabic/Bogart-Arabic-Variable-Roman.woff2",
  weight: "300 800",
  display: "swap",
  variable: "--font-outfit",
  fallback: ["Arial", "sans-serif"],
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
    metadataBase: new URL(getSiteUrl()),
    // "./" resolveert per pagina naar metadataBase + huidige pathname.
    // Geeft elke pagina automatisch een <link rel="canonical"> in de HTML
    // head. Detail-pagina's kunnen dit in hun eigen generateMetadata
    // overschrijven indien nodig.
    alternates: {
      canonical: "./",
    },
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

  const logoUrl       = getAssetUrl(settings?.logo || null);
  const footerLogoUrl = getAssetUrl(settings?.footer_logo || null) || logoUrl;
  const emailIcon     = resolveIconKey(iconMap, ICON_KEYS.contactEmail);
  const phoneIcon     = resolveIconKey(iconMap, ICON_KEYS.contactPhone);
  const addressIcon   = resolveIconKey(iconMap, ICON_KEYS.contactAddress);

  const showFooter = settings?.footer_enabled !== false; // default true

  return (
    <html
      lang="nl"
      className={`${bogartAsDisplayAndArabic.variable} ${bogartAsBody.variable}`}
      // suppressHydrationWarning omdat de pre-hydration script (.dark class
      // + data-theme attribuut) <html> al muteert vóór React hydrateert.
      // React zou anders een mismatch op dit element melden.
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col">
        {/* Pre-hydration theme-script — moet zo vroeg mogelijk in <body>
            staan zodat de juiste .dark-class al gezet is voordat de
            eerste pixel wordt getekend. */}
        <ThemeScript />
        <ThemeProvider>
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
              logoUrl={footerLogoUrl}
              emailIcon={emailIcon}
              phoneIcon={phoneIcon}
              addressIcon={addressIcon}
            />
          )}
        </ThemeProvider>

        {/* Google Analytics (GA4) — delivery 22.
            Plaatsing in server-rendered layout zodat de <script>-tags
            zichtbaar zijn in de initiële HTML (view-source). gtag.js
            wordt geladen via next/script met strategy="afterInteractive"
            zodat het de paint niet blokkeert.

            TV-route uitsluiting: gtag('config', ...) wordt alleen
            uitgevoerd als de pathname NIET met /gebedstijden/tv begint.
            Het externe gtag.js wordt op de TV-route nog wel opgehaald,
            maar zonder config-call registreert het geen pageview en
            vervuilt het de analytics-data niet. */}
        <Script
          id="ga-loader"
          src="https://www.googletagmanager.com/gtag/js?id=G-K19YMZJ71R"
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            if (!window.location.pathname.startsWith('/gebedstijden/tv')) {
              gtag('config', 'G-K19YMZJ71R', { anonymize_ip: true });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
