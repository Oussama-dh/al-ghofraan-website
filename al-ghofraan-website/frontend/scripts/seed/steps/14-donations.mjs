// scripts/seed/steps/14-donations.mjs
//
// Maakt de donations collectie aan (idempotent).
// Gevuld via Stripe Checkout flow + webhook — geen public access.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

export async function setupDonations(client) {
  console.log("\n💚 Stap 14 · donations collectie");

  await ensureCollection(client, {
    collection: "donations",
    meta: {
      icon:             "favorite",
      note:             "Donaties via Stripe Checkout. Stripe blijft bron van waarheid; deze tabel is voor overzicht.",
      display_template: "{{donor_email}} — €{{amount}} ({{type}})",
      sort_field:       "-created_at",
      archive_field:    "status",
      archive_value:    "ended",
      unarchive_value:  "active",
    },
    schema: {},
  });

  await ensureField(client, "donations", {
    field: "type",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      required:  true,
      options: {
        choices: [
          { text: "Eenmalig",   value: "one_time" },
          { text: "Maandelijks", value: "monthly" },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Eenmalig",   value: "one_time", foreground: "#FFFFFF", background: "#3A6F8F" },
          { text: "Maandelijks", value: "monthly", foreground: "#FFFFFF", background: "#2ECDA7" },
        ],
      },
      readonly: true,
    },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "donations", {
    field: "status",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      required:  true,
      options: {
        choices: [
          { text: "In afwachting",  value: "pending"   },
          { text: "Betaald",         value: "paid"      },
          { text: "Mislukt",         value: "failed"    },
          { text: "Geannuleerd",     value: "cancelled" },
          { text: "Actief abonnement", value: "active"  },
          { text: "Beëindigd",       value: "ended"     },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "In afwachting",  value: "pending",   foreground: "#18222F", background: "#E0C77A" },
          { text: "Betaald",         value: "paid",      foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Mislukt",         value: "failed",    foreground: "#FFFFFF", background: "#E35D6A" },
          { text: "Geannuleerd",     value: "cancelled", foreground: "#FFFFFF", background: "#A2B5CD" },
          { text: "Actief abonnement", value: "active",  foreground: "#FFFFFF", background: "#3A6F8F" },
          { text: "Beëindigd",       value: "ended",     foreground: "#FFFFFF", background: "#7E5A3A" },
        ],
      },
    },
    schema:{ default_value: "pending", is_nullable: false },
  });

  await ensureField(client, "donations", {
    field: "amount",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      required:  true,
      note:      "Bedrag in eurocenten (bv. 500 = €5,00)",
      readonly:  true,
    },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "donations", {
    field: "currency",
    type:  "string",
    meta:  { width: "half", interface: "input", readonly: true },
    schema:{ default_value: "eur", is_nullable: false },
  });

  await ensureField(client, "donations", {
    field: "donor_name",
    type:  "string",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "donations", {
    field: "donor_email",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "donations", {
    field: "message",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline" },
    schema:{},
  });

  await ensureField(client, "donations", {
    field: "stripe_session_id",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      readonly:  true,
      note:      "Stripe Checkout session id. Gebruik dit om de donatie in het Stripe Dashboard te zoeken.",
    },
    schema:{ is_unique: true },
  });

  await ensureField(client, "donations", {
    field: "stripe_payment_intent_id",
    type:  "string",
    meta:  { width: "half", interface: "input", readonly: true },
    schema:{},
  });

  await ensureField(client, "donations", {
    field: "stripe_subscription_id",
    type:  "string",
    meta:  { width: "half", interface: "input", readonly: true },
    schema:{},
  });

  await ensureField(client, "donations", {
    field: "stripe_customer_id",
    type:  "string",
    meta:  { width: "full", interface: "input", readonly: true },
    schema:{},
  });

  await ensureField(client, "donations", {
    field: "raw_event",
    type:  "json",
    meta:  {
      width:     "full",
      interface: "input-code",
      options:   { language: "json" },
      readonly:  true,
      note:      "Laatste relevante Stripe webhook-payload — voor debugging.",
    },
    schema:{},
  });

  await ensureField(client, "donations", {
    field: "created_at",
    type:  "timestamp",
    meta:  {
      width:     "half",
      interface: "datetime",
      readonly:  true,
      special:   ["date-created"],
    },
    schema:{},
  });

  await ensureField(client, "donations", {
    field: "paid_at",
    type:  "timestamp",
    meta:  { width: "half", interface: "datetime", readonly: true },
    schema:{},
  });

  console.log("✓ Stap 14 voltooid");
}
