// app/api/doneren/checkout/route.ts
//
// Maakt een Stripe Checkout Session voor donaties (eenmalig of maandelijks).
// Slaat een pending donation-record op in Directus, zodat we via webhook
// kunnen terugvinden welke session bij welk record hoort.
//
// Body:
//   {
//     type:        "one_time" | "monthly",
//     amount_cents: number,        // bedrag in eurocenten — minimum 100 (€1)
//     donor_name?:  string,
//     donor_email:  string,
//     message?:     string,
//   }
//
// Antwoord op succes:
//   { url: "https://checkout.stripe.com/..." }
//
// De client redirect daarheen (of we sturen de session terug en de client
// gebruikt stripe-js redirectToCheckout — beide is veilig).

import { NextResponse } from "next/server";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { directusServer, getDonationCampaignBySlug } from "@/lib/directus";
import { createItem } from "@directus/sdk";
import { formatEurFromCents, getSiteUrl } from "@/lib/utils";
import type { DonationType, DonationCampaign } from "@/types/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE          = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_AMOUNT_CENTS  = 100;       // €1
const MAX_AMOUNT_CENTS  = 5_000_00;  // €5.000 — sanity cap

interface IncomingBody {
  type?:          unknown;
  amount_cents?:  unknown;
  donor_name?:    unknown;
  donor_email?:   unknown;
  message?:       unknown;
  campaign_slug?: unknown;
}

interface ParsedBody {
  type:           DonationType;
  amount_cents:   number;
  donor_name:     string;
  donor_email:    string;
  message?:       string;
  campaign_slug?: string;
}

function parseBody(
  raw: IncomingBody
): { ok: true; data: ParsedBody } | { ok: false; error: string } {
  const type = String(raw.type || "").trim();
  if (type !== "one_time" && type !== "monthly") {
    return { ok: false, error: "Ongeldig type. Verwacht 'one_time' of 'monthly'." };
  }

  const amount = Number(raw.amount_cents);
  if (!Number.isFinite(amount) || !Number.isInteger(amount)) {
    return { ok: false, error: "Ongeldig bedrag." };
  }
  if (amount < MIN_AMOUNT_CENTS) {
    return { ok: false, error: `Minimumbedrag is €${MIN_AMOUNT_CENTS / 100}.` };
  }
  if (amount > MAX_AMOUNT_CENTS) {
    return { ok: false, error: `Maximumbedrag online is €${MAX_AMOUNT_CENTS / 100}. Neem contact op voor grotere bedragen.` };
  }

  // Naam — VERPLICHT (lege string of alleen spaties wordt geweigerd)
  const name = String(raw.donor_name || "").trim();
  if (!name) {
    return { ok: false, error: "Vul uw naam in." };
  }
  if (name.length < 2) {
    return { ok: false, error: "Vul een geldige naam in." };
  }
  if (name.length > 200) {
    return { ok: false, error: "Naam is te lang." };
  }

  const email = String(raw.donor_email || "").trim();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return { ok: false, error: "Vul een geldig e-mailadres in." };
  }

  const out: ParsedBody = {
    type:         type as DonationType,
    amount_cents: amount,
    donor_name:   name,
    donor_email:  email,
  };

  if (raw.message !== undefined && String(raw.message).trim()) {
    const message = String(raw.message).trim();
    if (message.length > 1000) return { ok: false, error: "Bericht is te lang (max 1000 tekens)." };
    out.message = message;
  }

  if (raw.campaign_slug !== undefined && String(raw.campaign_slug).trim()) {
    const slug = String(raw.campaign_slug).trim();
    if (slug.length > 200) return { ok: false, error: "Campagne-slug is te lang." };
    out.campaign_slug = slug;
  }

  return { ok: true, data: out };
}

