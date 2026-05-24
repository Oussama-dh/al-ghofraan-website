// app/api/inschrijven/route.ts
//
// Algemene inschrijf-endpoint voor activiteiten en onderwijs.
// Schrijft naar de `registrations` collectie via Directus admin-token.
//
// TWEE INKOMENDE FORMATEN:
//
// 1. Activity (single student — bestaande flow, ongewijzigd):
//    {
//      type: "activity",
//      source_slug,
//      name, email, gender, phone?, age?, notes?, consent
//    }
//
// 2. Education (parent + multi-student — flow uit delivery 3, met toggles uit delivery 4):
//    {
//      type: "education",
//      source_slug,
//      parent: { name, email, phone },
//      students: [{ name, gender, age?, notes? }, ...],
//      consent, terms_accepted?
//    }
//
// Voor education-mode:
//   - Telefoon verplicht en exact 10 cijfers (server-side gevalideerd)
//   - Per student wordt één `registrations` record aangemaakt
//   - Alle records van één indiening krijgen dezelfde `registration_group_id`
//   - Elk record krijgt eigen `student_number` (JJ-MM-DD-XXXX)
//
// Programma-toggles (delivery 4) — opgehaald uit `education_programs`:
//   - require_terms_acceptance:
//       true  → `terms_accepted` MOET true zijn, anders 400
//       false → `terms_accepted` wordt genegeerd
//   - allow_multiple_students:
//       true  → max 20 studenten per indiening
//       false → max 1 student per indiening, anders 400
//
// Voor activity-mode:
//   - Single record (zoals voorheen)
//   - Phone optioneel; indien gevuld dan 10 cijfers
//   - Geen terms_accepted (alleen voor education)

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { directusServer, getSiteSettings } from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";
import { generateStudentNumbers } from "@/lib/studentNumber";
import {
  notifyActivityRegistration,
  notifyEducationRegistration,
  notifyActivityRegistrationVisitor,
  notifyEducationRegistrationVisitor,
} from "@/lib/server/notifications";
import { getSiteUrl } from "@/lib/utils";
import { generateActivityOccurrences } from "@/lib/recurrence";
import { isRegistrationClosed } from "@/lib/server/registrationClose";
import type {
  Activity,
  EducationProgram,
  Gender,
  RegistrationType,
  TargetGender,
} from "@/types/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Validatie-constanten ───────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_GENDERS: ReadonlySet<Gender> = new Set<Gender>(["male", "female"]);
const ALLOWED_TARGET_GENDERS: ReadonlySet<TargetGender> =
  new Set<TargetGender>(["male", "female", "mixed"]);

// ─── Phone helpers ──────────────────────────────────────────
function digitsOnly(input: unknown): string {
  return String(input ?? "").replace(/\D/g, "");
}

// ─── Body-typen ─────────────────────────────────────────────
interface ActivityBody {
  type:        "activity";
  source_slug: string;
  name:        string;
  email:       string;
  gender:      Gender;
  phone?:      string;
  age?:        number;
  notes?:      string;
  /**
   * Delivery recurring — gekozen occurrence (alleen voor terugkerende
   * activiteiten). Server valideert dat de waarden overeenkomen met een
   * gegenereerde occurrence (anti-spoofing).
   */
  occurrence_start?: string;
  occurrence_end?:   string;
  occurrence_label?: string;
}

interface EducationStudent {
  name:   string;
  gender: Gender;
  age?:   number;
  notes?: string;
}

interface EducationBody {
  type:           "education";
  source_slug:    string;
  parent: {
    name:  string;
    email: string;
    phone: string; // exact 10 cijfers
  };
  students:       EducationStudent[];
  /**
   * Voorwaarden-acceptatie. Of dit veld vereist is hangt af van het
   * specifieke programma (`require_terms_acceptance`). De parser
   * normaliseert hier alleen de waarde naar boolean | undefined; de
   * eindcontrole gebeurt na `findSource()` in de POST-handler.
   */
  terms_accepted: boolean | undefined;
}

type ParsedBody =
  | { ok: true; mode: "activity"; data: ActivityBody }
  | { ok: true; mode: "education"; data: EducationBody }
  | { ok: false; error: string };

// ─── Parser ─────────────────────────────────────────────────
function parseBody(raw: Record<string, unknown>): ParsedBody {
  const type = String(raw.type || "").trim();
  if (type !== "activity" && type !== "education") {
    return { ok: false, error: "Ongeldig type. Verwacht 'activity' of 'education'." };
  }

  const sourceSlug = String(raw.source_slug || "").trim();
  if (!sourceSlug) return { ok: false, error: "source_slug ontbreekt." };

  if (raw.consent !== true) {
    return { ok: false, error: "Akkoord met verwerking van uw gegevens is verplicht." };
  }

  if (type === "activity") {
    return parseActivity(raw, sourceSlug);
  }
  return parseEducation(raw, sourceSlug);
}

