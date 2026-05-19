// app/api/check-in/[token]/route.ts
//
// POST endpoint dat een activity-inschrijving incheckt op basis
// van de check_in_token in de URL.
//
// ─── Wijziging in delivery QR-Organizer ──────────────────────
// De organisator-code komt nu uit Directus
// (settings.check_in_organizer_code), niet meer uit env. Voordeel:
// hoofdbeheerder kan rotaten zonder deploy.
//
// ─── FLOW ────────────────────────────────────────────────────
//
// 1. Lees token uit URL-params.
// 2. Haal settings op (één fetch voor code + sessieduur).
// 3. Als de code in Directus leeg is → 503, log warning.
// 4. Bepaal autorisatie:
//    a. Body bevat organizerCode → verifyOrganizerCode tegen Directus.
//       (Backwards-compat met oude pagina-versies die nog code in body sturen.)
//    b. OF cookie aanwezig én geldig → verifyOrganizerSession tegen Directus.
//    Geen → 401 met require_code hint.
// 5. Lookup registratie. Niet gevonden / education → 404.
// 6. Al ingecheckt → 200 met status "already_checked_in".
// 7. Anders → markCheckedIn → 200 met status "checked_in".
//
// Cookie wordt alleen ververst bij CODE-input (expliciete heridentificatie),
// niet bij cookie-only check-ins. Zo blijft de TTL hard en kan een
// onbeheerd apparaat niet eindeloos blijven autoriseren.

import { NextResponse }    from "next/server";
import { cookies }         from "next/headers";
import { getSiteSettings } from "@/lib/directus";
import {
  ORGANIZER_COOKIE_NAME,
  ORGANIZER_COOKIE_PATH,
  getOrganizerCodeFromSettings,
  getRegistrationByCheckInToken,
  markCheckedIn,
  resolveSessionDurationMs,
  signOrganizerSession,
  verifyOrganizerCode,
  verifyOrganizerSession,
} from "@/lib/server/checkIn";

interface PostBody {
  organizerCode?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } },
): Promise<NextResponse> {
  const token = (params?.token || "").trim();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Geen check-in token opgegeven." },
      { status: 400 },
    );
  }

  // ─── Settings + config-check ─────────────────────────────
  const settings = await getSiteSettings();
  const expected = getOrganizerCodeFromSettings(settings);

  if (!expected) {
    console.warn(
      "[check-in] site_settings.check_in_organizer_code ontbreekt of is leeg " +
      "— check-in API kan niemand autoriseren. Stel de waarde in via " +
      "Directus → Site Settings.",
    );
    return NextResponse.json(
      {
        ok:    false,
        error: "Check-in is op dit moment niet beschikbaar. Neem contact op met de organisatie.",
      },
      { status: 503 },
    );
  }

  // ─── Body parsen (optioneel — leeg = cookie-only) ────────
  let body: PostBody = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text) as PostBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Ongeldige aanvraag." },
      { status: 400 },
    );
  }
  const rawOrganizerCode =
    typeof body.organizerCode === "string" ? body.organizerCode : "";

  // ─── Autorisatie ─────────────────────────────────────────
  // Voorrang: code in body. Als die meegestuurd wordt MOET hij kloppen
  // (geen stille cookie-fallback — dat zou een aanvaller met geldige
  // cookie + foute code laten doorgaan).
  //
  // Geen code in body → cookie-pad.

  let authorizedViaCode = false;

  if (rawOrganizerCode) {
    if (!verifyOrganizerCode(rawOrganizerCode, expected)) {
      return NextResponse.json(
        { ok: false, error: "Organisatorcode is onjuist." },
        { status: 401 },
      );
    }
    authorizedViaCode = true;
  } else {
    const sessionCookie = cookies().get(ORGANIZER_COOKIE_NAME)?.value;
    if (!verifyOrganizerSession(sessionCookie, expected)) {
      return NextResponse.json(
        {
          ok:    false,
          error: "Organisatorcode vereist.",
          require_code: true,
        },
        { status: 401 },
      );
    }
  }

  // ─── Registratie ophalen ─────────────────────────────────
  const reg = await getRegistrationByCheckInToken(token);
  if (!reg) {
    return NextResponse.json(
      { ok: false, error: "Ongeldige check-in link. Deze inschrijving bestaat niet of is geen activiteit." },
      { status: 404 },
    );
  }

  const sessionTtlMs = resolveSessionDurationMs(settings);

  // ─── Al ingecheckt? ──────────────────────────────────────
  if (reg.checked_in_at) {
    return jsonWithMaybeFreshCookie(
      {
        ok:               true,
        status:           "already_checked_in",
        checked_in_at:    reg.checked_in_at,
        checked_in_by:    reg.checked_in_by ?? null,
        checked_in_note:  reg.checked_in_note ?? null,
      },
      authorizedViaCode,
      expected,
      sessionTtlMs,
      200,
    );
  }

  // ─── Check-in uitvoeren ──────────────────────────────────
  try {
    const patch = await markCheckedIn(reg.id as string | number);
    return jsonWithMaybeFreshCookie(
      {
        ok:              true,
        status:          "checked_in",
        checked_in_at:   patch.checked_in_at,
        checked_in_by:   patch.checked_in_by,
        checked_in_note: patch.checked_in_note,
      },
      authorizedViaCode,
      expected,
      sessionTtlMs,
      200,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[check-in] markCheckedIn mislukt voor registratie ${reg.id}: ${msg}`);
    return NextResponse.json(
      { ok: false, error: "Check-in kon niet worden opgeslagen. Probeer het opnieuw." },
      { status: 500 },
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────

function jsonWithMaybeFreshCookie(
  payload:        Record<string, unknown>,
  setCookie:      boolean,
  codeForSecret:  string,
  sessionTtlMs:   number,
  status:         number,
): NextResponse {
  const res = NextResponse.json(payload, { status });
  if (setCookie) {
    const expiresAtMs = Date.now() + sessionTtlMs;
    const signed      = signOrganizerSession(expiresAtMs, codeForSecret);
    if (signed) {
      res.cookies.set({
        name:     ORGANIZER_COOKIE_NAME,
        value:    signed,
        httpOnly: true,
        secure:   process.env.NODE_ENV === "production",
        sameSite: "lax",
        path:     ORGANIZER_COOKIE_PATH,
        maxAge:   Math.floor(sessionTtlMs / 1000),
      });
    }
  }
  return res;
}
