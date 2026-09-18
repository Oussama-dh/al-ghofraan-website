// lib/quranRegistration.ts
//
// Koranonderwijs-inschrijving — gedeelde constanten, types en validatie.
//
// Deze module heeft GEEN server- of browser-afhankelijkheden en wordt
// door zowel het formulier (client) als de API-route (server) gebruikt.
// De server is altijd de autoriteit: de client gebruikt dezelfde
// validator alleen voor snelle feedback. Alles wat binnenkomt wordt
// als onvertrouwd behandeld (typeof-checks, allowlists, lengtegrenzen).
//
// Definitieve betalingsopties, niveauschaal en veldnamen: zie de
// constanten hieronder. Keuzelijsten moeten synchroon blijven met
// scripts/seed/steps/60-quran-registrations.mjs.

// ─── Keuzelijsten ────────────────────────────────────────────

export interface Option<V extends string = string> {
  value: V;
  label: string;
}

/** Zelfde waarden als de rest van de app (`Gender` in types/directus.ts). */
export const CHILD_GENDER_OPTIONS = [
  { value: "male",   label: "Jongen" },
  { value: "female", label: "Meisje" },
] as const satisfies readonly Option[];

export const INVOLVED_GUARDIANS_OPTIONS = [
  { value: "both",  label: "Beide ouders/verzorgers" },
  { value: "one",   label: "Eén ouder/verzorger" },
  { value: "other", label: "Anders" },
] as const satisfies readonly Option[];

export const RELATION_OPTIONS = [
  { value: "father",   label: "Vader" },
  { value: "mother",   label: "Moeder" },
  { value: "guardian", label: "Verzorger" },
  { value: "other",    label: "Anders" },
] as const satisfies readonly Option[];

export const PAYMENT_FREQUENCY_OPTIONS = [
  { value: "monthly",    label: "Maandelijks" },
  { value: "quarterly",  label: "Per kwartaal – iedere 3 maanden" },
  { value: "semiannual", label: "Per halfjaar – iedere 6 maanden" },
  { value: "yearly",     label: "Jaarlijks" },
] as const satisfies readonly Option[];

/** Uitleg bij de niveauschaal 1 t/m 10 (lezen én schrijven). */
export const LEVEL_EXPLANATION = "1–4: zwak · 5: voldoende · 6–10: goed";

/** Toelichting die verschijnt zodra bij bijzonderheden "Ja" is gekozen. */
export const SPECIAL_CONSIDERATIONS_HINT =
  "Denk bijvoorbeeld aan leerbehoeften, gedrag, allergieën of andere zaken die belangrijk zijn voor de begeleiding van uw kind.";

/** Exacte toestemmingstekst bij de verplichte checkbox. */
export const CONSENT_TEXT =
  "Ik verklaar dat bovenstaande gegevens naar waarheid zijn ingevuld en geef toestemming om deze gegevens te gebruiken voor de inschrijving en begeleiding binnen het onderwijs van Al-Ghofraan.";

export const LEVEL_MIN = 1;
export const LEVEL_MAX = 10;
export const LEVELS: readonly number[] = Array.from(
  { length: LEVEL_MAX - LEVEL_MIN + 1 },
  (_, i) => LEVEL_MIN + i,
);

export type ChildGender        = (typeof CHILD_GENDER_OPTIONS)[number]["value"];
export type InvolvedGuardians  = (typeof INVOLVED_GUARDIANS_OPTIONS)[number]["value"];
export type Relation           = (typeof RELATION_OPTIONS)[number]["value"];
export type PaymentFrequency   = (typeof PAYMENT_FREQUENCY_OPTIONS)[number]["value"];

export function labelFor(
  options: readonly Option[],
  value: string | null | undefined,
): string {
  return options.find((o) => o.value === value)?.label ?? (value || "");
}

// ─── Lengtegrenzen ───────────────────────────────────────────

export const LIMITS = {
  nameMin:  2,
  nameMax:  100,
  otherMin: 2,
  otherMax: 100,
  emailMax: 254,
  notesMax: 1000,
  /** Toelichting bij lees-/schrijfniveau. */
  levelNotesMax: 1000,
  /** Aanvullende opmerkingen aan het eind. */
  additionalNotesMax: 2000,
  /** Maximumleeftijd van het kind (jaren) — vangt typfouten in het jaartal op. */
  maxChildAgeYears: 25,
} as const;