function parseActivity(raw: Record<string, unknown>, sourceSlug: string): ParsedBody {
  const name = String(raw.name || "").trim();
  if (name.length < 2 || name.length > 200) {
    return { ok: false, error: "Vul een geldige naam in." };
  }

  const email = String(raw.email || "").trim();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }

  const gender = String(raw.gender || "").trim();
  if (!gender) return { ok: false, error: "Geslacht is verplicht." };
  if (!ALLOWED_GENDERS.has(gender as Gender)) {
    return { ok: false, error: "Ongeldige waarde voor geslacht. Kies 'Man' of 'Vrouw'." };
  }

  const out: ActivityBody = {
    type:        "activity",
    source_slug: sourceSlug,
    name,
    email,
    gender:      gender as Gender,
  };

  // Telefoon optioneel — indien gevuld dan 10 cijfers
  if (raw.phone !== undefined && raw.phone !== null && String(raw.phone).trim()) {
    const phoneDigits = digitsOnly(raw.phone);
    if (phoneDigits.length !== 10) {
      return {
        ok: false,
        error: "Telefoonnummer moet uit precies 10 cijfers bestaan (of laat leeg).",
      };
    }
    out.phone = phoneDigits;
  }

  if (raw.age !== undefined && raw.age !== null && raw.age !== "") {
    const age = Number(raw.age);
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      return { ok: false, error: "Leeftijd moet tussen 1 en 120 liggen." };
    }
    out.age = Math.round(age);
  }

  if (raw.notes !== undefined && raw.notes !== null && String(raw.notes).trim()) {
    const notes = String(raw.notes).trim();
    if (notes.length > 2000) {
      return { ok: false, error: "Opmerkingen zijn te lang (max 2000 tekens)." };
    }
    out.notes = notes;
  }

  // Delivery recurring — occurrence-velden (optioneel hier; aanwezigheid
  // wordt na findSource() afgedwongen voor terugkerende activiteiten).
  // Parser doet alleen vormvalidatie. Anti-spoofing (match met
  // gegenereerde occurrence) gebeurt na findSource.
  const occStart = raw.occurrence_start;
  const occEnd   = raw.occurrence_end;
  const occLabel = raw.occurrence_label;
  const occAnyPresent =
    (typeof occStart === "string" && occStart.trim()) ||
    (typeof occEnd   === "string" && occEnd.trim())   ||
    (typeof occLabel === "string" && occLabel.trim());
  if (occAnyPresent) {
    if (typeof occStart !== "string" || typeof occEnd !== "string") {
      return { ok: false, error: "Onvolledige occurrence-gegevens." };
    }
    if (occStart.length > 64 || occEnd.length > 64) {
      return { ok: false, error: "Ongeldig occurrence-datumformaat." };
    }
    const ds = new Date(occStart);
    const de = new Date(occEnd);
    if (Number.isNaN(ds.getTime()) || Number.isNaN(de.getTime())) {
      return { ok: false, error: "Ongeldig occurrence-datumformaat." };
    }
    if (de.getTime() <= ds.getTime()) {
      return { ok: false, error: "Occurrence-einddatum moet na startdatum liggen." };
    }
    out.occurrence_start = ds.toISOString();
    out.occurrence_end   = de.toISOString();
    if (typeof occLabel === "string" && occLabel.trim()) {
      const label = occLabel.trim();
      if (label.length > 200) {
        return { ok: false, error: "Occurrence-label is te lang." };
      }
      out.occurrence_label = label;
    }
  }

  return { ok: true, mode: "activity", data: out };
}

