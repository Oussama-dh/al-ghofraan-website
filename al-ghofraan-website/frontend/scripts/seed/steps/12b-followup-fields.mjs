// scripts/seed/steps/12b-followup-fields.mjs
//
// Voegt opvolgvelden toe aan zowel `contact_messages` als `registrations`.
// Doel: beheerders kunnen in Directus een conceptreactie opbouwen,
// notities toevoegen, vastleggen wie het oppakt en wanneer er voor het
// laatst contact is geweest. Antwoorden gebeurt voorlopig nog handmatig
// via het eigen mailprogramma — deze velden zijn puur voor administratie.
//
// Idempotent — `ensureField` controleert of een veld al bestaat. Daardoor
// breken bestaande records nooit en kan de seed elke keer veilig draaien.
//
// BEWUST géén automatische e-mailverzending, géén SMTP, géén extension.

import { ensureField } from "../lib/helpers.mjs";

const FOLLOWUP_FIELDS = [
  {
    field: "internal_notes",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Interne notities voor de DawahCommissie — niet zichtbaar voor de afzender. " +
        "Bijvoorbeeld: 'gebeld op 12-05, niet bereikt' of 'is al ingeschreven via WhatsApp'.",
    },
    schema: {},
  },
  {
    field: "last_contacted_at",
    type:  "timestamp",
    meta: {
      width:     "half",
      interface: "datetime",
      note:      "Wanneer was er voor het laatst contact? Handmatig invullen na een reactie.",
    },
    schema: {},
  },
  {
    field: "handled_by",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Naam of initialen van wie deze opvolgt (bv. 'AH').",
    },
    schema: {},
  },
  {
    field: "reply_subject",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Conceptonderwerp voor je antwoord. Kopieer dit later naar je eigen mailprogramma.",
    },
    schema: {},
  },
  {
    field: "reply_draft",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Conceptreactie. Hier kun je rustig je antwoord opbouwen. " +
        "Wanneer je tevreden bent, kopieer je hem naar je eigen e-mailclient om te versturen. " +
        "Zet de status daarna op 'Beantwoord' en vul 'last_contacted_at' in.",
    },
    schema: {},
  },
];

const COLLECTIONS = ["contact_messages", "registrations"];

export async function setupFollowupFields(client) {
  console.log("\n📥 Stap 12b · opvolgvelden voor contact_messages + registrations");

  for (const collection of COLLECTIONS) {
    for (const field of FOLLOWUP_FIELDS) {
      try {
        await ensureField(client, collection, field);
      } catch (err) {
        // Collectie bestaat nog niet? Wordt eerder in seed aangemaakt
        // (stap 12 voor registrations, stap 17 voor contact_messages).
        // Hier loggen we alleen — non-blocking.
        console.warn(`  ⚠️  ${collection}.${field.field}: ${err.message}`);
      }
    }
  }

  console.log("✓ Stap 12b voltooid");
}
