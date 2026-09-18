// app/api/onderwijs/inschrijven/route.ts
//
// Hifdh programma-inschrijving (één gezin, 1..n kinderen). Schrijft één
// record naar `quran_registrations` met de kinderen als geneste
// `children` (→ quran_registration_children), via het server-side
// Directus-token (DIRECTUS_TOKEN) — dezelfde architectuur als /api/inschrijven.
// De Public-rol in Directus heeft GEEN rechten op deze collectie.
//
// Flow:
//   1. Body-grootte + JSON-parse (onvertrouwd)
//   2. Honeypot (bots) → stil "succes", niets opslaan
//   3. Volledige server-side validatie (lib/quranRegistration.ts)
//   4. ÉÉN createItem met status "new" en geneste children. Directus voert
//      geneste creates uit in één databasetransactie: mislukt een kind,
//      dan wordt ook de hoofdregistratie teruggedraaid (geen halve inschrijving).
//   5. Fail-soft admin-mail (mag het opslaan nooit laten falen)
//
// Logging: technische details (status/code/Directus-foutcodes), maar
// nooit namen, telefoonnummers, e-mailadressen of de toelichting.

import { NextResponse } from "next/server";
import { createItem } from "@directus/sdk";
import { directusServer, getSiteSettings } from "@/lib/directus";
import { notifyQuranRegistration } from "@/lib/server/notifications";
import {
  CHILD_GENDER_OPTIONS,
  PAYMENT_FREQUENCY_OPTIONS,
  RELATION_OPTIONS,
  labelFor,
  validateQuranRegistration,
} from "@/lib/quranRegistration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LOG = "[onderwijs/inschrijven]";
const MAX_BODY_BYTES = 100_000; // tot MAX_CHILDREN kinderen met toelichtingen
const DIRECTUS_TIMEOUT_MS = 15_000;

const MSG_GENERIC =
  "Uw inschrijving kon niet worden opgeslagen. Probeer het later opnieuw of neem contact met ons op.";
const MSG_UNAVAILABLE =
  "De inschrijving kon nu niet worden verwerkt omdat het systeem tijdelijk niet bereikbaar is. Uw ingevulde gegevens blijven op deze pagina staan; probeer het over enkele minuten opnieuw.";

/** Technische samenvatting van een SDK/fetch-fout — zonder request-data. */
function describeError(err: unknown): {
  kind: "unreachable" | "directus" | "timeout" | "unknown";
  detail: string;
} {
  if (err instanceof Error && err.name === "TimeoutError") {
    return { kind: "timeout", detail: err.message };
  }
  const e = err as {
    response?: { status?: number };
    errors?: Array<{ message?: string; extensions?: { code?: string; field?: string; collection?: string } }>;
    message?: string;
    cause?: { code?: string };
  };

  if (Array.isArray(e?.errors) && e.errors.length > 0) {
    const status = e.response?.status;
    const codes = e.errors
      .map((x) => `${x.extensions?.code ?? "?"}${x.extensions?.field ? `(${x.extensions.field})` : ""}`)
      .join(",");
    // Directus-berichten bevatten veld-/collectienamen, geen waarden.
    return { kind: "directus", detail: `status=${status ?? "?"} codes=${codes} msg=${e.errors[0]?.message ?? ""}` };
  }

  // fetch() zonder response: DNS/ECONNREFUSED/timeout op netwerkniveau
  if (e?.response === undefined) {
    return {
      kind: "unreachable",
      detail: `${e?.message ?? "onbekend"}${e?.cause?.code ? ` cause=${e.cause.code}` : ""}`,
    };
  }
  return { kind: "unknown", detail: `status=${e.response?.status ?? "?"} ${e?.message ?? ""}` };
}

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const t = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Directus-verzoek duurde langer dan ${ms} ms`);
      err.name = "TimeoutError";
      reject(err);
    }, ms);
  });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

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
  const d = result.data;

  // ── 4. Opslaan (atomair: hoofdregistratie + kinderen in één request) ──
  const { children, ...family } = d;
  let createdId: string | number | null = null;
  try {
    const created = await timeout(
      directusServer.request(
        createItem("quran_registrations", {
          ...family,
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

  return NextResponse.json({ ok: true }, { status: 201 });
}