// ─── Payload (wat de client verstuurt) ───────────────────────
// Alle waarden zijn `unknown` bij binnenkomst; het formulier stuurt
// strings en booleans. Sleutels komen 1-op-1 overeen met de Directus-
// velden, behalve `consent` (→ consent_given) en `website` (honeypot).

export type QuranRegistrationRaw = Record<string, unknown>;

export interface QuranRegistrationData {
  child_first_name:  string;
  child_last_name:   string;
  child_birth_date:  string; // YYYY-MM-DD
  child_gender:      ChildGender;

  involved_guardians:       InvolvedGuardians;
  involved_guardians_other: string | null;

  contact_1_name:           string;
  contact_1_relation:       Relation;
  contact_1_relation_other: string | null;
  contact_1_phone:          string;
  contact_1_email:          string;

  /** true = er is geen tweede contactpersoon (checkbox aangevinkt of niets ingevuld). */
  secondary_contact_absent:         boolean;
  secondary_contact_name:           string | null;
  secondary_contact_relation:       Relation | null;
  secondary_contact_relation_other: string | null;
  secondary_contact_phone:          string | null;
  secondary_contact_email:          string | null;

  reading_level: number;
  reading_notes: string | null;
  writing_level: number;
  writing_notes: string | null;

  /** true = er zijn bijzonderheden waar tijdens de lessen rekening mee moet worden gehouden. */
  special_considerations:       boolean;
  special_considerations_notes: string | null;

  payment_frequency: PaymentFrequency;

  additional_notes: string | null;

  consent_given: true;
}

export type FieldErrors = Record<string, string>;

export type ValidationResult =
  | { ok: true;  data: QuranRegistrationData }
  | { ok: false; errors: FieldErrors };

// ─── Kleine helpers ──────────────────────────────────────────

/** Alleen echte strings; alles anders (object, array, number, null) wordt "". */
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Trim, verwijder controletekens, normaliseer witruimte (behalve newlines in vrije tekst). */
function cleanLine(v: unknown): string {
  return str(v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMultiline(v: unknown): string {
  return str(v)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function oneOf<T extends string>(
  options: readonly Option<T>[],
  value: unknown,
): T | null {
  const s = str(value);
  const hit = options.find((o) => o.value === s);
  return hit ? hit.value : null;
}

/** Optionele vrije tekst: leeg → null, te lang → fout op `key`. */
function optionalNotes(v: unknown, max: number, key: string, errors: FieldErrors): string | null {
  const t = cleanMultiline(v);
  if (!t) return null;
  if (t.length > max) {
    errors[key] = `De tekst is te lang (maximaal ${max} tekens).`;
    return null;
  }
  return t;
}

// ─── E-mail ──────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(input: string): boolean {
  const s = input.trim();
  return s.length <= LIMITS.emailMax && EMAIL_RE.test(s);
}

// ─── Telefoon ────────────────────────────────────────────────

/**
 * Valideert en normaliseert een telefoonnummer.
 *
 * Toegestaan:
 *   - Nederlands nationaal: 0 + 9 cijfers, met spaties/streepjes/haakjes
 *       "0612345678", "06 12345678", "06-12 34 56 78", "010 1234567"
 *     → genormaliseerd naar "0612345678" (10 cijfers).
 *   - Internationaal: "+" of "00" + landcode + nummer (totaal 8–15 cijfers,
 *     E.164-lengte), met spaties/streepjes/punten/haakjes.
 *       "+31612345678", "+31 6 12345678", "0031 6 12345678", "+32 470 12 34 56"
 *     → genormaliseerd naar "+31612345678". Het overbodige trunk-nulletje
 *       "+31 (0)6 …" wordt verwijderd.
 *
 * Retourneert null bij ongeldige invoer. Bewust niet restrictiever dan
 * E.164-lengte: we kennen niet alle landformaten en willen geen geldig
 * buitenlands nummer weigeren.
 */
export function normalizePhone(input: string): string | null {
  const s = input.trim();
  if (!s || s.length > 30) return null;

  // Alleen cijfers, spaties, + ( ) - . /
  if (!/^[+\d\s().\-/]+$/.test(s)) return null;
  // "+" alleen vooraan toegestaan
  if (s.lastIndexOf("+") > 0) return null;

  const hasPlus = s.startsWith("+");
  let digits = s.replace(/\D/g, "");

  if (hasPlus || digits.startsWith("00")) {
    if (!hasPlus) digits = digits.slice(2);
    if (digits.length < 8 || digits.length > 15) return null;
    if (digits.startsWith("0")) return null; // landcode begint nooit met 0
    // "+31 (0)6…": trunk-nul na de landcode weghalen
    if (digits.startsWith("310")) digits = "31" + digits.slice(3);
    if (digits.length < 8 || digits.length > 15) return null;
    return "+" + digits;
  }

  // Nationaal (Nederlands): 0 + 9 cijfers
  if (/^0\d{9}$/.test(digits)) return digits;
  return null;
}

export const PHONE_ERROR =
  "Vul een geldig telefoonnummer in, bijvoorbeeld 06 12345678 of +31 6 12345678.";

// ─── Geboortedatum ───────────────────────────────────────────

/** Parseert strikt YYYY-MM-DD als echte kalenderdatum. */
function parseIsoDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== mo - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null; // bv. 2019-02-31
  }
  return dt;
}

