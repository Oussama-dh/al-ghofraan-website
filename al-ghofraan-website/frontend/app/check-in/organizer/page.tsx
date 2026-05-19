// app/check-in/organizer/page.tsx
//
// Pagina waarmee de organisator een apparaat autoriseert voor de
// check-in flow.
//
// Drie wegen tot autorisatie:
//
//   1. Reeds-actieve cookie  → toon "al geautoriseerd" banner.
//   2. Query-param ?code=... → redirect naar Route Handler
//                              /api/check-in/organizer/activate?code=...
//                              die de cookie zet en hier terugkomt
//                              met ?activated=1 of ?error=...
//                              (cookies().set() mag niet in een
//                              Server Component — vandaar de detour.)
//   3. Handmatig formulier   → client component <OrganizerAuthForm>
//                              doet POST /api/check-in/organizer.
//
// Query-state semantiek:
//   ?activated=1                → groene succesmelding (en cookie staat
//                                 al, dus we vallen daarna in tak 1).
//   ?error=invalid_code         → rode "code is onjuist".
//   ?error=not_configured       → rode "code niet geconfigureerd in
//                                 Directus".

import type { Metadata }   from "next";
import { cookies }         from "next/headers";
import { redirect }        from "next/navigation";
import Container           from "@/components/ui/Container";
import { getSiteSettings } from "@/lib/directus";
import {
  ORGANIZER_COOKIE_NAME,
  getOrganizerCodeFromSettings,
  resolveSessionDurationMs,
  verifyOrganizerSession,
} from "@/lib/server/checkIn";
import OrganizerAuthForm   from "./OrganizerAuthForm";

export const dynamic    = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  title: "Organisator activeren — check-in",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: {
    code?:      string | string[];
    error?:     string;
    activated?: string;
  };
}

export default async function OrganizerAuthPage({ searchParams }: PageProps) {
  // ─── 1. Query-param ?code=... afhandelen via redirect ────
  // Mag NIET zelf cookies zetten — daar is de Route Handler voor.
  // We doen alleen een redirect; de handler doet de rest.
  const rawQueryCode = searchParams.code;
  const queryCode    = Array.isArray(rawQueryCode) ? rawQueryCode[0] : rawQueryCode;
  if (typeof queryCode === "string" && queryCode.length > 0) {
    redirect(
      `/api/check-in/organizer/activate?code=${encodeURIComponent(queryCode)}`,
    );
  }

  // ─── 2. Settings + status-flags ──────────────────────────
  const settings = await getSiteSettings();
  const expected = getOrganizerCodeFromSettings(settings);

  // not_configured kan twee bronnen hebben:
  //   - klant heeft via Route Handler hierop gebounced met error,
  //   - settings is letterlijk leeg op deze fresh load.
  // Beide presentereren we hetzelfde.
  const errorFlag = searchParams.error;
  const isNotConfiguredByFlag = errorFlag === "not_configured";
  const isNotConfigured       = isNotConfiguredByFlag || !expected;

  if (isNotConfigured) {
    return (
      <main className="min-h-[70vh] bg-sand-50 py-12 lg:py-16">
        <Container>
          <div className="max-w-md mx-auto bg-white rounded-2xl border border-sand-200 p-8 shadow-sm">
            <h1 className="font-display text-2xl text-ink mb-3">
              Organisator activeren
            </h1>
            <p className="font-body text-sm text-taupe-dark leading-relaxed">
              Organisator-autorisatie is op dit moment niet beschikbaar.
              De hoofdbeheerder dient de code in te stellen via Directus
              → Site Settings → <em>check_in_organizer_code</em>.
            </p>
          </div>
        </Container>
      </main>
    );
  }

  // ─── 3. Reeds-actieve cookie? ────────────────────────────
  const cookieValue       = cookies().get(ORGANIZER_COOKIE_NAME)?.value;
  const alreadyAuthorized = verifyOrganizerSession(cookieValue, expected);
  const sessionHours      = Math.round(resolveSessionDurationMs(settings) / (60 * 60 * 1000));
  const justActivated     = searchParams.activated === "1";
  const invalidCode       = errorFlag === "invalid_code";

  return (
    <main className="min-h-[70vh] bg-sand-50 py-12 lg:py-16">
      <Container>
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-sand-200 p-6 lg:p-8 shadow-sm space-y-5">
          <header>
            <h1 className="font-display text-2xl text-ink">
              Organisator activeren
            </h1>
            <p className="font-body text-sm text-taupe-dark mt-1">
              {alreadyAuthorized || justActivated
                ? "Dit apparaat is geautoriseerd voor check-in."
                : "Voer de organisatorcode in om dit apparaat te autoriseren voor check-in."}
            </p>
          </header>

          {alreadyAuthorized || justActivated ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-body text-sm text-green-900">
              <p className="font-medium">
                ✓ Dit apparaat is {sessionHours} uur lang geautoriseerd.
              </p>
              <p className="text-xs mt-1 opacity-80">
                U kunt nu deelnemers inchecken via de QR-codes uit hun bevestigingsmail.
              </p>
            </div>
          ) : (
            <>
              {invalidCode && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 p-3 font-body text-sm text-red-800"
                >
                  Organisatorcode is onjuist.
                </p>
              )}
              <OrganizerAuthForm sessionHours={sessionHours} />
            </>
          )}
        </div>
      </Container>
    </main>
  );
}
