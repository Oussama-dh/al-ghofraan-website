// app/api/onderwijs/inschrijven/route.ts
//
// Inschrijving kinderonderwijs (één gezin, 1..n kinderen) voor elk programma
// met doelgroep "children" (oorspronkelijk alleen het Hifdh programma). Schrijft één
// record naar `quran_registrations` met de kinderen als geneste
// `children` (→ quran_registration_children), via het server-side
// Directus-token (DIRECTUS_TOKEN) — dezelfde architectuur als /api/inschrijven.
// De Public-rol in Directus heeft GEEN rechten op deze collectie.
//
// Flow:
//   1. Body-grootte + JSON-parse (onvertrouwd)
//   2. Honeypot (bots) → stil "succes", niets opslaan
//   3. Volledige server-side validatie (lib/quranRegistration.ts)
//   3b. Programma-check: het programma (`program_slug` uit de body; zonder
//      waarde het Hifdh programma, voor oude open tabbladen) moet in
//      education_programs bestaan, gepubliceerd zijn, kinderonderwijs zijn en
//      `registration_enabled` hebben ('Inschrijven gesloten' sluit ook de API)
//   4. ÉÉN createItem met status "new" en geneste children. Directus voert
//      geneste creates uit in één databasetransactie: mislukt een kind,
//      dan wordt ook de hoofdregistratie teruggedraaid (geen halve inschrijving).
//   5. Fail-soft admin-mail (mag het opslaan nooit laten falen)
//   6. Fail-soft bevestigingsmail (HTML, huisstijl) naar contactpersoon 1;
//      gestuurd wanneer de bevestigingsschakelaar voor onderwijs aan staat
//
// Logging: technische details (status/code/Directus-foutcodes), maar
// nooit namen, telefoonnummers, e-mailadressen of de toelichting.

import { NextResponse } from "next/server";
import { createItem, readItems } from "@directus/sdk";
import { directusServer, getAssetUrl, getSiteSettings } from "@/lib/directus";
import { getSiteUrl } from "@/lib/utils";
import { notifyHifdhRegistrationVisitor, notifyQuranRegistration } from "@/lib/server/notifications";
import { HIFDH_PROGRAM_SLUG, programAudience, requiresLettersCheck } from "@/lib/educationRoutes";
import {
  CHILD_GENDER_OPTIONS,
  PAYMENT_FREQUENCY_OPTIONS,
  RELATION_OPTIONS,
  labelFor,
  validateQuranRegistration,
  type ProgramRules,
} from "@/lib/quranRegistration";
import type { EducationProgram } from "@/types/directus";
import { describeError, timeout } from "@/lib/server/directusErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[onderwijs/inschrijven]";
const MAX_BODY_BYTES = 100_000; // tot MAX_CHILDREN kinderen met toelichtingen
const DIRECTUS_TIMEOUT_MS = 15_000;

const MSG_GENERIC =
  "Uw inschrijving kon niet worden opgeslagen. Probeer het later opnieuw of neem contact met ons op.";
const MSG_UNAVAILABLE =
  "De inschrijving kon nu niet worden verwerkt omdat het systeem tijdelijk niet bereikbaar is. Uw ingevulde gegevens blijven op deze pagina staan; probeer het over enkele minuten opnieuw.";

