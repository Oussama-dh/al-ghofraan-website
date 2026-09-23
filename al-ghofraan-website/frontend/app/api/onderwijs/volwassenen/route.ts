// app/api/onderwijs/volwassenen/route.ts
//
// Inschrijving volwassenenonderwijs (education_programs.audience = "adults"):
// één persoon met voornaam, achternaam, telefoon, e-mail en leeftijd.
// Schrijft één record naar `adult_registrations` (seed-stap 73) via het
// server-side Directus-token. De Public-rol heeft geen rechten op die collectie.
//
// Flow:
//   1. Body-grootte + JSON-parse (onvertrouwd)
//   2. Honeypot (bots) → stil "succes", niets opslaan
//   3. Programma-check: gepubliceerd, volwassenenonderwijs, inschrijven open
//   4. Validatie inclusief min/max leeftijd van het programma (lib/adultRegistration.ts)
//   5. Opslaan
//   6. Fail-soft admin-mail en bevestigingsmail
//
// Logging: technische details, nooit namen, telefoonnummers of e-mailadressen.

import { NextResponse } from "next/server";
import { createItem, readItems } from "@directus/sdk";
import { directusServer, getAssetUrl, getSiteSettings } from "@/lib/directus";
import { getSiteUrl } from "@/lib/utils";
import {
  notifyAdultEducationRegistration,
  notifyAdultEducationRegistrationVisitor,
} from "@/lib/server/notifications";
import { describeError, timeout } from "@/lib/server/directusErrors";
import { programAudience } from "@/lib/educationRoutes";
import { validateAdultRegistration } from "@/lib/adultRegistration";
import type { EducationProgram } from "@/types/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[onderwijs/volwassenen]";
const MAX_BODY_BYTES = 10_000;
const DIRECTUS_TIMEOUT_MS = 15_000;

const MSG_INVALID = "Ongeldig verzoek. Ververs de pagina en probeer het opnieuw.";
const MSG_GENERIC =
  "Uw inschrijving kon niet worden opgeslagen. Probeer het later opnieuw of neem contact met ons op.";
const MSG_UNAVAILABLE =
  "De inschrijving kon nu niet worden verwerkt omdat het systeem tijdelijk niet bereikbaar is. Uw ingevulde gegevens blijven op deze pagina staan; probeer het over enkele minuten opnieuw.";

function failure(err: unknown, step: string) {
  const { kind, detail } = describeError(err);
  console.error(`${LOG} ${step} mislukt (${kind}): ${detail}`);
  const unavailable = kind === "unreachable" || kind === "timeout";
  return NextResponse.json(
    { error: unavailable ? MSG_UNAVAILABLE : MSG_GENERIC },
    { status: unavailable ? 503 : 500 },
  );
}

export async function POST(request: Request) {
  if (!process.env.DIRECTUS_TOKEN) {
    console.error(`${LOG} DIRECTUS_TOKEN ontbreekt in environment`);
    return NextResponse.json({ error: MSG_GENERIC }, { status: 500 });
  }

  // ── 1. Body lezen (begrensd) ───────────────────────────────
  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "De ingezonden gegevens zijn te groot." }, { status: 413 });
    }
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: MSG_INVALID }, { status: 400 });
    }
    raw = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: MSG_INVALID }, { status: 400 });
  }

  // ── 2. Honeypot ────────────────────────────────────────────
  if (typeof raw.website === "string" && raw.website.trim() !== "") {
    console.warn(`${LOG} honeypot geraakt — inzending genegeerd`);
    return NextResponse.json({ ok: true });
  }

  // ── 3. Programma open voor inschrijving? ───────────────────
  const slug = typeof raw.program_slug === "string" ? raw.program_slug : "";
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) {
    return NextResponse.json({ error: MSG_INVALID }, { status: 400 });
  }
  let program: EducationProgram | undefined;
  try {
    const rows = (await timeout(
      directusServer.request(
        readItems("education_programs", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          fields: ["id", "slug", "title", "registration_enabled", "min_age", "max_age", "audience"] as never,
          limit: 1,
        }),
      ),
      DIRECTUS_TIMEOUT_MS,
    )) as unknown as EducationProgram[];
    program = rows[0];
  } catch (err) {
    return failure(err, "programma-check");
  }
  if (!program || programAudience(program) !== "adults") {
    return NextResponse.json({ error: "Dit programma is niet gevonden." }, { status: 404 });
  }
  if (program.registration_enabled !== true) {
    return NextResponse.json(
      { error: `Inschrijven voor ${program.title} is momenteel gesloten.` },
      { status: 403 },
    );
  }

  // ── 4. Validatie (server is autoriteit) ────────────────────
  const result = validateAdultRegistration(raw, { minAge: program.min_age, maxAge: program.max_age });
  if (!result.ok) {
    return NextResponse.json(
      { error: "Controleer de gemarkeerde velden en probeer het opnieuw.", fieldErrors: result.errors },
      { status: 400 },
    );
  }
  const d = result.data;

  // ── 5. Opslaan ─────────────────────────────────────────────
  let createdId: string | number | null = null;
  try {
    const created = await timeout(
      directusServer.request(
        createItem("adult_registrations", {
          program:       program.id,
          program_title: program.title,
          first_name:    d.first_name,
          last_name:     d.last_name,
          phone:         d.phone,
          email:         d.email,
          age:           d.age,
          consent_given: true,
          status:        "new",
        } as never),
      ),
      DIRECTUS_TIMEOUT_MS,
    );
    createdId = (created as { id?: string | number } | null)?.id ?? null;
  } catch (err) {
    return failure(err, "opslaan");
  }

  // ── 6. Mails (fail-soft) ───────────────────────────────────
  try {
    const settings = await getSiteSettings();
    await notifyAdultEducationRegistration(settings, {
      programTitle:   program.title,
      registrationId: createdId,
      submittedAt: new Intl.DateTimeFormat("nl-NL", {
        timeZone: "Europe/Amsterdam", dateStyle: "long", timeStyle: "short",
      }).format(new Date()),
      firstName: d.first_name,
      lastName:  d.last_name,
      phone:     d.phone,
      email:     d.email,
      age:       d.age,
    });
    await notifyAdultEducationRegistrationVisitor(settings, {
      visitorEmail:  d.email,
      programTitle:  program.title,
      firstName:     d.first_name,
      lastName:      d.last_name,
      phone:         d.phone,
      age:           d.age,
      logoUrl: getAssetUrl(settings?.logo),
      siteUrl: getSiteUrl(),
    });
  } catch (notifyErr) {
    const msg = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
    console.warn(`${LOG} mail overgeslagen: ${msg}`);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
