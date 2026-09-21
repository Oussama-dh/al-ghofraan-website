// scripts/seed/steps/66-hifdh-email-sender.mjs
//
// Eigen afzender voor de bevestigingsmail van het Hifdh programma (Baraa'im).
// Voegt twee optionele velden toe aan site_settings:
//
//   hifdh_email_from_name  — afzendernaam (leeg = "Baraa'im")
//   hifdh_email_reply_to   — antwoordadres (leeg = email_from_address)
//
// Het technische From-adres blijft de SMTP-mailbox (cPanel weigert andere
// adressen); naam en Reply-To zijn hier beheerbaar. Idempotent: bestaande
// velden en waarden blijven ongemoeid.

import { ensureField } from "../lib/helpers.mjs";

export async function setupHifdhEmailSender(client) {
  console.log("\n✉️  Stap 66 · Hifdh (Baraa'im) afzender in site_settings");

  await ensureField(client, "site_settings", {
    field: "hifdh_email_from_name",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Afzendernaam van de bevestigingsmail voor het Hifdh programma. Leeg = \"Baraa'im\".",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "hifdh_email_reply_to",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Antwoordadres (Reply-To) van de Hifdh-bevestigingsmail. Leeg = het algemene afzenderadres.",
    },
    schema: {},
  });

  console.log("✓ Stap 66 voltooid");
}