function getOrigin(request: Request): string {
  // 1) NEXT_PUBLIC_SITE_URL is altijd autoritatief als gezet
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  // 2) Anders: request-host als laatste vangnet (lokaal handig op andere poorten)
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.host}`;
  } catch {
    return getSiteUrl();
  }
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Donaties zijn op dit moment niet beschikbaar. Neem contact op met de moskee." },
      { status: 503 }
    );
  }
  if (!process.env.DIRECTUS_TOKEN) {
    return NextResponse.json(
      { error: "Donaties zijn op dit moment niet beschikbaar. Neem contact op met de moskee." },
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

  // ─── Campagne ophalen + valideren (optioneel) ─────────────
  let campaign: DonationCampaign | null = null;
  if (body.campaign_slug) {
    campaign = await getDonationCampaignBySlug(body.campaign_slug);
    if (!campaign) {
      return NextResponse.json(
        { error: "Donatiedoel niet gevonden of niet beschikbaar." },
        { status: 404 }
      );
    }
    if (body.type === "one_time" && !campaign.allow_one_time) {
      return NextResponse.json(
        { error: "Voor dit doel zijn eenmalige donaties niet beschikbaar." },
        { status: 400 }
      );
    }
    if (body.type === "monthly" && !campaign.allow_monthly) {
      return NextResponse.json(
        { error: "Voor dit doel zijn maandelijkse donaties niet beschikbaar." },
        { status: 400 }
      );
    }
  }

  const campaignTitle = campaign?.title ?? "Algemene donatie";
  const campaignSlug  = campaign?.slug  ?? "";
  const campaignId    = campaign?.id    ?? null;

  const origin = getOrigin(request);

  // ─── Stripe Checkout Session aanmaken ─────────────────────
  const amountDisplay = formatEurFromCents(body.amount_cents);

  // Gedeelde metadata voor zowel Checkout Session als PI/Subscription —
  // zo verschijnt alles ook in het Stripe Dashboard bij elke layer.
  const sharedMetadata: Record<string, string> = {
    donation_type:  body.type,
    donor_name:     body.donor_name,
    donor_email:    body.donor_email,
    amount_cents:   String(body.amount_cents),
    amount_display: amountDisplay,
    source:         "website",
    campaign_id:    campaignId !== null ? String(campaignId) : "",
    campaign_slug:  campaignSlug,
    campaign_title: campaignTitle,
  };

  let session;
  try {
    if (body.type === "one_time") {
      const stripe = getStripe();
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        // iDEAL voor NL + card voor internationale donaties.
        // Stripe toont alleen relevante methodes voor de browser-locale.
        payment_method_types: ["ideal", "card"],
        line_items: [
          {
            price_data: {
              currency:      "eur",
              unit_amount:   body.amount_cents,
              product_data: {
                name:        campaign ? campaignTitle : "Donatie aan DawahCommissie Al-Ghofraan",
                description: campaign ? "Eenmalige donatie" : "Eenmalige algemene donatie",
              },
            },
            quantity: 1,
          },
        ],
        customer_email: body.donor_email,
        success_url:    `${origin}/doneren/succes?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:     `${origin}/doneren?geannuleerd=1`,
        metadata:       sharedMetadata,
        payment_intent_data: {
          description: `Donatie ${amountDisplay} — ${body.donor_name}`,
          metadata: {
            ...sharedMetadata,
            ...(body.message ? { message: body.message.slice(0, 500) } : {}),
          },
        },
        ...(body.message
          ? {
              custom_text: {
                submit: { message: "Bedankt voor uw bijdrage." },
              },
            }
          : {}),
      });
    } else {
      // monthly = subscription. Voor Nederlandse donateurs gebruiken we
      // het iDEAL → SEPA Direct Debit pad: de eerste betaling loopt via
      // iDEAL (donor authenticeert bij eigen bank), Stripe slaat tijdens
      // die transactie automatisch het IBAN op als SEPA Direct Debit
      // payment method, en alle volgende maand-afschrijvingen lopen via
      // SEPA Direct Debit. `sepa_debit` is ook expliciet beschikbaar als
      // de donor het IBAN direct wil invoeren zonder eerst via iDEAL te
      // gaan. `card` blijft als fallback voor internationale donateurs.
      //
      // Vereisten in Stripe Dashboard (LIVE mode):
      //   - SEPA Direct Debit moet geactiveerd zijn
      //   - iDEAL moet geactiveerd zijn (was al het geval voor eenmalig)
      // Zonder die activatie weigert Stripe de Checkout Session.
      const stripe = getStripe();
      session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["ideal", "sepa_debit", "card"],
        line_items: [
          {
            price_data: {
              currency:    "eur",
              unit_amount: body.amount_cents,
              recurring:   { interval: "month" },
              product_data: {
                name: campaign
                  ? `${campaignTitle} (maandelijks)`
                  : "Maandelijkse donatie aan DawahCommissie Al-Ghofraan",
              },
            },
            quantity: 1,
          },
        ],
        customer_email: body.donor_email,
        success_url:    `${origin}/doneren/succes?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:     `${origin}/doneren?geannuleerd=1`,
        metadata:       sharedMetadata,
        subscription_data: {
          description: `Maandelijkse donatie ${amountDisplay} — ${body.donor_name}`,
          metadata: {
            ...sharedMetadata,
            ...(body.message ? { message: body.message.slice(0, 500) } : {}),
          },
        },
      });
    }
  } catch (err) {
    console.error("[doneren] Stripe session aanmaken mislukt:", err);
    return NextResponse.json(
      { error: "Kon de betaling niet starten. Probeer het later opnieuw." },
      { status: 502 }
    );
  }

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe gaf geen redirect-url terug." },
      { status: 502 }
    );
  }

  // ─── Pending donation in Directus ─────────────────────────
  try {
    await directusServer.request(
      createItem("donations", {
        type:              body.type,
        status:            "pending",
        amount:            body.amount_cents,
        amount_display:    amountDisplay,
        currency:          "eur",
        donor_name:        body.donor_name,
        donor_email:       body.donor_email,
        message:           body.message ?? null,
        stripe_session_id: session.id,
        campaign:          campaignId,
        campaign_slug:     campaignSlug || null,
        campaign_title:    campaignTitle,
      } as never)
    );
  } catch (err) {
    // Niet-fataal: logging volstaat. We willen de donor niet blokkeren omdat
    // Directus niet bereikbaar was — Stripe blijft de bron van waarheid en
    // de webhook kan het record alsnog (re)creëren als het er niet is.
    console.error("[doneren] pending donation opslaan mislukt:", err);
  }

  return NextResponse.json({ url: session.url, session_id: session.id });
}