/** Vandaag als YYYY-MM-DD in Europe/Amsterdam (server draait in UTC). */
export function todayIsoAmsterdam(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts; // en-CA → YYYY-MM-DD
}

export function minBirthDateIso(now: Date = new Date()): string {
  const today = parseIsoDate(todayIsoAmsterdam(now))!;
  return `${today.getUTCFullYear() - LIMITS.maxChildAgeYears}-${String(
    today.getUTCMonth() + 1,
  ).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;
}

// ─── Niveau ──────────────────────────────────────────────────

/** Accepteert alleen hele getallen 1..10 (number of cijfer-string). */
function parseLevel(v: unknown): number | null {
  let n: number;
  if (typeof v === "number") n = v;
  else if (typeof v === "string" && /^\d{1,2}$/.test(v.trim())) n = Number(v.trim());
  else return null;
  return Number.isInteger(n) && n >= LEVEL_MIN && n <= LEVEL_MAX ? n : null;
}

// ─── Hoofdvalidatie ──────────────────────────────────────────

/**
 * Valideert de volledige inschrijving. Verzamelt ALLE fouten (per
 * veldnaam) zodat het formulier ze inline kan tonen. Bij ok:true is
 * `data` volledig genormaliseerd en bevat het alleen bekende velden —
 * onbekende sleutels in `raw` worden genegeerd.
 */
export function validateQuranRegistration(raw: unknown): ValidationResult {
  const r: QuranRegistrationRaw =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as QuranRegistrationRaw)
      : {};
  const errors: FieldErrors = {};

  // ── 1. Kind ────────────────────────────────────────────────
  const childFirst = cleanLine(r.child_first_name);
  if (!childFirst) errors.child_first_name = "Vul de voornaam van het kind in.";
  else if (childFirst.length < LIMITS.nameMin || childFirst.length > LIMITS.nameMax)
    errors.child_first_name = `De voornaam moet tussen ${LIMITS.nameMin} en ${LIMITS.nameMax} tekens lang zijn.`;

  const childLast = cleanLine(r.child_last_name);
  if (!childLast) errors.child_last_name = "Vul de achternaam van het kind in.";
  else if (childLast.length < LIMITS.nameMin || childLast.length > LIMITS.nameMax)
    errors.child_last_name = `De achternaam moet tussen ${LIMITS.nameMin} en ${LIMITS.nameMax} tekens lang zijn.`;

  const birthRaw = str(r.child_birth_date).trim();
  let birthDate = "";
  if (!birthRaw) {
    errors.child_birth_date = "Vul de geboortedatum van het kind in.";
  } else {
    const dt = parseIsoDate(birthRaw);
    if (!dt) {
      errors.child_birth_date = "Vul een geldige geboortedatum in.";
    } else if (birthRaw > todayIsoAmsterdam()) {
      errors.child_birth_date = "De geboortedatum mag niet in de toekomst liggen.";
    } else if (birthRaw < minBirthDateIso()) {
      errors.child_birth_date = "Controleer de geboortedatum; deze ligt te ver in het verleden.";
    } else {
      birthDate = birthRaw;
    }
  }

  const childGender = oneOf(CHILD_GENDER_OPTIONS, r.child_gender);
  if (!childGender) errors.child_gender = "Kies of het kind een jongen of een meisje is.";

  // ── 2. Betrokken ouders/verzorgers ─────────────────────────
  const involved = oneOf(INVOLVED_GUARDIANS_OPTIONS, r.involved_guardians);
  let involvedOther: string | null = null;
  if (!involved) {
    errors.involved_guardians =
      "Kies welke ouder(s) of verzorger(s) betrokken zijn bij de opvoeding en het onderwijs van het kind.";
  } else if (involved === "other") {
    const t = cleanLine(r.involved_guardians_other);
    if (!t) errors.involved_guardians_other = "Vul in wie er betrokken is.";
    else if (t.length < LIMITS.otherMin || t.length > LIMITS.otherMax)
      errors.involved_guardians_other = `Dit veld moet tussen ${LIMITS.otherMin} en ${LIMITS.otherMax} tekens lang zijn.`;
    else involvedOther = t;
  }
  // involved !== "other": eventuele toelichting wordt genegeerd en niet opgeslagen.

  // ── 3. Eerste contactpersoon (verplicht) ───────────────────
  const c1Name = cleanLine(r.contact_1_name);
  if (!c1Name) errors.contact_1_name = "Vul de naam van de eerste contactpersoon in.";
  else if (c1Name.length < LIMITS.nameMin || c1Name.length > LIMITS.nameMax)
    errors.contact_1_name = `De naam moet tussen ${LIMITS.nameMin} en ${LIMITS.nameMax} tekens lang zijn.`;

  const c1Relation = oneOf(RELATION_OPTIONS, r.contact_1_relation);
  let c1RelationOther: string | null = null;
  if (!c1Relation) {
    errors.contact_1_relation = "Kies de relatie van de eerste contactpersoon tot het kind.";
  } else if (c1Relation === "other") {
    const t = cleanLine(r.contact_1_relation_other);
    if (!t) errors.contact_1_relation_other = "Vul in wat de relatie tot het kind is.";
    else if (t.length < LIMITS.otherMin || t.length > LIMITS.otherMax)
      errors.contact_1_relation_other = `Dit veld moet tussen ${LIMITS.otherMin} en ${LIMITS.otherMax} tekens lang zijn.`;
    else c1RelationOther = t;
  }

  const c1PhoneRaw = cleanLine(r.contact_1_phone);
  let c1Phone = "";
  if (!c1PhoneRaw) errors.contact_1_phone = "Vul het telefoonnummer van de eerste contactpersoon in.";
  else {
    const p = normalizePhone(c1PhoneRaw);
    if (!p) errors.contact_1_phone = PHONE_ERROR;
    else c1Phone = p;
  }

  const c1Email = cleanLine(r.contact_1_email);
  if (!c1Email) errors.contact_1_email = "Vul het e-mailadres van de eerste contactpersoon in.";
  else if (!isValidEmail(c1Email)) errors.contact_1_email = "Vul een geldig e-mailadres in.";

  // ── 4. Tweede contactpersoon (optioneel) ───────────────────
  const noSecond = r.secondary_contact_absent === true;
  const c2NameRaw     = cleanLine(r.secondary_contact_name);
  const c2RelationRaw = str(r.secondary_contact_relation).trim();
  const c2OtherRaw    = cleanLine(r.secondary_contact_relation_other);
  const c2PhoneRaw    = cleanLine(r.secondary_contact_phone);
  const c2EmailRaw    = cleanLine(r.secondary_contact_email);

  // "Begonnen" = minstens één zichtbaar veld bevat iets. Verborgen lege
  // waarden (checkbox aan, of alles leeg) geven nooit fouten.
  const secondStarted =
    !noSecond &&
    Boolean(c2NameRaw || c2RelationRaw || c2OtherRaw || c2PhoneRaw || c2EmailRaw);

  let c2Name: string | null = null;
  let c2Relation: Relation | null = null;
  let c2RelationOther: string | null = null;
  let c2Phone: string | null = null;
  let c2Email: string | null = null;

  if (secondStarted) {
    if (!c2NameRaw) errors.secondary_contact_name = "Vul de naam van de tweede contactpersoon in.";
    else if (c2NameRaw.length < LIMITS.nameMin || c2NameRaw.length > LIMITS.nameMax)
      errors.secondary_contact_name = `De naam moet tussen ${LIMITS.nameMin} en ${LIMITS.nameMax} tekens lang zijn.`;
    else c2Name = c2NameRaw;

    c2Relation = oneOf(RELATION_OPTIONS, c2RelationRaw);
    if (!c2Relation) {
      errors.secondary_contact_relation = "Kies de relatie van de tweede contactpersoon tot het kind.";
    } else if (c2Relation === "other") {
      if (!c2OtherRaw) errors.secondary_contact_relation_other = "Vul in wat de relatie tot het kind is.";
      else if (c2OtherRaw.length < LIMITS.otherMin || c2OtherRaw.length > LIMITS.otherMax)
        errors.secondary_contact_relation_other = `Dit veld moet tussen ${LIMITS.otherMin} en ${LIMITS.otherMax} tekens lang zijn.`;
      else c2RelationOther = c2OtherRaw;
    }

    if (!c2PhoneRaw) errors.secondary_contact_phone = "Vul het telefoonnummer van de tweede contactpersoon in.";
    else {
      const p = normalizePhone(c2PhoneRaw);
      if (!p) errors.secondary_contact_phone = PHONE_ERROR;
      else c2Phone = p;
    }

    if (!c2EmailRaw) errors.secondary_contact_email = "Vul het e-mailadres van de tweede contactpersoon in.";
    else if (!isValidEmail(c2EmailRaw)) errors.secondary_contact_email = "Vul een geldig e-mailadres in.";
    else c2Email = c2EmailRaw;
  }

  // ── 5. Niveau Arabisch (lezen + schrijven, 1 t/m 10, verplicht) ──
  const reading = parseLevel(r.reading_level);
  if (reading === null)
    errors.reading_level = `Kies een leesniveau van ${LEVEL_MIN} tot en met ${LEVEL_MAX}.`;
  const writing = parseLevel(r.writing_level);
  if (writing === null)
    errors.writing_level = `Kies een schrijfniveau van ${LEVEL_MIN} tot en met ${LEVEL_MAX}.`;

  // Toelichtingen zijn optioneel: leeg = null.
  const readingNotes = optionalNotes(r.reading_notes, LIMITS.levelNotesMax, "reading_notes", errors);
  const writingNotes = optionalNotes(r.writing_notes, LIMITS.levelNotesMax, "writing_notes", errors);

  // ── 6. Bijzonderheden ──────────────────────────────────────
  // Strikt boolean: null/undefined = nog niet gekozen.
  let special: boolean | null = null;
  if (r.special_considerations === true) special = true;
  else if (r.special_considerations === false) special = false;

  let specialNotes: string | null = null;
  if (special === null) {
    errors.special_considerations =
      "Geef aan of er bijzonderheden zijn waar wij tijdens de lessen rekening mee moeten houden.";
  } else if (special) {
    const t = cleanMultiline(r.special_considerations_notes);
    if (!t) errors.special_considerations_notes = "Licht de bijzonderheden kort toe.";
    else if (t.length > LIMITS.notesMax)
      errors.special_considerations_notes = `De toelichting is te lang (maximaal ${LIMITS.notesMax} tekens).`;
    else specialNotes = t;
  }
  // special === false: eventuele toelichting wordt genegeerd en niet opgeslagen.

  // ── 7. Betaling en afronding ───────────────────────────────
  const payment = oneOf(PAYMENT_FREQUENCY_OPTIONS, r.payment_frequency);
  if (!payment) errors.payment_frequency = "Kies een betalingsperiode.";

  const additionalNotes = optionalNotes(r.additional_notes, LIMITS.additionalNotesMax, "additional_notes", errors);

  if (r.consent !== true)
    errors.consent = "U moet de verklaring en toestemming bevestigen om de inschrijving te kunnen versturen.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    data: {
      child_first_name:  childFirst,
      child_last_name:   childLast,
      child_birth_date:  birthDate,
      child_gender:      childGender!,

      involved_guardians:       involved!,
      involved_guardians_other: involvedOther,

      contact_1_name:           c1Name,
      contact_1_relation:       c1Relation!,
      contact_1_relation_other: c1RelationOther,
      contact_1_phone:          c1Phone,
      contact_1_email:          c1Email,

      secondary_contact_absent:         !secondStarted,
      secondary_contact_name:           c2Name,
      secondary_contact_relation:       c2Relation,
      secondary_contact_relation_other: c2RelationOther,
      secondary_contact_phone:          c2Phone,
      secondary_contact_email:          c2Email,

      reading_level: reading!,
      reading_notes: readingNotes,
      writing_level: writing!,
      writing_notes: writingNotes,

      special_considerations:       special!,
      special_considerations_notes: specialNotes,

      payment_frequency: payment!,

      additional_notes: additionalNotes,

      consent_given: true,
    },
  };
}
