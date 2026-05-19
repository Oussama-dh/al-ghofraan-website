// app/api/check-in/organizer/route.ts
//
// POST endpoint waarmee de organisator zich op een apparaat
// autoriseert voor de check-in flow.
//
// Onafhankelijk van /api/check-in/[token]:
//   - Doet GEEN mutatie op een registratie.
//   - Doet alleen code-verify + cookie set.
//
// Body: { code: "..." }
// 200 → cookie gezet, response toont de gekozen sessieduur in uren.
// 401 → code fout (of leeg).
// 503 → Directus check_in_organizer_code is leeg / niet geconfigureerd.

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

interface PostBody {
  code?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  const settings = await getSiteSettings();
  const expected = getOrganizerCodeFromSettings(settings);

  if (!expected) {
    console.warn(
      "[check-in:organizer] site_settings.check_in_organizer_code ontbreekt " +
      "of is leeg — organisator-autorisatie is uitgeschakeld.",
    );
    return NextResponse.json(
      {
        ok:    false,
        error: "Organisator-autorisatie is op dit moment niet beschikbaar. " +
               "Stel check_in_organizer_code in via Directus → Site Settings.",
      },
      { status: 503 },
    );
  }

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

  const code = typeof body.code === "string" ? body.code : "";
  if (!verifyOrganizerCode(code, expected)) {
    return NextResponse.json(
      { ok: false, error: "Organisatorcode is onjuist." },
      { status: 401 },
    );
  }

  // ─── Cookie zetten ───────────────────────────────────────
  const sessionTtlMs = resolveSessionDurationMs(settings);
  const expiresAtMs  = Date.now() + sessionTtlMs;
  const signed       = signOrganizerSession(expiresAtMs, expected);

  if (!signed) {
    // In de praktijk niet bereikbaar (we hebben expected al gevalideerd),
    // maar typesafe terugvallen.
    return NextResponse.json(
      { ok: false, error: "Sessie kon niet worden aangemaakt." },
      { status: 500 },
    );
  }

  const res = NextResponse.json({
    ok:               true,
    status:           "authorized",
    duration_hours:   Math.round(sessionTtlMs / (60 * 60 * 1000)),
    expires_at:       new Date(expiresAtMs).toISOString(),
  });
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