function parseEducation(raw: Record<string, unknown>, sourceSlug: string): ParsedBody {
  // Parent-blok
  const rawParent = raw.parent;
  if (!rawParent || typeof rawParent !== "object") {
    return { ok: false, error: "Ouder/contactpersoon-gegevens ontbreken." };
  }
  const p = rawParent as Record<string, unknown>;

  const parentName = String(p.name || "").trim();
  if (parentName.length < 2 || parentName.length > 200) {
    return { ok: false, error: "Vul een geldige naam in voor de ouder/contactpersoon." };
  }

  const parentEmail = String(p.email || "").trim();
  if (!EMAIL_RE.test(parentEmail) || parentEmail.length > 320) {
    return { ok: false, error: "Vul een geldig e-mailadres in voor de ouder/contactpersoon." };
  }

  const parentPhoneDigits = digitsOnly(p.phone);
  if (parentPhoneDigits.length !== 10) {
    return { ok: false, error: "Telefoonnummer moet uit precies 10 cijfers bestaan." };
  }

  // Voorwaarden-checkbox: de eindcontrole (al-dan-niet vereist) gebeurt
  // in de POST-handler nadat we het programma hebben opgehaald. Hier
  // alleen normaliseren naar boolean | undefined zodat de waarde
  // beschikbaar is voor verdere validatie.
  const termsAccepted: boolean | undefined =
    raw.terms_accepted === true
      ? true
      : raw.terms_accepted === false
        ? false
        : undefined;

  // Studenten-array
  const rawStudents = raw.students;
  if (!Array.isArray(rawStudents) || rawStudents.length < 1) {
    return { ok: false, error: "Voeg ten minste één student toe." };
  }
  if (rawStudents.length > 20) {
    return { ok: false, error: "Maximaal 20 studenten per inschrijving." };
  }

  const students: EducationStudent[] = [];
  for (let i = 0; i < rawStudents.length; i++) {
    const r = rawStudents[i];
    if (!r || typeof r !== "object") {
      return { ok: false, error: `Student ${i + 1} is ongeldig.` };
    }
    const sr = r as Record<string, unknown>;

    const sName = String(sr.name || "").trim();
    if (sName.length < 2 || sName.length > 200) {
      return { ok: false, error: `Vul een geldige naam in voor student ${i + 1}.` };
    }

    const sGender = String(sr.gender || "").trim();
    if (!ALLOWED_GENDERS.has(sGender as Gender)) {
      return { ok: false, error: `Geslacht is verplicht voor student ${i + 1}.` };
    }

    const out: EducationStudent = {
      name:   sName,
      gender: sGender as Gender,
    };

    if (sr.age !== undefined && sr.age !== null && sr.age !== "") {
      const age = Number(sr.age);
      if (!Number.isFinite(age) || age < 1 || age > 120) {
        return { ok: false, error: `Leeftijd voor student ${i + 1} moet tussen 1 en 120 liggen.` };
      }
      out.age = Math.round(age);
    }

    if (sr.notes !== undefined && sr.notes !== null && String(sr.notes).trim()) {
      const notes = String(sr.notes).trim();
      if (notes.length > 2000) {
        return { ok: false, error: `Opmerkingen voor student ${i + 1} zijn te lang.` };
      }
      out.notes = notes;
    }

    students.push(out);
  }

  return {
    ok:   true,
    mode: "education",
    data: {
      type:        "education",
      source_slug: sourceSlug,
      parent: {
        name:  parentName,
        email: parentEmail,
        phone: parentPhoneDigits,
      },
      students,
      terms_accepted: termsAccepted,
    },
  };
}

// ─── Bron-lookup ────────────────────────────────────────────
function normalizeTargetGender(value: unknown): TargetGender {
  if (typeof value !== "string") return "mixed";
  const v = value.trim();
  if (!v) return "mixed";
  return ALLOWED_TARGET_GENDERS.has(v as TargetGender)
    ? (v as TargetGender)
    : "mixed";
}

interface SourceData {
  sourceCollection:    string;
  sourceId:            string;
  sourceTitle:         string;
  registrationEnabled: boolean;
  targetGender:        TargetGender;
  /**
   * Onderwijs-flow toggles. Voor activity-bron blijven deze op de
   * "veilige permissieve" defaults staan (terms niet vereist, multi
   * niet relevant want activity is altijd single-flow).
   */
  requireTermsAcceptance: boolean;
  allowMultipleStudents:  boolean;
  /**
   * Delivery 19 — Activity-specifieke flow toggles. Voor education-bron
   * blijven deze op `null`/`false`: education heeft geen capaciteit-veld
   * en geen `require_age`-veld (multi-student flow met eigen per-student
   * optionele leeftijd).
   *
   *   maxRegistrations: integer > 0 = limiet, null = onbeperkt.
   *   requireAge:       true = leeftijd verplicht in activity-tak.
   *
   * Delivery 20 — Extra activity-veld:
   *   minimumAge:       integer > 0 = leeftijd ≥ minimum, anders 403.
   *                     Null = geen minimum. Wanneer gevuld is leeftijd
   *                     automatisch verplicht (ook bij requireAge=false).
   */
  maxRegistrations: number | null;
  requireAge:       boolean;
  minimumAge:       number | null;
  /**
   * Delivery recurring — alleen ingevuld voor activity-source. Bevat de
   * recurring-velden zodat de POST-handler na findSource() kan beslissen
   * of een occurrence verplicht is en kan valideren tegen gegenereerde
   * occurrences. Voor education-source: null.
   *
   * Delivery recurring-ux — bevat ook show_occurrence_picker zodat de
   * POST-handler weet of de bezoeker een datum had moeten kiezen of
   * dat de server zelf de eerstvolgende moet picken.
   */
  activityRow: Pick<
    Activity,
    | "start_date" | "end_date"
    | "is_recurring" | "recurrence_type"
    | "recurrence_interval" | "recurrence_until" | "recurrence_weekday"
    | "show_occurrence_picker"
    | "registration_closes_at"
  > | null;
}

