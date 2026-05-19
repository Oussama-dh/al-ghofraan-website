// app/api/check-in/organizer/activate/route.ts
//
// GET endpoint dat de organizer-QR (URL met ?code=...) afhandelt.
//
// Bestaansreden:
//   In Next 14 mag cookies().set() alleen vanuit een Route Handler
//   of vanuit een Server Action die als action wordt aangeroepen
//   (form-submit, button-click). Tijdens normale page-render van
//   een Server Component is cookies().set() verboden — vandaar deze
//   aparte route. De /check-in/organizer page redirect hier naartoe
//   als er een ?code= query-param is.
//
// Flow:
//   GET /api/check-in/organizer/activate?code=...
//     - settings ophalen
//     - check_in_organizer_code leeg     → 303 ?error=not_configured
//     - code ontbreekt of fout           → 303 ?error=invalid_code
//     - code klopt                       → cookie + 303 ?activated=1
//
// ─── BUGHISTORIE ─────────────────────────────────────────────
// Eerdere pogingen om dezelfde redirect te bouwen:
//
//   v1: new URL(path, request.url)         — Location werd absolute URL
//                                             met inkomende host (0.0.0.0
//                                             in dev → ERR_ADDRESS_INVALID).
//   v2: request.nextUrl.clone()            — gehoopt dat Next een relatieve
//                                             Location header zou genereren.
//                                             Doet ze niet — bevat nog
//                                             steeds absolute host (in
//                                             productie: 0.0.0.0:3000 via
//                                             intern Caddy-bind, geverifieerd
//                                             met curl).
//   v3 (deze): blote NextResponse(null,    — Volledige controle over de
//              { headers: { Location } })   Location header. Pad-string blijft
//                                             pad-string. Browser interpreteert
//                                             relatief tegen de host in de
//                                             adresbalk.
//
// De Location-header-spec (RFC 7231) staat relatieve URI's expliciet
// toe. Alle moderne browsers handelen dit netjes af.

import { NextResponse }    from "next/server";
import { getSiteSettings } from "@/lib/directus";
import {
  ORGANIZER_COOKIE_NAME,
  ORGANIZER_COOKIE_PATH,
  getOrganizerCodeFromSettings,
  resolveSessionDurationMs,
  signOrganizerSession,
  verifyOrganizerCode,
} from "@/lib/server/checkIn";

/**
 * Bouw een 303 See Other met een PURE RELATIEVE Location header.
 *
 * Geen `NextResponse.redirect()` — die normaliseert het pad naar
 * een absolute URL en zet daar de inkomende host bij. We willen
 * juist géén host in de Location header zodat de browser de host
 * van de huidige adresbalk gebruikt.
 *
 * Caller kan op de teruggegeven response nog `.cookies.set(...)`
 * doen voordat hij hem retourneert.
 */
function redirectRelative(path: string): NextResponse {
  return new NextResponse(null, {
    status: 303,
    headers: { Location: path },
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const settings = await getSiteSettings();
  const expected = getOrganizerCodeFromSettings(settings);

  if (!expected) {
    console.warn(
      "[check-in:organizer:activate] site_settings.check_in_organizer_code " +
      "ontbreekt of is leeg — organisator-autorisatie is uitgeschakeld.",
    );
    return redirectRelative("/check-in/organizer?error=not_configured");
  }

  // request.url parsen voor alleen de query — host wordt verder
  // niet gebruikt (we doen geen absolute redirect).
  const url  = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim();

  if (!verifyOrganizerCode(code, expected)) {
    return redirectRelative("/check-in/organizer?error=invalid_code");
  }

  // ─── Cookie zetten en doorlinken ─────────────────────────
  const sessionTtlMs = resolveSessionDurationMs(settings);
  const expiresAtMs  = Date.now() + sessionTtlMs;
  const signed       = signOrganizerSession(expiresAtMs, expected);

  if (!signed) {
    // In de praktijk niet bereikbaar — expected is hierboven al
    // gevalideerd. Defensief: dezelfde "niet geconfigureerd" melding
    // zodat we nooit stilzwijgend doorgaan zonder cookie.
    return redirectRelative("/check-in/organizer?error=not_configured");
  }

  const response = redirectRelative("/check-in/organizer?activated=1");
  response.cookies.set({
    name:     ORGANIZER_COOKIE_NAME,
    value:    signed,
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     ORGANIZER_COOKIE_PATH,
    maxAge:   Math.floor(sessionTtlMs / 1000),
    expires:  new Date(expiresAtMs),
  });
  return response;
}
