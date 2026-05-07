// lib/stripe.ts
//
// Server-side Stripe-client. NOOIT importeren in client components.
// STRIPE_SECRET_KEY mag nooit in de client bundle komen.
//
// Belangrijk:
// We maken de Stripe-client lazy aan via getStripe().
// Daardoor faalt npm run build niet als STRIPE_SECRET_KEY nog ontbreekt.
// De API-routes geven dan netjes 503 terug.

import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY ontbreekt");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey, {
      typescript: true,
      appInfo: {
        name: "al-ghofraan-website",
        version: "1.0.0",
      },
    });
  }

  return stripeClient;
}