async function findSource(
  type: RegistrationType,
  slug: string,
): Promise<{ ok: true; data: SourceData } | { ok: false; status: number; error: string }> {
  try {
    if (type === "activity") {
      const result = await directusServer.request(
        readItems("activities", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          fields: [
            "id", "title", "registration_enabled", "target_gender",
            // Delivery 19 — capaciteit + leeftijd-vereiste.
            "max_registrations", "require_age",
            // Delivery 20 — minimumleeftijd.
            "minimum_age",
            // Delivery recurring — voor occurrence-validatie + datums.
            "start_date", "end_date",
            "is_recurring", "recurrence_type", "recurrence_interval",
            "recurrence_until", "recurrence_weekday",
            // Delivery recurring-ux — picker-toggle.
            "show_occurrence_picker",
            // Delivery 58 — automatische sluiting van inschrijving.
            "registration_closes_at",
          ],
          limit:  1,
        }),
      );
      const row = (result as Activity[])[0];
      if (!row) return { ok: false, status: 404, error: "Activiteit niet gevonden." };
      // max_registrations: alleen geldig als positief getal. Anders = onbeperkt.
      const max =
        typeof row.max_registrations === "number" && row.max_registrations > 0
          ? row.max_registrations
          : null;
      // minimum_age: alleen geldig als positief getal. Anders = geen minimum.
      // (0 of negatief behandelen we als "niet ingesteld" — een activiteit
      // voor leeftijd 0+ is hetzelfde als geen minimum.)
      const minAge =
        typeof row.minimum_age === "number" && row.minimum_age > 0
          ? row.minimum_age
          : null;
      return {
        ok: true,
        data: {
          sourceCollection:    "activities",
          sourceId:            String(row.id),
          sourceTitle:         row.title,
          registrationEnabled: !!row.registration_enabled,
          targetGender:        normalizeTargetGender(row.target_gender),
          // Activiteit-flow gebruikt deze toggles niet — single-student,
          // geen verplichte voorwaarden-checkbox. We zetten ze op
          // false/false zodat de validatieblokken downstream geen
          // onbedoelde restricties opleggen.
          requireTermsAcceptance: false,
          allowMultipleStudents:  false,
          maxRegistrations:       max,
          requireAge:             row.require_age === true,
          minimumAge:             minAge,
          activityRow: {
            start_date:             row.start_date,
            end_date:               row.end_date ?? null,
            is_recurring:           row.is_recurring ?? null,
            recurrence_type:        row.recurrence_type ?? null,
            recurrence_interval:    row.recurrence_interval ?? null,
            recurrence_until:       row.recurrence_until ?? null,
            recurrence_weekday:     row.recurrence_weekday ?? null,
            show_occurrence_picker: row.show_occurrence_picker ?? null,
            // Delivery 58 — sluit-moment voor de gate
            registration_closes_at: row.registration_closes_at ?? null,
          },
        },
      };
    } else {
      const result = await directusServer.request(
        readItems("education_programs", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          fields: [
            "id", "title", "registration_enabled", "target_gender",
            "require_terms_acceptance", "allow_multiple_students",
          ],
          limit:  1,
        }),
      );
      const row = (result as EducationProgram[])[0];
      if (!row) return { ok: false, status: 404, error: "Onderwijsprogramma niet gevonden." };
      // Veilige defaults wanneer kolom (nog) niet bestaat of null is —
      // matched de schema-defaults uit seed-stap 11c (true/true).
      const requireTerms =
        row.require_terms_acceptance === false ? false : true;
      const allowMulti =
        row.allow_multiple_students === false ? false : true;
      return {
        ok: true,
        data: {
          sourceCollection:    "education_programs",
          sourceId:            String(row.id),
          sourceTitle:         row.title,
          registrationEnabled: !!row.registration_enabled,
          targetGender:        normalizeTargetGender(row.target_gender),
          requireTermsAcceptance: requireTerms,
          allowMultipleStudents:  allowMulti,
          // Delivery 19 — education heeft geen capaciteit/age-vereiste velden.
          // Defaults zijn permissief (geen extra restricties).
          maxRegistrations: null,
          requireAge:       false,
          // Delivery 20 — education heeft geen minimum_age.
          minimumAge:       null,
          // Delivery recurring — education heeft geen recurring-flow.
          activityRow:      null,
        },
      };
    }
  } catch (err) {
    console.error("[inschrijven] bron-lookup mislukt:", err);
    return { ok: false, status: 500, error: "Kon de bron niet ophalen." };
  }
}

