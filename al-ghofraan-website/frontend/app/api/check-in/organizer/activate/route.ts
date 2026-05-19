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
//     - check_in_organizer_code leeg     → redirect ?error=not_configured
//     - code ontbreekt of fout           → redirect ?error=invalid_code
//     - code klopt                       → cookie zetten, redirect ?activated=1
//
// ─── BUGFIX (delivery QR-Organizer-Fix2) ─────────────────────
// Eerder gebruikten we `new URL(path, request.url)` om een absolute
// redirect-URL te bouwen. Dat werkt verkeerd wanneer de gebruiker
// de site benadert via `http://0.0.0.0:3000` (zoals next dev
// standaard toont in de "Network:" regel): de redirect-Location
// header bevat dan letterlijk `http://0.0.0.0:3000/...`, en Chrome
// weigert die te volgen (ERR_ADDRESS_INVALID).
//
// Fix: gebruik `request.nextUrl.clone()`. Dat is een NextURL die,
// als hij aan NextResponse.redirect wordt meegegeven, in Next 14
// als same-origin redirect wordt behandeld — de browser interpreteert
// hem dan relatief aan de host in de adresbalk, los van wat de
// inkomende request-URL bevatte. Werkt zowel op localhost als 0.0.0.0
// als in productie.

import { NextResponse }    from "next/server";
import type { NextRequest } from "next/server";
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
 * Bouw een redirect naar een same-origin pad. Gebruikt
 * `request.nextUrl.clone()` zodat de browser-zichtbare host
 * behouden blijft en we nooit per ongeluk een onbenaderbare
 * host (0.0.0.0, intern hostname) in de Location header zetten.
 */
function redirectTo(
  request: NextRequest,
  path:    string,
  search:  string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search   = search;
  return NextResponse.redirect(url, 303);
  // 303 = "See Other" — semantisch correct voor "actie afgerond,
  // ga hier kijken". Forceert GET op de bestemming.
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const settings = await getSiteSettings();
  const expected = getOrganizerCodeFromSettings(settings);

  if (!expected) {
    console.warn(
      "[check-in:organizer:activate] site_settings.check_in_organizer_code " +
      "ontbreekt of is leeg — organisator-autorisatie is uitgeschakeld.",
    );
    return redirectTo(request, "/check-in/organizer", "?error=not_configured");
  }

  const code = (request.nextUrl.searchParams.get("code") || "").trim();

  if (!verifyOrganizerCode(code, expected)) {
    return redirectTo(request, "/check-in/organizer", "?error=invalid_code");
  }

  // ─── Cookie zetten en doorlinken ─────────────────────────
  const sessionTtlMs = resolveSessionDurationMs(settings);
  const expiresAtMs  = Date.now() + sessionTtlMs;
  const signed       = signOrganizerSession(expiresAtMs, expected);

  if (!signed) {
    // In de praktijk niet bereikbaar — expected is hierboven al
    // gevalideerd. Defensief: toon dezelfde "niet geconfigureerd"
    // melding zodat we nooit stilzwijgend doorgaan zonder cookie.
    return redirectTo(request, "/check-in/organizer", "?error=not_configured");
  }

  const res = redirectTo(request, "/check-in/organizer", "?activated=1");
  res.cookies.set({
    name:     ORGANIZER_COOKIE_NAME,
    value:    signed,
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     ORGANIZER_COOKIE_PATH,
    maxAge:   Math.floor(sessionTtlMs / 1000),
  });
  return res;
}
