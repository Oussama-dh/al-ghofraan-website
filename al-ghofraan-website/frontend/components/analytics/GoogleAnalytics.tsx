// components/analytics/GoogleAnalytics.tsx
//
// Google Analytics (GA4) loader — delivery 22.
//
// Gedrag:
//   - Laadt gtag.js via `next/script` met strategy="afterInteractive",
//     zodat de hoofdcontent eerst gehydrateerd is.
//   - `anonymize_ip: true` als minimale privacy-mitigatie zolang er
//     nog geen cookie-consent banner is.
//   - GA wordt NIET geladen op `/gebedstijden/tv` — dat is een intern
//     moskee-display dat alleen op één scherm in de moskee draait, en
//     zou de analytics-data anders vervuilen met permanent open
//     sessies.
//
// Implementatie als client-component omdat `usePathname()` nodig is
// voor de TV-route check. De `<Script>`-tags zelf renderen normaal
// HTML in de output en gtag.js wordt door de browser opgehaald —
// geen extra client-side bundle van betekenis.
//
// Toekomstige delivery kan dit uitbreiden met:
//   - cookie-consent (AVG): conditional loading na opt-in
//   - env-variabele voor de Measurement ID (dev/staging/prod splits)
//   - extra `gtag('consent', ...)` defaults voor Consent Mode v2

"use client";

import Script              from "next/script";
import { usePathname }     from "next/navigation";

// Hardcoded conform delivery 22 scope. Klant heeft deze ID
// aangeleverd; als later meerdere environments nodig zijn kan dit
// alsnog naar een NEXT_PUBLIC_GA_ID env-variabele.
const GA_MEASUREMENT_ID = "G-K19YMZJ71R";

// Paden waar GA niet geladen wordt. Vergelijking met startsWith
// zodat eventuele sub-routes onder /gebedstijden/tv automatisch
// ook worden uitgesloten.
const GA_EXCLUDED_PATHS = ["/gebedstijden/tv"];

function isExcluded(pathname: string | null): boolean {
  if (!pathname) return false;
  return GA_EXCLUDED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default function GoogleAnalytics() {
  const pathname = usePathname();

  if (isExcluded(pathname)) {
    return null;
  }

  return (
    <>
      <Script
        id="ga-loader"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
