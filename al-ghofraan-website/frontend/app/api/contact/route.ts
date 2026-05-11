// app/api/contact/route.ts
//
// POST /api/contact
// Slaat een bericht op in contact_messages via DIRECTUS_TOKEN.
// Bevat een eenvoudige honeypot ('website' veld dat een bot zou invullen
// maar een mens niet, want het is hidden).

import { NextResponse } from "next/server";
import { directusServer, getContactSubjects, getSiteSettings } from "@/lib/directus";
import { createItem } from "@directus/sdk";
import { notifyContact } from "@/lib/server/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface IncomingBody {
  name?:    unknown;
  email?:   unknown;
  phone?:   unknown;
  subject?: unknown;
  message?: unknown;
  consent?: unknown;
  /** Honeypot — moet leeg blijven */
  website?: unknown;
}

interface ParsedBody {
  name:    string;
  email:   string;
  subject: string;
  message: string;
  phone?:  string;
}

function parseBody(
  raw: IncomingBody
): { ok: true; data: ParsedBody } | { ok: false; error: string } {
  // Honeypot: als dit veld is ingevuld, is het vrijwel zeker een bot.
  // We geven geen specifieke foutmelding — alleen een algemene 400.
  if (raw.website !== undefined && String(raw.website).trim()) {
    return { ok: false, error: "Bericht kon niet worden verzonden." };
  }

  const name = String(raw.name || "").trim();
  if (name.length < 2 || name.length > 200) {
    return { ok: false, error: "Vul een geldige naam in." };
  }

  const email = String(raw.email || "").trim();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }

  const subject = String(raw.subject || "").trim();
  if (subject.length < 2 || subject.length > 200) {
    return { ok: false, error: "Vul een onderwerp in." };
  }

  const message = String(raw.message || "").trim();
  if (message.length < 5 || message.length > 5000) {
    return { ok: false, error: "Vul een bericht in (minimaal 5, maximaal 5000 tekens)." };
  }

  if (raw.consent !== true) {
    return { ok: false, error: "Akkoord met verwerking van uw gegevens is verplicht." };
  }

  const out: ParsedBody = { name, email, subject, message };

  if (raw.phone !== undefined && raw.phone !== null && String(raw.phone).trim()) {
    const phone = String(raw.phone).trim();
    if (phone.length > 50) return { ok: false, error: "Telefoonnummer is te lang." };
    out.phone = phone;
  }

  return { ok: true, data: out };
}

export async function POST(request: Request) {
  if (!process.env.DIRECTUS_TOKEN) {
    console.error("[contact] DIRECTUS_TOKEN ontbreekt in environment");
    return NextResponse.json(
      { error: "Het contactformulier is op dit moment niet beschikbaar." },
      { status: 503 }
    );
  }

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

  // ─── Subject server-side valideren tegen contact_subjects ──────
  // Strategie:
  //   - Lijst leeg of fetch faalt → vrije tekst toestaan (backwards compat
  //     voor sites waar de seed nog niet is gedraaid).
  //   - Lijst niet leeg → ingestuurd subject moet matchen op `value` óf `label`
  //     (case-insensitive). Geen match = 400.
  //   - Bij match → normaliseer naar `label` zodat de admin altijd nette
  //     weergave krijgt in `contact_messages`.
  let subjectToStore = body.subject;
  try {
    const subjects = await getContactSubjects();
    if (subjects.length > 0) {
      const incoming = body.subject.trim().toLowerCase();
      const match = subjects.find(
        (s) =>
          s.value.toLowerCase() === incoming ||
          s.label.toLowerCase() === incoming,
      );
      if (!match) {
        return NextResponse.json(
          { error: "Kies een geldig onderwerp uit de lijst." },
          { status: 400 },
        );
      }
      subjectToStore = match.label;
    }
  } catch (err) {
    // Validatie-lookup faalt = niet-blokkerend; we slaan dan op met de ruwe
    // tekst. Honeypot + length-check hebben we al gedaan, dus zelfs zonder
    // validatie is er geen aanvalsvector.
    console.warn("[contact] subject-validatie overgeslagen:", err);
  }

  try {
    await directusServer.request(
      createItem("contact_messages", {
        name:    body.name,
        email:   body.email,
        phone:   body.phone ?? null,
        subject: subjectToStore,
        message: body.message,
        status:  "new",
      } as never)
    );

    // ─── Admin-notificatie (fail-soft, no-op zolang feature uit) ─
    // De helper verstuurt in deze delivery geen echte mail; hij logt
    // alleen in dev. Try/catch eromheen om hoe-dan-ook te zorgen dat
    // een eventuele toekomstige verzendfout NOOIT de respons blokkeert
    // — het bericht is al netjes opgeslagen.
    try {
      const settings = await getSiteSettings();
      await notifyContact(settings, {
        name:    body.name,
        email:   body.email,
        phone:   body.phone ?? null,
        subject: subjectToStore,
        message: body.message,
      });
    } catch (notifyErr) {
      console.warn("[contact] admin-notificatie overgeslagen:", notifyErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[contact] opslaan mislukt:", err);
    return NextResponse.json(
      { error: "Bericht kon niet worden opgeslagen. Probeer het later opnieuw." },
      { status: 500 }
    );
  }
}