// ─── Gender vs target check ─────────────────────────────────
function checkGenderAgainstTarget(target: TargetGender, gender: Gender): string | null {
  if (target === "male" && gender !== "male") {
    return "Deze inschrijving is alleen voor mannen.";
  }
  if (target === "female" && gender !== "female") {
    return "Deze inschrijving is alleen voor vrouwen.";
  }
  return null;
}

// ─── POST handler ───────────────────────────────────────────
export async function POST(request: Request) {
  if (!process.env.DIRECTUS_TOKEN) {
    console.error("[inschrijven] DIRECTUS_TOKEN ontbreekt in environment");
    return NextResponse.json(
      { error: "De inschrijving is op dit moment niet beschikbaar. Neem contact op met de moskee." },
      { status: 503 },
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON in verzoek." }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const source = await findSource(
    parsed.mode === "activity" ? parsed.data.type : parsed.data.type,
    parsed.mode === "activity" ? parsed.data.source_slug : parsed.data.source_slug,
  );
  if (!source.ok) {
    return NextResponse.json({ error: source.error }, { status: source.status });
  }
  const src = source.data;

  if (!src.registrationEnabled) {
    return NextResponse.json(
      { error: "Inschrijven voor dit item is momenteel gesloten." },
      { status: 403 },
    );
  }

  // Delivery 58 — automatische sluiting van inschrijfformulier.
  // Alleen voor activity-bron (education_programs heeft geen
  // start_date / is_recurring; voor onderwijs blijft het bestaande
  // pad zoals voorheen).
  if (
    src.sourceCollection === "activities" &&
    src.activityRow &&
    isRegistrationClosed({
      registration_closes_at: src.activityRow.registration_closes_at ?? null,
      start_date:             src.activityRow.start_date,
      is_recurring:           src.activityRow.is_recurring ?? null,
    })
  ) {
    return NextResponse.json(
      { error: "Inschrijving is gesloten voor deze activiteit." },
      { status: 403 },
    );
  }

  // ─── Activity-tak: single record ─────────────────────────
  if (parsed.mode === "activity") {
    const body = parsed.data;

    const genderError = checkGenderAgainstTarget(src.targetGender, body.gender);
    if (genderError) {
      return NextResponse.json({ error: genderError }, { status: 403 });
    }

    // ─── Delivery 19 — Require age (vóór capaciteit) ────────
    // Eerst de cheapere check: leeftijd-vereiste valideren we zonder
    // extra DB-call. Wanneer admin `require_age = true` heeft staan
    // moet er een geldige leeftijd in de payload zitten (de parser
    // valideert bereik 1–120 al; hier alleen aanwezigheid).
    //
    // Delivery 20 — Wanneer `minimum_age` gevuld is (positief getal),
    // wordt leeftijd óók automatisch verplicht: zonder leeftijd kun
    // je het minimum niet controleren. We trekken die twee triggers
    // hier samen in één aanwezigheids-check.
    const ageRequiredEffective =
      src.requireAge || src.minimumAge !== null;
    if (ageRequiredEffective && (body.age === undefined || body.age === null)) {
      return NextResponse.json(
        { error: "Leeftijd is verplicht voor deze activiteit." },
        { status: 400 },
      );
    }

    // ─── Delivery 20 — Minimum age (vóór capaciteit) ────────
    // Wanneer minimum_age gevuld is EN leeftijd aanwezig (de check
    // hierboven heeft de "missing"-case al afgevangen): vergelijken
    // met het minimum. Lager dan minimum → 403 Forbidden met een
    // duidelijke melding.
    if (
      src.minimumAge !== null &&
      typeof body.age === "number" &&
      body.age < src.minimumAge
    ) {
      return NextResponse.json(
        {
          error:
            `U moet ten minste ${src.minimumAge} jaar oud zijn om in te schrijven ` +
            `voor deze activiteit.`,
        },
        { status: 403 },
      );
    }

    // ─── Delivery recurring — occurrence enforcement ─────────
    //
    // Voor terugkerende activiteiten:
    //   - occurrence_start + occurrence_end zijn VERPLICHT (HTTP 400).
    //   - de waarden MOETEN matchen met een door de server gegenereerde
    //     occurrence (anti-spoofing — voorkomt dat iemand zich inschrijft
    //     voor een willekeurige datum die niet in de serie zit).
    //   - de occurrence moet in de toekomst liggen (anders zou je je voor
    //     een al voorbij gegane occurrence kunnen inschrijven).
    //   - occurrence_label wordt door de server vervangen door het exacte
    //     gegenereerde label (zo blijft de schrijfwijze consistent in
    //     mails/admin ongeacht wat de client meegaf).
    //
    // Voor eenmalige activiteiten: occurrence-velden worden GENEGEERD —
    // de DB-rij krijgt null voor de occurrence-kolommen.
    const isRecurringActivityRecord =
      src.activityRow?.is_recurring === true &&
      (src.activityRow?.recurrence_type === "weekly" ||
       src.activityRow?.recurrence_type === "monthly");

    let validatedOccurrence: { start: string; end: string; label: string } | null = null;

    if (isRecurringActivityRecord) {
      // Genereer occurrences server-side (bron van waarheid voor zowel
      // anti-spoof als auto-pick).
      let serverOccurrences;
      try {
        serverOccurrences = generateActivityOccurrences(src.activityRow!, { from: new Date() });
      } catch (genErr) {
        console.error("[inschrijven] occurrence-generatie mislukt:", genErr);
        return NextResponse.json(
          { error: "Kon de occurrences voor deze activiteit niet bepalen." },
          { status: 500 },
        );
      }

      if (serverOccurrences.length === 0) {
        return NextResponse.json(
          { error: "Er zijn geen toekomstige momenten meer voor deze activiteit." },
          { status: 400 },
        );
      }

      const showPicker = src.activityRow?.show_occurrence_picker === true;

      if (body.occurrence_start && body.occurrence_end) {
        // Bezoeker stuurde een keuze mee → anti-spoof match (geldt voor
        // zowel show_picker=true als false; als false-modus client toch
        // een datum meestuurt, valideren we 'm alsnog tegen de serie).
        const match = serverOccurrences.find((o) => o.start === body.occurrence_start);
        if (!match) {
          return NextResponse.json(
            { error: "De gekozen datum is niet geldig voor deze activiteit." },
            { status: 400 },
          );
        }
        validatedOccurrence = { start: match.start, end: match.end, label: match.label };
      } else {
        // Geen occurrence in body.
        if (showPicker) {
          // Picker stond aan — bezoeker had moeten kiezen.
          return NextResponse.json(
            { error: "Kies een datum voor deze terugkerende activiteit." },
            { status: 400 },
          );
        }
        // Delivery recurring-ux — show_occurrence_picker=false:
        // server pickt de eerstvolgende occurrence automatisch.
        // Dit is de UX waarbij bezoeker geen datumkeuze ziet maar de
        // inschrijving wel aan een concrete datum hangt.
        const firstOccurrence = serverOccurrences[0];
        validatedOccurrence = {
          start: firstOccurrence.start,
          end:   firstOccurrence.end,
          label: firstOccurrence.label,
        };
      }
    }

    // ─── Delivery 19 — Capaciteit-check ─────────────────────
    // Tel het aantal bestaande activity-registraties voor dit specifieke
    // item. Bij `max_registrations === null` slaan we de query over.
    //
    // Bij count-fout: we kunnen veilig niet bepalen of er nog plek is →
    // weigeren (fail-closed). De UI is fail-open en zou dan de gebruiker
    // hebben laten proberen; admin ziet daardoor sneller dat de count
    // niet werkt.
    //
    // Race condition: er is geen DB-lock. Twee gelijktijdige requests
    // kunnen beide door de check komen wanneer er nog 1 plek over is.
    // Voor moskee-schaal acceptabel; gedocumenteerd in CHANGES.md.
    if (src.maxRegistrations !== null) {
      try {
        // Delivery recurring — bij terugkerende activiteit telt
        // max_registrations PER OCCURRENCE. We filteren dan ook op
        // occurrence_start zodat elke datum een eigen capaciteit krijgt.
        const filter: Record<string, unknown> = {
          type:              { _eq: "activity" },
          source_collection: { _eq: "activities" },
          source_id:         { _eq: src.sourceId },
        };
        if (validatedOccurrence) {
          filter.occurrence_start = { _eq: validatedOccurrence.start };
        }
        const existing = await directusServer.request(
          readItems("registrations", {
            filter: filter as never,
            fields: ["id"],
            limit:  -1,
          }),
        );
        const count = (existing as Array<{ id: unknown }>).length;
        if (count >= src.maxRegistrations) {
          return NextResponse.json(
            {
              error: validatedOccurrence
                ? "Deze datum zit vol. Kies een andere datum."
                : "Deze activiteit zit vol. Inschrijven is niet meer mogelijk.",
            },
            { status: 409 },
          );
        }
      } catch (countErr) {
        console.error("[inschrijven] capaciteit-check mislukt:", countErr);
        return NextResponse.json(
          { error: "Inschrijving kon niet worden opgeslagen. Probeer het later opnieuw." },
          { status: 500 },
        );
      }
    }

    try {
      // QR-1 — Token vooraf genereren zodat we hem ook kunnen meegeven
      // aan de visitor-confirmatiemail (check-in link).
      const checkInToken = randomUUID();

      await directusServer.request(
        createItem("registrations", {
          type:              body.type,
          source_collection: src.sourceCollection,
          source_id:         src.sourceId,
          source_slug:       body.source_slug,
          source_title:      src.sourceTitle,
          name:              body.name,
          email:             body.email,
          phone:             body.phone ?? null,
          age:               body.age ?? null,
          gender:            body.gender,
          notes:             body.notes ?? null,
          status:            "new",
          // QR-1 — Unieke token voor QR-code check-in (alleen activity).
          // Bevat geen persoonsgegevens, alleen lookup-key.
          check_in_token:    checkInToken,
          // Delivery recurring — occurrence (alleen ingevuld bij terugkerende).
          occurrence_start:  validatedOccurrence?.start ?? null,
          occurrence_end:    validatedOccurrence?.end   ?? null,
          occurrence_label:  validatedOccurrence?.label ?? null,
        } as never),
      );

      // ─── Admin-notificatie (fail-soft, no-op zolang feature uit) ─
      try {
        const settings = await getSiteSettings();
        await notifyActivityRegistration(settings, {
          activityTitle: src.sourceTitle,
          activitySlug:  body.source_slug,
          name:          body.name,
          email:         body.email,
          phone:         body.phone ?? null,
          gender:        body.gender,
          age:           body.age ?? null,
          notes:         body.notes ?? null,
          status:        "new",
          occurrenceLabel: validatedOccurrence?.label ?? null,
        });
      } catch (notifyErr) {
        console.warn("[inschrijven] activity-notificatie overgeslagen:", notifyErr);
      }

      // ─── Bezoeker-bevestigingsmail (QR-Visitor-Mail) ─────────
      // Onafhankelijk van admin-notify. Eigen try/catch, eigen
      // getSiteSettings-fetch (admin-tak kan gefaald zijn voordat
      // settings beschikbaar was). Fail-soft per contract van
      // notifyActivityRegistrationVisitor — mag inschrijving niet
      // blokkeren.
      try {
        const settingsForVisitor = await getSiteSettings();
        await notifyActivityRegistrationVisitor(settingsForVisitor, {
          activityTitle: src.sourceTitle,
          visitorEmail:  body.email,
          name:          body.name,
          email:         body.email,
          phone:         body.phone ?? null,
          gender:        body.gender,
          age:           body.age ?? null,
          notes:         body.notes ?? null,
          checkInToken,
          siteUrl:       getSiteUrl(),
          occurrenceLabel: validatedOccurrence?.label ?? null,
        });
      } catch (visitorErr) {
        console.warn("[inschrijven] activity-bezoekersmail overgeslagen:", visitorErr);
      }

      return NextResponse.json({ ok: true });
    } catch (err) {
      console.error("[inschrijven] activity opslaan mislukt:", err);
      return NextResponse.json(
        { error: "Inschrijving kon niet worden opgeslagen. Probeer het later opnieuw." },
        { status: 500 },
      );
    }
  }

  // ─── Education-tak: multi-student records ────────────────
  const body = parsed.data;

  // ─── Programma-toggles afdwingen (server-side) ──────────
  // 1. Voorwaarden-checkbox — alleen vereist wanneer het programma
  //    `require_terms_acceptance = true` heeft.
  if (src.requireTermsAcceptance && body.terms_accepted !== true) {
    return NextResponse.json(
      { error: "U moet akkoord gaan met de voorwaarden." },
      { status: 400 },
    );
  }

  // 2. Meerdere studenten — alleen toegestaan als het programma dat aanstaat.
  //    Anders weigeren we strikt > 1.
  if (!src.allowMultipleStudents && body.students.length > 1) {
    return NextResponse.json(
      {
        error:
          "Voor dit programma kan slechts één student per inschrijving worden ingediend.",
      },
      { status: 400 },
    );
  }

  // Eerst alle gender-vereisten controleren — niets schrijven als één faalt.
  for (let i = 0; i < body.students.length; i++) {
    const s = body.students[i];
    const err = checkGenderAgainstTarget(src.targetGender, s.gender);
    if (err) {
      return NextResponse.json(
        { error: `${err} (Student ${i + 1}: ${s.name})` },
        { status: 403 },
      );
    }
  }

  // Genereer studentnummers + group-id vooraf
  const groupId = randomUUID();
  let studentNumbers: string[];
  try {
    studentNumbers = await generateStudentNumbers(body.students.length);
  } catch (err) {
    console.error("[inschrijven] studentnummers genereren mislukt:", err);
    return NextResponse.json(
      { error: "Studentnummer kon niet worden gegenereerd. Probeer het later opnieuw." },
      { status: 500 },
    );
  }

  // Schrijf records sequentieel. Bij een fout halverwege: best-effort —
  // we loggen welke records al zijn aangemaakt zodat admin handmatig kan
  // aanvullen (geen DB-transactie via Directus REST). Voor huidige schaal
  // (paar inschrijvingen per dag) acceptabel.
  const created: string[] = [];
  try {
    for (let i = 0; i < body.students.length; i++) {
      const s = body.students[i];
      const sn = studentNumbers[i];

      const result = await directusServer.request(
        createItem("registrations", {
          type:              "education",
          source_collection: src.sourceCollection,
          source_id:         src.sourceId,
          source_slug:       body.source_slug,
          source_title:      src.sourceTitle,
          // Hoofdvelden — gebruiken we ook voor de student-naam zodat admin
          // niet hoeft te wisselen tussen velden.
          name:              s.name,
          email:             body.parent.email, // student-email niet apart
          phone:             body.parent.phone,
          age:               s.age ?? null,
          gender:            s.gender,
          notes:             s.notes ?? null,
          status:            "new",
          // Education-specifieke velden
          student_number:        sn,
          parent_name:           body.parent.name,
          parent_email:          body.parent.email,
          parent_phone:          body.parent.phone,
          registration_group_id: groupId,
        } as never),
      );
      const id = (result as { id?: string | number })?.id;
      if (id !== undefined) created.push(String(id));
    }

    // ─── Admin-notificatie (fail-soft, no-op zolang feature uit) ─
    // Pas hier — alle records zijn succesvol geschreven, anders zaten
    // we in de catch hieronder.
    try {
      const settings = await getSiteSettings();
      await notifyEducationRegistration(settings, {
        programTitle: src.sourceTitle,
        programSlug:  body.source_slug,
        parent:       body.parent,
        students:     body.students.map((s, i) => ({
          name:          s.name,
          gender:        s.gender,
          age:           s.age ?? null,
          notes:         s.notes ?? null,
          studentNumber: studentNumbers[i],
        })),
        groupId,
      });
    } catch (notifyErr) {
      console.warn("[inschrijven] education-notificatie overgeslagen:", notifyErr);
    }

    // ─── Bezoeker-bevestigingsmail (QR-Visitor-Mail) ─────────
    // Onderwijs krijgt GEEN check-in link (geen token). Eigen
    // try/catch, eigen getSiteSettings-fetch. Fail-soft per
    // contract — mag inschrijving niet blokkeren.
    try {
      const settingsForVisitor = await getSiteSettings();
      await notifyEducationRegistrationVisitor(settingsForVisitor, {
        programTitle: src.sourceTitle,
        visitorEmail: body.parent.email,
        parent:       body.parent,
        students:     body.students.map((s, i) => ({
          name:          s.name,
          gender:        s.gender,
          age:           s.age ?? null,
          notes:         s.notes ?? null,
          studentNumber: studentNumbers[i],
        })),
      });
    } catch (visitorErr) {
      console.warn("[inschrijven] education-bezoekersmail overgeslagen:", visitorErr);
    }

    return NextResponse.json({
      ok: true,
      group_id: groupId,
      student_count: body.students.length,
    });
  } catch (err) {
    console.error(
      "[inschrijven] education opslaan mislukt na", created.length, "van",
      body.students.length, "records (group_id =", groupId + "):",
      err,
    );
    return NextResponse.json(
      {
        error:
          "Niet alle inschrijvingen konden worden opgeslagen. " +
          "Neem contact op met de moskee om uw inschrijving te controleren.",
      },
      { status: 500 },
    );
  }
}
