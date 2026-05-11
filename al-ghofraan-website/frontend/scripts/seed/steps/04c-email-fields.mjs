// scripts/seed/steps/04c-email-fields.mjs
//
// Voegt e-mail-notificatie velden toe aan site_settings. De velden
// zelf zijn pure configuratie — er wordt in DEZE delivery nog GEEN
// echte mail verstuurd. We bereiden alleen de UI + plumbing voor.
//
// Defaults zijn zo gekozen dat de feature standaard UIT staat:
//   email_notifications_enabled = false
//   alle adres-velden           = leeg
//
// Hierdoor breekt een lokale dev-omgeving of een productie-omgeving
// zonder e-mailprovider nooit op een inschrijfformulier.

import { ensureField } from "../lib/helpers.mjs";

export async function setupEmailFields(client) {
  console.log("\n✉️  Stap 4c · E-mailnotificatie-velden op site_settings");

  await ensureField(client, "site_settings", {
    field: "email_notifications_enabled",
    type:  "boolean",
    meta: {
      width:     "full",
      interface: "boolean",
      note:
        "Master-schakelaar. Standaard uit — in deze delivery is er nog GEEN " +
        "verzendkanaal aangesloten, dus zelfs op 'aan' gebeurt er niets " +
        "behalve een log-melding in de server-console. Latere delivery sluit " +
        "een echte e-mailprovider aan (Brevo, Resend, Postmark of SMTP-relay " +
        "via nodemailer).",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, "site_settings", {
    field: "email_from_name",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Afzender-naam voor latere e-mails (bv. 'Al-Ghofraan notificatie').",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "email_from_address",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Afzender-e-mailadres voor latere e-mails.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "notification_email_contact",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Adres dat later een melding krijgt bij elke nieuwe contactmelding. Leeg = geen mail.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "notification_email_education",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Adres dat later een melding krijgt bij elke nieuwe onderwijsinschrijving. Leeg = geen mail.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "notification_email_activities",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Adres dat later een melding krijgt bij elke nieuwe activiteit-inschrijving. Leeg = geen mail.",
    },
    schema: {},
  });

  await ensureField(client, "site_settings", {
    field: "notification_email_donations",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Adres voor donatie-notificaties — gereserveerd voor toekomstige fase.",
    },
    schema: {},
  });

  console.log("✓ Stap 4c voltooid");
}
