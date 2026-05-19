// scripts/seed/steps/35-visitor-confirmation-fields.mjs
//
// Delivery QR-Visitor-Mail — Bezoeker-bevestigingsmail velden.
//
// Voegt aan `site_settings` acht velden toe (4 per afdeling) zodat
// beheerders in Directus de bevestigingsmails kunnen schrijven die
// naar bezoekers gaan bij:
//   1. Onderwijsprogramma-inschrijvingen → education_confirmation_*
//   2. Activiteit-inschrijvingen          → activities_confirmation_*
//
// Beheerder heeft controle over:
//   - of de mail überhaupt verstuurd wordt   (..._enabled)
//   - de subject-regel                       (..._subject)
//   - een intro-tekst BOVEN de gegevens      (..._intro)
//   - een footer-tekst ONDER de gegevens     (..._footer)
//
// De ingevulde formuliergegevens worden door de code zelf tussen
// intro en footer ingevoegd (vaste structuur, geen placeholders die
// kapot kunnen). De beheerder hoeft dus geen mustache, geen {{naam}},
// geen template-engine — alleen vrije tekst.
//
// Voor activiteiten: als de inschrijving een `check_in_token` heeft,
// dan voegt de code automatisch een check-in URL toe vlak voor de
// footer. De beheerder hoeft daar niets voor te doen.
//
// MASTER-SCHAKELAAR INTERACTIE:
//   De bestaande `email_notifications_enabled` (stap 04c) blijft de
//   master-switch. Zelfs als ..._confirmation_email_enabled === true,
//   gebeurt er niets als de master uit staat. Zo houden we één
//   centrale "alle mail aan/uit" knop.
//
// Defaults staan AAN voor _enabled? NEE — bewust UIT (false). Beheerder
// moet eerst de teksten controleren in Directus voordat er mails
// uitgaan. Subject/intro/footer hebben WEL voorbeeldteksten als
// default, zodat de beheerder ziet welke toon verwacht wordt.
//
// Idempotent — bij een tweede seed-run worden defaults NIET opnieuw
// toegepast op bestaande velden (ensureField skipt als veld bestaat).
// Beheerder-edits blijven dus intact.

import { ensureField } from "../lib/helpers.mjs";

// ─── Standaard intro/footer tekst — vrije tekst, géén placeholders ─
//
// De code voegt automatisch onder de intro een blok met de
// ingevulde gegevens toe. De beheerder hoeft hier geen {{naam}} of
// {{programma}} in te zetten — die structuur staat vast in de code.

const EDUCATION_DEFAULT_INTRO =
  "Assalamu alaikum,\n" +
  "\n" +
  "Bedankt voor uw inschrijving bij Al-Ghofraan. Hieronder vindt u " +
  "een overzicht van de gegevens die u heeft ingevuld. Bewaar deze " +
  "mail goed.";

const EDUCATION_DEFAULT_FOOTER =
  "We nemen zo snel mogelijk contact met u op met meer informatie " +
  "over het onderwijsprogramma.\n" +
  "\n" +
  "Heeft u vragen? Neem dan gerust contact met ons op via de " +
  "website.\n" +
  "\n" +
  "Met vriendelijke groet,\n" +
  "DawahCommissie Al-Ghofraan";

const ACTIVITIES_DEFAULT_INTRO =
  "Assalamu alaikum,\n" +
  "\n" +
  "Bedankt voor uw inschrijving voor deze activiteit. Hieronder " +
  "vindt u een overzicht van de gegevens die u heeft ingevuld. " +
  "Bewaar deze mail goed.";

const ACTIVITIES_DEFAULT_FOOTER =
  "We zien u graag bij de activiteit.\n" +
  "\n" +
  "Heeft u vragen? Neem dan gerust contact met ons op via de " +
  "website.\n" +
  "\n" +
  "Met vriendelijke groet,\n" +
  "DawahCommissie Al-Ghofraan";

export async function setupVisitorConfirmationFields(client) {
  console.log("");
  console.log("35. Visitor-bevestigingsmail velden — onderwijs + activiteiten");

  // ─── Onderwijs ─────────────────────────────────────────────
  await ensureField(client, "site_settings", {
    field: "education_confirmation_email_enabled",
    type:  "boolean",
    meta: {
      width:     "full",
      interface: "boolean",
      note:
        "Stuur een bevestigingsmail naar de bezoeker bij een nieuwe " +
        "onderwijsinschrijving. Standaard uit — eerst de teksten " +
        "hieronder controleren. Vereist dat de algemene " +
        "'email_notifications_enabled' ook aan staat.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, "site_settings", {
    field: "education_confirmation_email_subject",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Onderwerp-regel van de bevestigingsmail. Bv: " +
        "'Bevestiging inschrijving onderwijsprogramma'.",
    },
    schema: {
      default_value: "Bevestiging inschrijving onderwijsprogramma",
    },
  });

  await ensureField(client, "site_settings", {
    field: "education_confirmation_email_intro",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Tekst BOVEN het overzicht van de inschrijfgegevens. De " +
        "ingevulde gegevens worden automatisch onder deze tekst " +
        "toegevoegd door het systeem.",
    },
    schema: { default_value: EDUCATION_DEFAULT_INTRO },
  });

  await ensureField(client, "site_settings", {
    field: "education_confirmation_email_footer",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Tekst ONDER het overzicht van de inschrijfgegevens. Bv. " +
        "een vriendelijke afsluiting en contactinformatie.",
    },
    schema: { default_value: EDUCATION_DEFAULT_FOOTER },
  });

  // ─── Activiteiten ──────────────────────────────────────────
  await ensureField(client, "site_settings", {
    field: "activities_confirmation_email_enabled",
    type:  "boolean",
    meta: {
      width:     "full",
      interface: "boolean",
      note:
        "Stuur een bevestigingsmail naar de bezoeker bij een nieuwe " +
        "activiteit-inschrijving. Standaard uit — eerst de teksten " +
        "hieronder controleren. Vereist dat de algemene " +
        "'email_notifications_enabled' ook aan staat. Als de " +
        "inschrijving een check-in token heeft, wordt automatisch " +
        "een check-in link toegevoegd vóór de footer.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, "site_settings", {
    field: "activities_confirmation_email_subject",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:
        "Onderwerp-regel van de bevestigingsmail. Bv: " +
        "'Bevestiging inschrijving activiteit'.",
    },
    schema: {
      default_value: "Bevestiging inschrijving activiteit",
    },
  });

  await ensureField(client, "site_settings", {
    field: "activities_confirmation_email_intro",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Tekst BOVEN het overzicht van de inschrijfgegevens. De " +
        "ingevulde gegevens worden automatisch onder deze tekst " +
        "toegevoegd door het systeem.",
    },
    schema: { default_value: ACTIVITIES_DEFAULT_INTRO },
  });

  await ensureField(client, "site_settings", {
    field: "activities_confirmation_email_footer",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:
        "Tekst ONDER het overzicht van de inschrijfgegevens. Bv. " +
        "een vriendelijke afsluiting en contactinformatie.",
    },
    schema: { default_value: ACTIVITIES_DEFAULT_FOOTER },
  });
}
