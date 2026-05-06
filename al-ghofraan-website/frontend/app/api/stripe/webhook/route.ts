// app/api/stripe/webhook/route.ts
//
// Stripe webhook handler. Verifieert de signature en werkt het bijbehorende
// donations-record bij in Directus.
//
// Setup:
//   1. Stripe Dashboard → Developers → Webhooks → Add endpoint
//      URL: https://<domain>/api/stripe/webhook
//   2. Selecteer events:
//        checkout.session.completed
//        checkout.session.expired
//        invoice.payment_succeeded
//        invoice.payment_failed
//        customer.subscription.deleted
//   3. Kopieer de Signing secret naar STRIPE_WEBHOOK_SECRET in .env

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { directusServer } from "@/lib/directus";
import { readItems, updateItem, createItem } from "@directus/sdk";
import { formatEurFromCents } from "@/lib/utils";
import type { Donation, DonationStatus } from "@/types/directus";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stripe signature-verificatie heeft de raw body nodig — Next.js zet
// `runtime = nodejs` + we lezen via request.text() (niet .json()).

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

async function findDonationBySessionId(sessionId: string): Promise<Donation | null> {
  try {
    const result = await directusServer.request(
      readItems("donations", {
        filter: { stripe_session_id: { _eq: sessionId } } as never,
        limit:  1,
      })
    );
    return ((result as Donation[])[0]) ?? null;
  } catch (err) {
    console.error("[stripe-webhook] zoeken op session_id mislukt:", err);
    return null;
  }
}

async function findDonationBySubscriptionId(subId: string): Promise<Donation | null> {
  try {
    const result = await directusServer.request(
      readItems("donations", {
        filter: { stripe_subscription_id: { _eq: subId } } as never,
        limit:  1,
      })
    );
    return ((result as Donation[])[0]) ?? null;
  } catch (err) {
    console.error("[stripe-webhook] zoeken op subscription_id mislukt:", err);
    return null;
  }
}

async function patchDonation(id: string, patch: Partial<Donation>) {
  try {
    await directusServer.request(updateItem("donations", id, patch as never));
  } catch (err) {
    console.error(`[stripe-webhook] patch donation ${id} mislukt:`, err);
  }
}

/**
 * Maak een donation-record aan voor een binnenkomend Stripe-event waarvoor
 * we (nog) geen pending record hebben — bijvoorbeeld bij een herstart.
 */
async function createDonationFromSession(
  session: Stripe.Checkout.Session
): Promise<string | null> {
  try {
    const type   = session.mode === "subscription" ? "monthly" : "one_time";
    const amount =
      typeof session.amount_total === "number" ? session.amount_total : 0;
    const created = await directusServer.request(
      createItem("donations", {
        type,
        status:            "pending",
        amount,
        amount_display:    formatEurFromCents(amount),
        currency:          (session.currency || "eur").toLowerCase(),
        donor_name:        (session.metadata?.donor_name as string) || null,
        donor_email:
          session.customer_email ||
          (session.metadata?.donor_email as string) ||
          (session.customer_details?.email as string) ||
          "",
        stripe_session_id: session.id,
      } as never)
    );
    return (created as { id?: string })?.id ?? null;
  } catch (err) {
    console.error("[stripe-webhook] alsnog creëren van donation mislukt:", err);
    return null;
  }
}

