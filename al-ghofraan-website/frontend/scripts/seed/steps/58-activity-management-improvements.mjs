// scripts/seed/steps/58-activity-management-improvements.mjs
//
// Delivery 58 — Activiteitenbeheer-verbeteringen:
//
//   1. Nieuw veld `activities.registration_closes_at` (datetime, optional).
//      Beheerder kan expliciet een sluit-moment instellen voor inschrijvingen.
//      Fallback (alleen voor niet-recurring): `start_date`.
//      Recurring activiteiten: blijven open tenzij dit veld expliciet
//      wordt gevuld (een wekelijkse cursus heeft geen globale sluit-datum).
//
//   2. Update field-notes op bestaande activity-velden waar nuttig:
//      - registration_enabled  (master-toggle context)
//      - max_registrations     (verwijzing naar nieuwe sluit-flow)
//
// Géén nieuwe collecties.
// Géén schema-migratie van bestaande velden.
// Géén wijziging aan permissions (Activiteiten beheerder behoudt
// bestaande CRU op activities; nieuwe veld erft automatisch in).
//
// HARDE GARANTIES:
//   - Idempotent (tweede run = no-op).
//   - Stap 37 niet aangeraakt.
//   - Stap 40 (page_sections) niet aangeraakt.
//   - Stap 25/30/46 rollen niet aangeraakt.
//   - Bestaande check-in flow ongewijzigd.
//   - Donatieflow, TV-route, hadieth-series, Stripe, mails: niet geraakt.

import { ensureField } from "../lib/helpers.mjs";

const COLLECTION = "activities";

export async function setupActivityManagementImprovements(client) {
  console.log("\n📅 Stap 58 · activiteitenbeheer verbeteringen (registration_closes_at)");

  // ─── 1. activities.registration_closes_at ─────────────────────
  await ensureField(client, COLLECTION, {
    field: "registration_closes_at",
    type:  "timestamp",
    meta: {
      width:     "half",
      interface: "datetime",
      note:
        "Optioneel — datum en tijd waarop het inschrijfformulier " +
        "automatisch dicht gaat (Europe/Amsterdam). " +
        "\n\nGedrag:" +
        "\n• Leeg + eenmalige activiteit → formulier sluit automatisch " +
        "bij 'start_date' (begin activiteit). " +
        "\n• Leeg + terugkerende activiteit (is_recurring=true) → " +
        "formulier blijft open totdat je dit veld expliciet vult. " +
        "\n• Gevuld → formulier sluit op het ingevulde moment, " +
        "ongeacht recurring of niet. " +
        "\n\nBezoeker krijgt na sluiting: 'Inschrijving is gesloten'. " +
        "Bestaande inschrijvingen blijven gewoon zichtbaar in Directus.",
    },
    schema: {},
  });

  // ─── 2. Field-note-update op bestaande velden ──────────────────
  await patchFieldNote(client, COLLECTION, "registration_enabled",
    "Master-toggle: aan = inschrijfformulier kan getoond worden op " +
    "/agenda/[slug]. Uit = nooit zichtbaar. " +
    "\n\nAan + automatische sluiting (via 'registration_closes_at' of " +
    "'start_date' voor eenmalige activiteiten) → formulier verdwijnt " +
    "automatisch na sluit-moment. " +
    "\n\nGebruik 'max_registrations' voor een capaciteits-limiet " +
    "en 'registration_closes_at' voor een tijdslimiet — beide werken " +
    "naast elkaar.",
  );

  await patchFieldNote(client, COLLECTION, "max_registrations",
    "Capaciteits-limiet — maximum aantal inschrijvingen. " +
    "Leeg/0 = onbeperkt. Server-side afgedwongen. " +
    "\n\nBij volle activiteit toont de site 'Deze activiteit zit vol' " +
    "in plaats van het formulier. " +
    "\n\nPer occurrence-telling voor terugkerende activiteiten — " +
    "elke datum heeft eigen capaciteit. " +
    "\n\nWerkt naast 'registration_closes_at': bij volle activiteit + " +
    "gesloten registratie wint de 'vol'-melding.",
  );

  console.log("✓ Stap 58 voltooid");
}

// ─── Helper: patch alleen meta.note (zelfde patroon als stap 55) ──

async function patchFieldNote(client, collection, fieldName, newNote) {
  let field;
  try {
    const res = await client.get(`/fields/${collection}/${fieldName}`);
    field = res?.data;
  } catch (err) {
    console.log(
      `  ⚠ veld "${collection}.${fieldName}" niet gevonden (${err.message}) — note-update overgeslagen`,
    );
    return;
  }
  if (!field || !field.meta) {
    console.log(`  ⚠ veld "${collection}.${fieldName}" heeft geen meta — overgeslagen`);
    return;
  }
  if ((field.meta.note ?? "") === newNote) {
    console.log(`  · veld "${collection}.${fieldName}" note al up-to-date`);
    return;
  }
  try {
    await client.patch(`/fields/${collection}/${fieldName}`, {
      meta: { note: newNote },
    });
    console.log(`  ↻ veld "${collection}.${fieldName}" note bijgewerkt`);
  } catch (err) {
    console.log(`  ⚠ PATCH note voor "${collection}.${fieldName}" faalde: ${err.message}`);
  }
}
