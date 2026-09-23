// lib/adultRegistration.ts
//
// Inschrijving volwassenenonderwijs (education_programs.audience = "adults"):
// voornaam, achternaam, telefoon, e-mail, leeftijd + toestemming.
//
// Zelfde principe als lib/quranRegistration.ts: geen server- of
// browser-afhankelijkheden, gebruikt door formulier én API-route, en de
// server is de autoriteit. Telefoon- en e-mailcontrole komen uit de
// Hifdh-module zodat beide formulieren dezelfde regels hanteren.

import {
  LIMITS,
  PHONE_ERROR,
  ageRangeText,
  isValidEmail,
  normalizePhone,
  type AgeLimits,
  type FieldErrors,
} from "@/lib/quranRegistration";

export const ADULT_AGE_MIN = 12;
export const ADULT_AGE_MAX = 120;

export const ADULT_CONSENT_TEXT =
  "Ik verklaar dat bovenstaande gegevens naar waarheid zijn ingevuld en geef toestemming om deze gegevens te gebruiken voor de inschrijving en begeleiding binnen het onderwijs van al-Ghofraan.";

export interface AdultRegistrationData {
  first_name: string;
  last_name:  string;
  phone:      string;
  email:      string;
  age:        number;
}

export type AdultValidationResult =
  | { ok: true;  data: AdultRegistrationData }
  | { ok: false; errors: FieldErrors };

function cleanLine(v: unknown): string {
  return (typeof v === "string" ? v : "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanLimit(v: unknown): number | null {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
}

/** Leeftijd als heel getal (number of cijfer-string); null bij ongeldige invoer. */
function parseAge(v: unknown): number | null {
  if (typeof v === "number") return Number.isInteger(v) ? v : null;
  if (typeof v === "string" && /^\d{1,3}$/.test(v.trim())) return Number(v.trim());
  return null;
}

export function validateAdultRegistration(raw: unknown, limits?: AgeLimits | null): AdultValidationResult {
  const r = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const errors: FieldErrors = {};

  const first = cleanLine(r.first_name);
  if (!first) errors.first_name = "Vul uw voornaam in.";
  else if (first.length < LIMITS.nameMin || first.length > LIMITS.nameMax)
    errors.first_name = `Uw voornaam moet tussen ${LIMITS.nameMin} en ${LIMITS.nameMax} tekens lang zijn.`;

  const last = cleanLine(r.last_name);
  if (!last) errors.last_name = "Vul uw achternaam in.";
  else if (last.length < LIMITS.nameMin || last.length > LIMITS.nameMax)
    errors.last_name = `Uw achternaam moet tussen ${LIMITS.nameMin} en ${LIMITS.nameMax} tekens lang zijn.`;

  const phoneRaw = cleanLine(r.phone);
  let phone = "";
  if (!phoneRaw) errors.phone = "Vul uw telefoonnummer in.";
  else {
    const p = normalizePhone(phoneRaw);
    if (!p) errors.phone = PHONE_ERROR;
    else phone = p;
  }

  const email = cleanLine(r.email);
  if (!email) errors.email = "Vul uw e-mailadres in.";
  else if (!isValidEmail(email)) errors.email = "Vul een geldig e-mailadres in.";

  const ageRaw = typeof r.age === "string" ? r.age.trim() : r.age;
  const age = parseAge(ageRaw);
  if (ageRaw === "" || ageRaw === undefined || ageRaw === null) errors.age = "Vul uw leeftijd in.";
  else if (age === null || age < ADULT_AGE_MIN || age > ADULT_AGE_MAX)
    errors.age = "Vul een geldige leeftijd in (in hele jaren).";
  else {
    const min = cleanLimit(limits?.minAge);
    const max = cleanLimit(limits?.maxAge);
    if ((min !== null && age < min) || (max !== null && age > max))
      errors.age = `Inschrijven kan voor deelnemers van ${ageRangeText(limits)}.`;
  }

  if (r.consent !== true)
    errors.consent = "U moet de verklaring en toestemming bevestigen om de inschrijving te kunnen versturen.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { first_name: first, last_name: last, phone, email, age: age! } };
}