// ─── Handlers per event ─────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session, rawEvent: unknown) {
  let donation = await findDonationBySessionId(session.id);

  if (!donation) {
    const newId = await createDonationFromSession(session);
    if (!newId) return;
    donation = await findDonationBySessionId(session.id);
    if (!donation) return;
  }

  const isSubscription = session.mode === "subscription";
  const status: DonationStatus = isSubscription ? "active" : "paid";

  const piId = (typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id) ?? null;

  const subId = (typeof session.subscription === "string"
    ? session.subscription
    : session.subscription?.id) ?? null;

  const customerId = (typeof session.customer === "string"
    ? session.customer
    : session.customer?.id) ?? null;

  // Definitief bedrag (kan in subscription mode anders binnenkomen).
  const finalAmount = typeof session.amount_total === "number"
    ? session.amount_total
    : donation.amount;

  // donor_name: behoud wat in pending stond; alleen aanvullen als 't ontbreekt
  const finalDonorName =
    donation.donor_name ||
    (session.metadata?.donor_name as string) ||
    (session.customer_details?.name as string) ||
    null;

  // donor_email: aanvullen vanuit Stripe als 't ontbreekt
  const finalDonorEmail =
    donation.donor_email ||
    session.customer_email ||
    (session.customer_details?.email as string) ||
    (session.metadata?.donor_email as string) ||
    "";

  await patchDonation(donation.id, {
    status,
    paid_at:                  new Date().toISOString(),
    stripe_payment_intent_id: piId,
    stripe_subscription_id:   subId,
    stripe_customer_id:       customerId,
    raw_event:                rawEvent as Record<string, unknown>,
    amount:                   finalAmount,
    amount_display:           formatEurFromCents(finalAmount),
    donor_name:               finalDonorName,
    donor_email:              finalDonorEmail,
  });
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session, rawEvent: unknown) {
  const donation = await findDonationBySessionId(session.id);
  if (!donation) return;
  await patchDonation(donation.id, {
    status:    "cancelled",
    raw_event: rawEvent as Record<string, unknown>,
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice, rawEvent: unknown) {
  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id;
  if (!subId) return;

  const donation = await findDonationBySubscriptionId(subId);
  if (!donation) {
    // Eerste factuur kan binnenkomen vóór checkout.session.completed is verwerkt.
    // We negeren deze stilletjes — checkout.session.completed regelt de status.
    return;
  }

  await patchDonation(donation.id, {
    status:    "active",
    paid_at:   new Date().toISOString(),
    raw_event: rawEvent as Record<string, unknown>,
  });
}

async function handleInvoiceFailed(invoice: Stripe.Invoice, rawEvent: unknown) {
  const subId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription?.id;
  if (!subId) return;

  const donation = await findDonationBySubscriptionId(subId);
  if (!donation) return;

  await patchDonation(donation.id, {
    status:    "failed",
    raw_event: rawEvent as Record<string, unknown>,
  });
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription, rawEvent: unknown) {
  const donation = await findDonationBySubscriptionId(sub.id);
  if (!donation) return;
  await patchDonation(donation.id, {
    status:    "ended",
    raw_event: rawEvent as Record<string, unknown>,
  });
}

// ─── POST handler ───────────────────────────────────────────

export async function POST(request: Request) {
  if (!isStripeConfigured() || !WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Webhook niet geconfigureerd." },
      { status: 503 }
    );
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Ontbrekende stripe-signature header." }, { status: 400 });
  }

  // Raw body lezen voor signature-verificatie
  const rawBody = await request.text();

  let event: Stripe.Event;
  if (!isStripeConfigured()) {
  return NextResponse.json(
    { error: "Stripe is niet geconfigureerd." },
    { status: 503 }
  );
}

const stripe = getStripe();
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "onbekende fout";
    console.error("[stripe-webhook] signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook signature ongeldig: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, event);
        break;

      case "checkout.session.expired":
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session, event);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaid(event.data.object as Stripe.Invoice, event);
        break;

      case "invoice.payment_failed":
        await handleInvoiceFailed(event.data.object as Stripe.Invoice, event);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, event);
        break;

      default:
        // Andere events negeren we expliciet — zo blijft de webhook tolerant
        // wanneer Stripe nieuwe event types stuurt.
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler ${event.type} failed:`, err);
    // 200 teruggeven zodat Stripe niet in retry-storm gaat voor onze fouten.
    // Logs in serverlogs/Directus zijn voldoende voor diagnostiek.
  }

  return NextResponse.json({ received: true });
}
