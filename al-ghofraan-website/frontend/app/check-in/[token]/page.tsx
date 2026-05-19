// app/check-in/[token]/page.tsx
//
// Server component voor de QR check-in pagina.
//
// FLOW:
//  1. Lees token uit URL.
//  2. Lookup registratie via lib/server/checkIn.
//  3. Bij ongeldig/niet-gevonden token: nette "ongeldige link"
//     melding (geen technische details, geen 404 — pagina komt
//     altijd op met instructie aan de bezoeker).
//  4. Bij geldige registratie:
//     - Toon activiteit + naam + huidige check-in status
//     - Render echte QR-code met de absolute check-in URL
//     - Render <CheckInForm> client component. Geef door of
//       de organisator al een geldige cookie heeft (=> code-input
//       overslaan).
//
// SECURITY:
//  - Pagina openen voert GEEN check-in uit. Alleen reads.
//  - Geen PII in de QR-URL — alleen het token.
//  - Cookie wordt server-side gelezen via next/headers cookies()
//    en de booleanwaarde doorgegeven aan client. De cookie zelf
//    blijft HttpOnly en wordt nooit naar client-JS gestuurd.

import type { Metadata } from "next";
import { cookies }       from "next/headers";
import Container         from "@/components/ui/Container";
import { getSiteUrl }    from "@/lib/utils";
import { renderQrSvg }   from "@/lib/qrcode";
import { getSiteSettings } from "@/lib/directus";
import {
  ORGANIZER_COOKIE_NAME,
  getOrganizerCodeFromSettings,
  getRegistrationByCheckInToken,
  verifyOrganizerSession,
} from "@/lib/server/checkIn";
import CheckInForm       from "./CheckInForm";

// Disable static optimization. Token is hoog-entropie per request,
// caching zou geen winst opleveren en risico op stale data.
export const dynamic       = "force-dynamic";
export const fetchCache    = "force-no-store";

export const metadata: Metadata = {
  title: "Check-in activiteit",
  // Geen robots indexering — deze URLs zijn per definitie eenmalig.
  robots: { index: false, follow: false },
};

interface PageProps {
  params: { token: string };
}

export default async function CheckInPage({ params }: PageProps) {
  const token = (params?.token || "").trim();

  // Twee fetches parallel: registratie + site_settings.
  // settings is nodig voor verifyOrganizerSession (cookie-secret
  // wordt afgeleid van de Directus-code).
  const [registration, settings] = await Promise.all([
    getRegistrationByCheckInToken(token),
    getSiteSettings(),
  ]);

  const expectedCode = getOrganizerCodeFromSettings(settings);

  // Cookie-check (server-side) zodat we de code-input overslaan
  // als organisator al recent ingelogd is op dit apparaat.
  // Bij lege Directus-code is verify altijd false → form vraagt om code,
  // maar het submit-pad geeft dan een 503 (geconfigureerd in API).
  const cookieValue = cookies().get(ORGANIZER_COOKIE_NAME)?.value;
  const alreadyAuthorized = verifyOrganizerSession(cookieValue, expectedCode);

  // ─── Geen geldige registratie ─────────────────────────────
  if (!registration) {
    return (
      <main className="min-h-[70vh] bg-sand-50 py-12 lg:py-16">
        <Container>
          <div className="max-w-xl mx-auto bg-white rounded-2xl border border-sand-200 p-8 shadow-sm">
            <h1 className="font-display text-2xl text-ink mb-3">
              Check-in
            </h1>
            <p className="font-body text-base text-taupe-dark leading-relaxed">
              Deze check-in link is niet (meer) geldig. Mogelijk is de link
              verlopen of incorrect overgenomen. Neem contact op met de
              organisatie als u denkt dat er een fout is.
            </p>
          </div>
        </Container>
      </main>
    );
  }

  // ─── Geldige registratie — render pagina ──────────────────
  const checkInUrl  = `${getSiteUrl()}/check-in/${token}`;
  const qrSvg       = await renderQrSvg(checkInUrl);
  const isCheckedIn = Boolean(registration.checked_in_at);

  return (
    <main className="min-h-[70vh] bg-sand-50 py-8 lg:py-12">
      <Container>
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-sand-200 p-6 lg:p-8 shadow-sm space-y-6">
          <header>
            <h1 className="font-display text-2xl lg:text-3xl text-ink">
              Check-in activiteit
            </h1>
            <p className="font-body text-sm text-taupe-dark mt-1">
              Laat deze QR-code zien bij binnenkomst.
            </p>
          </header>

          {/* Inschrijfgegevens */}
          <section className="border-t border-sand-200 pt-5">
            <dl className="space-y-2 font-body text-sm">
              <div className="flex gap-3">
                <dt className="text-taupe-dark/70 w-24 shrink-0">Activiteit</dt>
                <dd className="text-ink font-medium">
                  {registration.source_title || "—"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-taupe-dark/70 w-24 shrink-0">Naam</dt>
                <dd className="text-ink font-medium">
                  {registration.name || "—"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-taupe-dark/70 w-24 shrink-0">Status</dt>
                <dd>
                  {isCheckedIn ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-50 text-green-800 text-xs font-medium border border-green-200">
                      Ingecheckt
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sand-100 text-taupe-dark text-xs font-medium border border-sand-200">
                      Nog niet ingecheckt
                    </span>
                  )}
                </dd>
              </div>
              {isCheckedIn && registration.checked_in_at && (
                <div className="flex gap-3">
                  <dt className="text-taupe-dark/70 w-24 shrink-0">Tijd</dt>
                  <dd className="text-ink">
                    {formatLocalDateTime(registration.checked_in_at)}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {/* QR-code */}
          {qrSvg && (
            <section className="border-t border-sand-200 pt-5 flex flex-col items-center">
              <div
                aria-label="QR-code voor check-in"
                className="w-48 h-48 lg:w-56 lg:h-56 [&_svg]:w-full [&_svg]:h-full"
                // eslint-disable-next-line react/no-danger -- SVG van vertrouwde server-side bron (lib/qrcode.ts)
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="font-body text-xs text-taupe-dark/70 mt-3 text-center break-all">
                {checkInUrl}
              </p>
            </section>
          )}

          {/* Organisator-formulier — alleen tonen als nog niet ingecheckt */}
          {!isCheckedIn && (
            <section className="border-t border-sand-200 pt-5">
              <h2 className="font-display text-lg text-ink mb-1">
                Voor de organisator
              </h2>
              <p className="font-body text-sm text-taupe-dark mb-4">
                Bevestig de aanwezigheid van deze deelnemer.
              </p>
              <CheckInForm
                token={token}
                alreadyAuthorized={alreadyAuthorized}
              />
            </section>
          )}
        </div>
      </Container>
    </main>
  );
}

/**
 * Format een ISO-timestamp in NL locale. Lokale helper i.p.v.
 * formatDate uit lib/utils zodat we hier zowel datum als tijd
 * tonen ("19 mei 2026 14:32").
 */
function formatLocalDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("nl-NL", {
      day:    "numeric",
      month:  "long",
      year:   "numeric",
      hour:   "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