export async function POST(request: Request) {
  if (!process.env.DIRECTUS_TOKEN) {
    console.error(`${LOG} DIRECTUS_TOKEN ontbreekt in environment`);
    return NextResponse.json({ error: MSG_GENERIC }, { status: 500 });
  }

  // ── 1. Body lezen (begrensd) ───────────────────────────────
  let raw: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "De ingezonden gegevens zijn te groot." }, { status: 413 });
    }
    raw = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek. Ververs de pagina en probeer het opnieuw." }, { status: 400 });
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "Ongeldig verzoek. Ververs de pagina en probeer het opnieuw." }, { status: 400 });
  }

  // ── 2. Honeypot ────────────────────────────────────────────
  // Het formulier bevat een verborgen veld "website" dat mensen nooit
  // invullen. Bots wel: die krijgen een nep-succes zonder opslag.
  const honeypot = (raw as Record<string, unknown>).website;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    console.warn(`${LOG} honeypot geraakt — inzending genegeerd`);
    return NextResponse.json({ ok: true });
  }

  // ── 3. Validatie (server is autoriteit) ────────────────────
  const result = validateQuranRegistration(raw);
  if (!result.ok) {
    return NextResponse.json(
      {
        error: "Controleer de gemarkeerde velden en probeer het opnieuw.",
        fieldErrors: result.errors,
      },
      { status: 400 },
    );
  }

  // ── 3b. Programma open voor inschrijving? ─────────────────
  const rawSlug = (raw as Record<string, unknown>).program_slug;
  const programSlug =
    typeof rawSlug === "string" && /^[a-z0-9-]{1,100}$/.test(rawSlug) ? rawSlug : HIFDH_PROGRAM_SLUG;
  let rules: ProgramRules = {};
  let programTitle = "";
  let programId: string | number = "";
  try {
    const rows = (await timeout(
      directusServer.request(
        readItems("education_programs", {
          filter: { slug: { _eq: programSlug }, status: { _eq: "published" } } as never,
          fields: [
            "id", "slug", "title", "registration_enabled", "min_age", "max_age",
            "audience", "require_letters_check",
          ] as never,
          limit: 1,
        }),
      ),
      DIRECTUS_TIMEOUT_MS,
    )) as unknown as EducationProgram[];
    const program = rows[0];
    if (!program || programAudience(program) !== "children") {
      return NextResponse.json({ error: "Dit programma is niet gevonden." }, { status: 404 });
    }
    if (program.registration_enabled !== true) {
      return NextResponse.json(
        { error: `Inschrijven voor ${program.title} is momenteel gesloten.` },
        { status: 403 },
      );
    }
    programTitle = program.title;
    programId = program.id;
    rules = {
      minAge: program.min_age,
      maxAge: program.max_age,
      requireLetters: requiresLettersCheck(program),
    };
  } catch (err) {
    const { kind, detail } = describeError(err);
    console.error(`${LOG} programma-check mislukt (${kind}): ${detail}`);
    return NextResponse.json(
      { error: kind === "unreachable" || kind === "timeout" ? MSG_UNAVAILABLE : MSG_GENERIC },
      { status: kind === "unreachable" || kind === "timeout" ? 503 : 500 },
    );
  }

  // ── 3c. Regels van het programma (min/max leeftijd, letters-vinkje) ──
  const ageResult = validateQuranRegistration(raw, rules);
  if (!ageResult.ok) {
    return NextResponse.json(
      {
        error: "Controleer de gemarkeerde velden en probeer het opnieuw.",
        fieldErrors: ageResult.errors,
      },
      { status: 400 },
    );
  }

  // ── 4. Opslaan (atomair: hoofdregistratie + kinderen in één request) ──
  const d = ageResult.data;
  const { children, ...family } = d;
  let createdId: string | number | null = null;
  try {
    const created = await timeout(
      directusServer.request(
        createItem("quran_registrations", {
          ...family,
          program:       programId,
          program_slug:  programSlug,
          program_title: programTitle,
          status: "new",
          // Directus maakt geneste O2M-items aan binnen dezelfde transactie.
          children: children.map((c, i) => ({ ...c, sort: i + 1 })),
        } as never),
      ),
      DIRECTUS_TIMEOUT_MS,
    );
    createdId = (created as { id?: string | number } | null)?.id ?? null;
  } catch (err) {
    const { kind, detail } = describeError(err);
    console.error(`${LOG} opslaan mislukt (${kind}): ${detail}`);
    if (kind === "unreachable" || kind === "timeout") {
      return NextResponse.json({ error: MSG_UNAVAILABLE }, { status: 503 });
    }
    // Directus-validatie/permissie-fout betekent meestal een schema- of
    // rechtenprobleem aan onze kant (seed-stap 60/61 niet gedraaid) — niet
    // iets dat de gebruiker kan oplossen.
    return NextResponse.json({ error: MSG_GENERIC }, { status: 500 });
  }

  // ── 5. Mail (fail-soft) ────────────────────────────────────
  try {
    const settings = await getSiteSettings();
    await notifyQuranRegistration(settings, {
      programTitle,
      registrationId: createdId,
      submittedAt:    new Intl.DateTimeFormat("nl-NL", {
        timeZone: "Europe/Amsterdam", dateStyle: "long", timeStyle: "short",
      }).format(new Date()),
      contact1: {
        name:     d.contact_1_name,
        relation: d.contact_1_relation === "other"
          ? (d.contact_1_relation_other ?? "Anders")
          : labelFor(RELATION_OPTIONS, d.contact_1_relation),
        phone: d.contact_1_phone,
        email: d.contact_1_email,
      },
      contact2: !d.secondary_contact_absent
        ? {
            name:     d.secondary_contact_name ?? "",
            relation: d.secondary_contact_relation === "other"
              ? (d.secondary_contact_relation_other ?? "Anders")
              : labelFor(RELATION_OPTIONS, d.secondary_contact_relation),
            phone: d.secondary_contact_phone ?? "",
            email: d.secondary_contact_email ?? "",
          }
        : null,
      children: children.map((c) => ({
        name:                     `${c.first_name} ${c.last_name}`,
        birthDate:                c.birth_date,
        gender:                   labelFor(CHILD_GENDER_OPTIONS, c.gender),
        readingLevel:             c.reading_level,
        writingLevel:             c.writing_level,
        hasReadingNotes:          c.reading_notes !== null,
        hasWritingNotes:          c.writing_notes !== null,
        hasSpecialConsiderations: c.special_considerations,
      })),
      hasAdditionalNotes: d.additional_notes !== null,
      paymentFrequency:   labelFor(PAYMENT_FREQUENCY_OPTIONS, d.payment_frequency),
    });
  } catch (notifyErr) {
    const msg = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
    console.warn(`${LOG} notificatie overgeslagen: ${msg}`);
  }

  // ── 6. Bevestiging aan de ouder (fail-soft) ────────────────
  try {
    const settings = await getSiteSettings();
    await notifyHifdhRegistrationVisitor(settings, {
      visitorEmail: d.contact_1_email,
      programTitle,
      contact: { name: d.contact_1_name, phone: d.contact_1_phone, email: d.contact_1_email },
      children: children.map((c) => ({
        name:      `${c.first_name} ${c.last_name}`,
        birthDate: c.birth_date,
        gender:    labelFor(CHILD_GENDER_OPTIONS, c.gender),
      })),
      paymentFrequency: labelFor(PAYMENT_FREQUENCY_OPTIONS, d.payment_frequency),
      logoUrl: getAssetUrl(settings?.logo),
      siteUrl: getSiteUrl(),
    });
  } catch (visitorErr) {
    const msg = visitorErr instanceof Error ? visitorErr.message : String(visitorErr);
    console.warn(`${LOG} bevestigingsmail overgeslagen: ${msg}`);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
