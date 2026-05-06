// app/api/inschrijven/route.ts
//
// Algemene inschrijf-endpoint voor activiteiten en onderwijs.
// Schrijft naar de `registrations` collectie via Directus admin-token.
//
// De client verstuurt:
//   { type, source_slug, name, email, phone?, age?, gender?, notes?, consent }
//
// Server-side wordt:
//   1. payload gevalideerd
//   2. de bron opgezocht in de juiste collectie (activities/education_programs)
//   3. gecontroleerd of registration_enabled = true
//   4. een nieuwe registratie aangemaakt met type/source_*/status="new"

import { NextResponse } from "next/server";
import { directusServer } from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";
import type {
  Activity,
  EducationProgram,
  RegistrationType,
} from "@/types/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Validatie ──────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_GENDERS = new Set(["m", "f", "other", "unspecified"]);

interface IncomingBody {
  type?:        unknown;
  source_slug?: unknown;
  name?:        unknown;
  email?:       unknown;
  phone?:       unknown;
  age?:         unknown;
  gender?:      unknown;
  notes?:       unknown;
  consent?:     unknown;
}

interface ParsedBody {
  type:        RegistrationType;
  source_slug: string;
  name:        string;
  email:       string;
  phone?:      string;
  age?:        number;
  gender?:     "m" | "f" | "other" | "unspecified";
  notes?:      string;
}

function parseBody(raw: IncomingBody): { ok: true; data: ParsedBody } | { ok: false; error: string } {
  const type = String(raw.type || "").trim();
  if (type !== "activity" && type !== "education") {
    return { ok: false, error: "Ongeldig type. Verwacht 'activity' of 'education'." };
  }

  const sourceSlug = String(raw.source_slug || "").trim();
  if (!sourceSlug) return { ok: false, error: "source_slug ontbreekt." };

  const name = String(raw.name || "").trim();
  if (name.length < 2 || name.length > 200) {
    return { ok: false, error: "Vul een geldige naam in." };
  }

  const email = String(raw.email || "").trim();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }

  if (raw.consent !== true) {
    return { ok: false, error: "Akkoord met verwerking van uw gegevens is verplicht." };
  }

  // Optionele velden
  const out: ParsedBody = {
    type:        type as RegistrationType,
    source_slug: sourceSlug,
    name,
    email,
  };

  if (raw.phone !== undefined && raw.phone !== null && String(raw.phone).trim()) {
    const phone = String(raw.phone).trim();
    if (phone.length > 50) return { ok: false, error: "Telefoonnummer is te lang." };
    out.phone = phone;
  }

  if (raw.age !== undefined && raw.age !== null && raw.age !== "") {
    const age = Number(raw.age);
    if (!Number.isFinite(age) || age < 1 || age > 120) {
      return { ok: false, error: "Leeftijd moet tussen 1 en 120 liggen." };
    }
    out.age = Math.round(age);
  }

  if (raw.gender !== undefined && raw.gender !== null && String(raw.gender).trim()) {
    const gender = String(raw.gender).trim();
    if (!ALLOWED_GENDERS.has(gender)) {
      return { ok: false, error: "Ongeldige waarde voor geslacht." };
    }
    out.gender = gender as ParsedBody["gender"];
  }

  if (raw.notes !== undefined && raw.notes !== null && String(raw.notes).trim()) {
    const notes = String(raw.notes).trim();
    if (notes.length > 2000) return { ok: false, error: "Opmerkingen zijn te lang (max 2000 tekens)." };
    out.notes = notes;
  }

  return { ok: true, data: out };
}

// ─── Bron-lookup ────────────────────────────────────────────
async function findSource(
  type: RegistrationType,
  slug: string
): Promise<
  | { ok: true; sourceCollection: string; sourceId: string; sourceTitle: string; registrationEnabled: boolean }
  | { ok: false; status: number; error: string }
> {
  try {
    if (type === "activity") {
      const result = await directusServer.request(
        readItems("activities", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          fields: ["id", "title", "registration_enabled"],
          limit:  1,
        })
      );
      const row = (result as Activity[])[0];
      if (!row) return { ok: false, status: 404, error: "Activiteit niet gevonden." };
      return {
        ok: true,
        sourceCollection: "activities",
        sourceId:         String(row.id),
        sourceTitle:      row.title,
        registrationEnabled: !!row.registration_enabled,
      };
    } else {
      const result = await directusServer.request(
        readItems("education_programs", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          fields: ["id", "title", "registration_enabled"],
          limit:  1,
        })
      );
      const row = (result as EducationProgram[])[0];
      if (!row) return { ok: false, status: 404, error: "Onderwijsprogramma niet gevonden." };
      return {
        ok: true,
        sourceCollection: "education_programs",
        sourceId:         String(row.id),
        sourceTitle:      row.title,
        registrationEnabled: !!row.registration_enabled,
      };
    }
  } catch (err) {
    console.error("[inschrijven] bron-lookup mislukt:", err);
    return { ok: false, status: 500, error: "Kon de bron niet ophalen." };
  }
}

// ─── POST handler ───────────────────────────────────────────
export async function POST(request: Request) {
  // Pre-flight: server-token aanwezig?
  if (!process.env.DIRECTUS_TOKEN) {
    console.error("[inschrijven] DIRECTUS_TOKEN ontbreekt in environment");
    return NextResponse.json(
      { error: "De inschrijving is op dit moment niet beschikbaar. Neem contact op met de moskee." },
      { status: 503 }
    );
  }

  // Body parsen
  let raw: IncomingBody;
  try {
    raw = (await request.json()) as IncomingBody;
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON in verzoek." }, { status: 400 });
  }

  const parsed = parseBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.data;

  // Bron ophalen + controleren
  const source = await findSource(body.type, body.source_slug);
  if (!source.ok) {
    return NextResponse.json({ error: source.error }, { status: source.status });
  }

  if (!source.registrationEnabled) {
    return NextResponse.json(
      { error: "Inschrijven voor dit item is momenteel gesloten." },
      { status: 403 }
    );
  }

  // Registratie schrijven
  try {
    await directusServer.request(
      createItem("registrations", {
        type:              body.type,
        source_collection: source.sourceCollection,
        source_id:         source.sourceId,
        source_slug:       body.source_slug,
        source_title:      source.sourceTitle,
        name:              body.name,
        email:             body.email,
        phone:             body.phone ?? null,
        age:               body.age ?? null,
        gender:            body.gender ?? null,
        notes:             body.notes ?? null,
        status:            "new",
      } as never)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[inschrijven] opslaan mislukt:", err);
    return NextResponse.json(
      { error: "Inschrijving kon niet worden opgeslagen. Probeer het later opnieuw." },
      { status: 500 }
    );
  }
}
