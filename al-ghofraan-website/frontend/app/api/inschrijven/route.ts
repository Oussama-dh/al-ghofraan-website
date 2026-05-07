// app/api/inschrijven/route.ts
//
// Algemene inschrijf-endpoint voor activiteiten en onderwijs.
// Schrijft naar de `registrations` collectie via Directus admin-token.
//
// De client verstuurt:
//   { type, source_slug, name, email, gender, phone?, age?, notes?, consent }
//
// Server-side wordt:
//   1. payload gevalideerd
//   2. de bron opgezocht in de juiste collectie (activities/education_programs)
//   3. gecontroleerd of registration_enabled = true
//   4. gecontroleerd of het opgegeven gender past bij target_gender van de bron
//   5. een nieuwe registratie aangemaakt met type/source_*/status="new"

import { NextResponse } from "next/server";
import { directusServer } from "@/lib/directus";
import { readItems, createItem } from "@directus/sdk";
import type {
  Activity,
  EducationProgram,
  Gender,
  RegistrationType,
  TargetGender,
} from "@/types/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── Validatie ──────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_GENDERS: ReadonlySet<Gender> = new Set<Gender>(["male", "female"]);
const ALLOWED_TARGET_GENDERS: ReadonlySet<TargetGender> =
  new Set<TargetGender>(["male", "female", "mixed"]);

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
  gender:      Gender;
  phone?:      string;
  age?:        number;
  notes?:      string;
}

function parseBody(
  raw: IncomingBody
): { ok: true; data: ParsedBody } | { ok: false; error: string } {
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

  // Gender — VERPLICHT en alleen male/female
  const gender = String(raw.gender || "").trim();
  if (!gender) {
    return { ok: false, error: "Geslacht is verplicht." };
  }
  if (!ALLOWED_GENDERS.has(gender as Gender)) {
    return { ok: false, error: "Ongeldige waarde voor geslacht. Kies 'Man' of 'Vrouw'." };
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
    gender:      gender as Gender,
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

  if (raw.notes !== undefined && raw.notes !== null && String(raw.notes).trim()) {
    const notes = String(raw.notes).trim();
    if (notes.length > 2000) return { ok: false, error: "Opmerkingen zijn te lang (max 2000 tekens)." };
    out.notes = notes;
  }

  return { ok: true, data: out };
}

/**
 * Normaliseer target_gender uit Directus — leeg/onbekend behandelen we als "mixed".
 */
function normalizeTargetGender(value: unknown): TargetGender {
  if (typeof value !== "string") return "mixed";
  const v = value.trim();
  if (!v) return "mixed";
  return ALLOWED_TARGET_GENDERS.has(v as TargetGender)
    ? (v as TargetGender)
    : "mixed";
}

// ─── Bron-lookup ────────────────────────────────────────────
interface SourceData {
  sourceCollection:    string;
  sourceId:            string;
  sourceTitle:         string;
  registrationEnabled: boolean;
  targetGender:        TargetGender;
}

async function findSource(
  type: RegistrationType,
  slug: string
): Promise<{ ok: true; data: SourceData } | { ok: false; status: number; error: string }> {
  try {
    if (type === "activity") {
      const result = await directusServer.request(
        readItems("activities", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          fields: ["id", "title", "registration_enabled", "target_gender"],
          limit:  1,
        })
      );
      const row = (result as Activity[])[0];
      if (!row) return { ok: false, status: 404, error: "Activiteit niet gevonden." };
      return {
        ok: true,
        data: {
          sourceCollection:    "activities",
          sourceId:            String(row.id),
          sourceTitle:         row.title,
          registrationEnabled: !!row.registration_enabled,
          targetGender:        normalizeTargetGender(row.target_gender),
        },
      };
    } else {
      const result = await directusServer.request(
        readItems("education_programs", {
          filter: { slug: { _eq: slug }, status: { _eq: "published" } } as never,
          fields: ["id", "title", "registration_enabled", "target_gender"],
          limit:  1,
        })
      );
      const row = (result as EducationProgram[])[0];
      if (!row) return { ok: false, status: 404, error: "Onderwijsprogramma niet gevonden." };
      return {
        ok: true,
        data: {
          sourceCollection:    "education_programs",
          sourceId:            String(row.id),
          sourceTitle:         row.title,
          registrationEnabled: !!row.registration_enabled,
          targetGender:        normalizeTargetGender(row.target_gender),
        },
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
  const src = source.data;

  if (!src.registrationEnabled) {
    return NextResponse.json(
      { error: "Inschrijven voor dit item is momenteel gesloten." },
      { status: 403 }
    );
  }

  // Geslacht moet passen bij doelgroep
  if (src.targetGender === "male" && body.gender !== "male") {
    return NextResponse.json(
      { error: "Deze inschrijving is alleen voor mannen." },
      { status: 403 }
    );
  }
  if (src.targetGender === "female" && body.gender !== "female") {
    return NextResponse.json(
      { error: "Deze inschrijving is alleen voor vrouwen." },
      { status: 403 }
    );
  }

  // Registratie schrijven
  // Geen relationele FK — bewust. Filtering en historie verlopen via
  // source_collection / source_id / source_slug / source_title.
  // Zie scripts/seed/steps/13-registration-relations.mjs voor de historie.
  try {
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
