// lib/server/registrationClose.ts
//
// Delivery 58 — pure functie die bepaalt of het inschrijfformulier
// voor een activiteit gesloten is op een gegeven moment.
//
// Semantiek (samengevat):
//   - `registration_closes_at` gevuld + valide → sluit op dat moment
//   - leeg + niet-recurring → fallback naar `start_date`
//   - leeg + recurring (is_recurring=true) → BLIJFT open
//     (recurring heeft geen één globale sluit-datum; beheerder kan
//     expliciet `registration_closes_at` zetten als nodig)
//   - ongeldige datums → fail-open (formulier blijft zichtbaar);
//     beter te tonen dan onbedoeld te vergrendelen
//
// Geen IO, geen logging. Server- én client-veilig (we plaatsen
// in lib/server/ omdat het bij de check-in/registration-flow hoort).

import type { Activity } from "@/types/directus";

export interface RegistrationCloseContext {
  /** Sluit-moment (Date) als de activiteit beperkt is, anders null. */
  closesAt: Date | null;
  /** Bron van de sluit-moment: explicit veld of fallback. */
  source: "explicit" | "fallback_start_date" | "none";
}

/**
 * Bepaal het sluit-moment voor inschrijving van een activiteit, of
 * `null` als er geen sluit-moment is (formulier blijft open).
 *
 * Geeft ook de bron terug zodat UI-componenten kunnen aangeven
 * waarom het formulier sluit (bv. "sluit bij start activiteit").
 */
export function resolveRegistrationClose(
  activity: Pick<Activity, "registration_closes_at" | "start_date" | "is_recurring">,
): RegistrationCloseContext {
  // 1. Expliciet `registration_closes_at` heeft voorrang
  const explicit = parseDateSafely(activity.registration_closes_at);
  if (explicit) {
    return { closesAt: explicit, source: "explicit" };
  }

  // 2. Recurring zonder expliciet veld → géén fallback
  if (activity.is_recurring === true) {
    return { closesAt: null, source: "none" };
  }

  // 3. Niet-recurring + leeg → fallback naar start_date
  const start = parseDateSafely(activity.start_date);
  if (start) {
    return { closesAt: start, source: "fallback_start_date" };
  }

  // 4. Ongeldig/ontbrekend → geen sluit-moment (fail-open)
  return { closesAt: null, source: "none" };
}

/**
 * Snelle boolean check: is het inschrijfformulier nu gesloten?
 * Wraps `resolveRegistrationClose` voor de meest gebruikte gate.
 */
export function isRegistrationClosed(
  activity: Pick<Activity, "registration_closes_at" | "start_date" | "is_recurring">,
  now: Date = new Date(),
): boolean {
  const ctx = resolveRegistrationClose(activity);
  if (!ctx.closesAt) return false;
  return now.getTime() >= ctx.closesAt.getTime();
}

function parseDateSafely(value: string | null | undefined): Date | null {
  if (!value || typeof value !== "string") return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Date(ms);
}
