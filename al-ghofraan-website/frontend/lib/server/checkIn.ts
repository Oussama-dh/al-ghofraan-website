// lib/server/checkIn.ts
//
// Server-side helpers voor de QR check-in flow. Alleen importeren
// vanuit server-components en route handlers — NIET vanuit client.
//
// ─── Wijziging in delivery QR-Organizer ──────────────────────
//
// De organisator-code komt niet meer uit env (CHECK_IN_ORGANIZER_CODE)
// maar uit Directus site_settings.check_in_organizer_code. Voordeel:
// hoofdbeheerder kan rotaten zonder deploy.
//
// De verify-functies zijn nu PUUR (geen IO):
//   - verifyOrganizerCode(input, expected)
//   - signOrganizerSession(expiresAtMs, codeForSecret)
//   - verifyOrganizerSession(cookieValue, codeForSecret)
//
// Callers (page.tsx en de twee API-routes) halen de code zelf op
// uit settings en geven hem mee. Eén centrale fetch per request
// houdt de hot paths efficiënt en deze helpers makkelijk testbaar.
//
// ─── Cookie-secret strategie (ongewijzigd t.o.v. vorige delivery) ─
//
// Cookie-secret = HMAC-SHA256(salt, code). Bij rotatie van de code
// invalideren alle bestaande cookies automatisch. Gewenst gedrag.
//
// ─── Cookie-path (gewijzigd) ─────────────────────────────────
//
// Was: /api/check-in (alleen API-routes zagen de cookie).
// Nu:  /check-in (zowel /check-in/* page-routes ALS /api/check-in/*).
// Reden: server-components op /check-in/[token] en
// /check-in/organizer moeten de cookie kunnen lezen om de UI
// correct te conditioneren. Pad blijft scope-beperkt — andere
// site-routes zien de cookie nog steeds niet.

import { createHmac, timingSafeEqual } from "node:crypto";
import { readItems, updateItem }       from "@directus/sdk";
import { directusServer }              from "@/lib/directus";
import type { Registration, SiteSettings } from "@/types/directus";

// ─── Constants ───────────────────────────────────────────────

export const ORGANIZER_COOKIE_NAME    = "ag_organizer_session";
/** Verbreed t.o.v. vorige delivery zodat ook /check-in/* pages de cookie zien. */
export const ORGANIZER_COOKIE_PATH    = "/check-in";
export const DEFAULT_SESSION_HOURS    = 4;
/** Veiligheidsgrens — geen sessies langer dan 7 dagen, ook al staat dat in Directus. */
const MAX_SESSION_HOURS               = 24 * 7;

// Vast salt — bewust hardcoded. Cookie-secret = HMAC(salt, code).
// Mocht klant ooit alle bestaande sessies willen invalideren zonder
// de code te wijzigen, dan kan dit salt hier bijgewerkt worden.
const COOKIE_SECRET_SALT = "ag-checkin-cookie-v1";

// ─── Settings-gebaseerde helpers ─────────────────────────────

/**
 * Haal de geconfigureerde organisator-code uit de gegeven settings.
 * Trimt whitespace. Lege string = feature niet geconfigureerd.
 *
 * Caller is verantwoordelijk voor het ophalen van settings via
 * getSiteSettings() en moet zelf een null-check / lege-check doen.
 */
export function getOrganizerCodeFromSettings(
  settings: SiteSettings | null,
): string {
  if (!settings) return "";
  return (settings.check_in_organizer_code || "").trim();
}

/**
 * Bepaal de sessieduur in milliseconds op basis van Directus settings.
 * Fallback DEFAULT_SESSION_HOURS bij leeg/ongeldig/te-groot.
 *
 * Begrenzing via MAX_SESSION_HOURS voorkomt dat een per ongeluk
 * ingevoerde "1000" een vrijwel-eeuwige sessie maakt.
 */
export function resolveSessionDurationMs(
  settings: SiteSettings | null,
): number {
  const raw = settings?.check_in_session_duration_hours;
  const hours =
    typeof raw === "number" && Number.isFinite(raw) && raw > 0
      ? Math.min(raw, MAX_SESSION_HOURS)
      : DEFAULT_SESSION_HOURS;
  return hours * 60 * 60 * 1000;
}

// ─── 1. DATA — Directus lookup + mutate ──────────────────────

/**
 * Zoek een activity-registratie op via check_in_token.
 *
 * Filter eist expliciet:
 *   - type = "activity"     (education-rijen mogen NOOIT matchen)
 *   - check_in_token = token (lookup-key)
 *
 * Retourneert null bij niet-gevonden, ongeldig token, of Directus-fout.
 * Caller toont dan een nette "ongeldige link" melding.
 */
export async function getRegistrationByCheckInToken(
  token: string,
): Promise<Registration | null> {
  if (!token || typeof token !== "string" || token.length < 8) return null;

  try {
    const result = await directusServer.request(
      readItems("registrations", {
        filter: {
          type:           { _eq: "activity" },
          check_in_token: { _eq: token },
        } as never,
        fields: [
          "id",
          "type",
          "source_title",
          "name",
          "status",
          "check_in_token",
          "checked_in_at",
          "checked_in_by",
          "checked_in_note",
        ],
        limit: 1,
      }),
    );
    const rows = result as Registration[];
    return rows.length > 0 ? rows[0] : null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[checkIn] lookup mislukt voor token: ${msg}`);
    return null;
  }
}

/**
 * Markeer een registratie als ingecheckt.
 * Caller MOET zelf eerst hebben gecontroleerd dat checked_in_at leeg
 * is — deze functie doet die check niet (zou een extra read kosten;
 * caller heeft de registratie net binnengehaald).
 *
 * Throws bij Directus-fouten — caller in API-route mapt naar 500.
 */
export async function markCheckedIn(registrationId: string | number): Promise<{
  checked_in_at: string;
  checked_in_by: string;
  checked_in_note: string;
}> {
  const now = new Date().toISOString();
  const patch = {
    checked_in_at:   now,
    checked_in_by:   "organizer",
    checked_in_note: "Checked in via QR code",
  };
  await directusServer.request(
    updateItem("registrations", registrationId, patch as never),
  );
  return patch;
}

// ─── 2. AUTH — Code-verify (puur) ────────────────────────────

/**
 * Constant-time vergelijking van een door gebruiker ingevoerde code
 * met de verwachte code uit Directus.
 *
 * Retourneert false bij:
 *   - lege expected (feature niet geconfigureerd)
 *   - lege/non-string input
 *   - lengte-verschil (returnt voor de timingSafeEqual call, dat is OK:
 *     lengte-leakage van een geheime code is verwaarloosbaar versus
 *     het bouwen van een buffer-van-gelijke-lengte truc die zelf
 *     subtiele timing-leaks heeft).
 */
export function verifyOrganizerCode(
  input:    string | null | undefined,
  expected: string,
): boolean {
  if (!expected) return false;
  if (typeof input !== "string" || input.length === 0) return false;

  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Leid het cookie-signing secret af van de organisator-code.
 * Caller is verantwoordelijk voor het opvragen van die code uit
 * Directus en doorgeven hier.
 */
function deriveCookieSecret(code: string): string {
  if (!code) return "";
  return createHmac("sha256", COOKIE_SECRET_SALT).update(code).digest("hex");
}

/**
 * Onderteken een sessie. Format: `{expiresAtMs}.{hexSignature}`
 *
 * Retourneert lege string als de code leeg is (geen secret =
 * geen cookie = caller moet een nette foutmelding tonen).
 */
export function signOrganizerSession(
  expiresAtMs:   number,
  codeForSecret: string,
): string {
  const secret = deriveCookieSecret(codeForSecret);
  if (!secret) return "";
  const payload = String(expiresAtMs);
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

/**
 * Verifieer een cookie-waarde tegen de huidige Directus-code.
 * Retourneert true mits:
 *   - cookie-formaat is `{expiresAtMs}.{signature}`
 *   - expiresAtMs > Date.now()
 *   - signature klopt (constant-time check tegen secret afgeleid
 *     van de huidige code)
 *
 * Door het secret van de huidige Directus-code af te leiden:
 * een code-rotatie invalideert alle bestaande cookies automatisch.
 *
 * Logt niets — een verlopen of geforgde cookie is geen security
 * event, gewoon "vraag opnieuw om de code".
 */
export function verifyOrganizerSession(
  cookieValue:   string | null | undefined,
  codeForSecret: string,
): boolean {
  if (typeof cookieValue !== "string") return false;
  const parts = cookieValue.split(".");
  if (parts.length !== 2) return false;
  const [payload, providedSig] = parts;
  if (!payload || !providedSig) return false;

  const expiresAtMs = Number(payload);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) return false;

  const secret = deriveCookieSecret(codeForSecret);
  if (!secret) return false;

  const expectedSig = createHmac("sha256", secret).update(payload).digest("hex");

  const a = Buffer.from(providedSig, "hex");
  const b = Buffer.from(expectedSig, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
