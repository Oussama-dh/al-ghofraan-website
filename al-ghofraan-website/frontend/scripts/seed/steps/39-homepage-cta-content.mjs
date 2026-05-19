// scripts/seed/steps/39-homepage-cta-content.mjs
//
// Delivery A — beheerbare homepage/doneren content blokken.
//
// Voegt 20 velden toe aan `site_settings`:
//   - 4 voor home ayah        (home_ayah_*)
//   - 4 voor donation ayah    (donation_ayah_*)
//   - 7 voor homepage CTA     (homepage_cta_*)
//   - 5 voor WhatsApp CTA     (homepage_whatsapp_cta_*)
//
// Defaults staan AAN of UIT?
//   - Alle *_enabled defaulten op FALSE. Backward compat: zonder
//     configuratie blijven homepage + doneren er exact hetzelfde
//     uitzien als vóór deze delivery. Beheerder moet eerst de
//     teksten invullen + handmatig _enabled aanzetten in Directus.
//   - Tekstvelden hebben GEEN default — beheerder vult zelf.
//
// Idempotent — ensureField skipt als veld al bestaat.

import { ensureField } from "../lib/helpers.mjs";

const COLLECTION = "site_settings";

// ─── Reusable field-defs ────────────────────────────────────

function boolField(name, note) {
  return {
    field: name,
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note,
    },
    schema: { default_value: false, is_nullable: false },
  };
}

function stringField(name, note) {
  return {
    field: name,
    type:  "string",
    meta: { width: "full", interface: "input", note },
    schema: {},
  };
}

function textField(name, note) {
  return {
    field: name,
    type:  "text",
    meta: { width: "full", interface: "input-multiline", note },
    schema: {},
  };
}

export async function setupHomepageCtaContent(client) {
  console.log("\n📣 Stap 39 · homepage + doneren beheerbare blokken (ayah, CTA, WhatsApp)");

  // ─── 1. Home ayah ──────────────────────────────────────
  // Wordt boven de body op /home gerenderd als enabled=true en
  // tenminste arabic + reference gevuld zijn.
  await ensureField(client, COLLECTION, boolField(
    "home_ayah_enabled",
    "Zet aan om een ayah-blok bovenaan de homepage te tonen. " +
    "Vul ook de Arabische tekst en de referentie in.",
  ));
  await ensureField(client, COLLECTION, textField(
    "home_ayah_arabic",
    "Arabische tekst van de ayah voor op de homepage.",
  ));
  await ensureField(client, COLLECTION, textField(
    "home_ayah_translation",
    "Nederlandse vertaling van de ayah voor op de homepage. Optioneel.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "home_ayah_reference",
    "Bronvermelding, bv. \"Soera Al-Fatiha 1:1\".",
  ));

  // ─── 2. Donation ayah ──────────────────────────────────
  // Vervangt het hardcoded Al-Baqara 2:272 blok op /doneren wanneer
  // enabled=true. Als enabled=false blijft het hardcoded blok zichtbaar
  // (backward compat: doneerpagina blijft direct werken na deploy).
  await ensureField(client, COLLECTION, boolField(
    "donation_ayah_enabled",
    "Zet aan om de hardcoded ayah op de doneerpagina te vervangen door " +
    "uw eigen tekst. Bij UIT blijft het standaardvers Al-Baqara 2:272 staan.",
  ));
  await ensureField(client, COLLECTION, textField(
    "donation_ayah_arabic",
    "Arabische tekst van de ayah voor op de doneerpagina.",
  ));
  await ensureField(client, COLLECTION, textField(
    "donation_ayah_translation",
    "Nederlandse vertaling van de ayah voor op de doneerpagina. Optioneel.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "donation_ayah_reference",
    "Bronvermelding, bv. \"Soera Al-Baqara 2:272\".",
  ));

  // ─── 3. Homepage CTA ─────────────────────────────────
  // Wordt als laatste CTA op de homepage gerenderd wanneer enabled=true.
  // Heeft prioriteit boven de Directus page_sections van type=cta en
  // boven de hardcoded fallback.
  await ensureField(client, COLLECTION, boolField(
    "homepage_cta_enabled",
    "Zet aan om uw eigen CTA-blok onderaan de homepage te tonen. " +
    "Overschrijft de standaard 'Doneer hier' / 'Meer over ons' blok.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "homepage_cta_title",
    "Titel van het CTA-blok onderaan de homepage.",
  ));
  await ensureField(client, COLLECTION, textField(
    "homepage_cta_description",
    "Korte beschrijving onder de titel.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "homepage_cta_primary_label",
    "Tekst op de primaire (gevulde) knop. Leeg = knop niet tonen.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "homepage_cta_primary_url",
    "URL voor de primaire knop. Externe links automatisch in nieuwe tab.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "homepage_cta_secondary_label",
    "Tekst op de secundaire (outline) knop. Leeg = knop niet tonen.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "homepage_cta_secondary_url",
    "URL voor de secundaire knop.",
  ));

  // ─── 4. WhatsApp CTA ────────────────────────────────
  // Aparte sectie tussen de body en de activiteiten op de homepage.
  // Verschijnt alleen als enabled=true EN url gevuld is.
  await ensureField(client, COLLECTION, boolField(
    "homepage_whatsapp_cta_enabled",
    "Zet aan om een WhatsApp-kanaal CTA op de homepage te tonen. " +
    "Vereist ook een ingevulde url.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "homepage_whatsapp_cta_title",
    "Titel van het WhatsApp-CTA blok, bv. \"Sluit je aan bij ons WhatsApp-kanaal\".",
  ));
  await ensureField(client, COLLECTION, textField(
    "homepage_whatsapp_cta_description",
    "Korte beschrijving onder de titel.",
  ));
  await ensureField(client, COLLECTION, stringField(
    "homepage_whatsapp_cta_button_label",
    "Tekst op de WhatsApp-knop, bv. \"Bekijk kanaal\".",
  ));
  await ensureField(client, COLLECTION, stringField(
    "homepage_whatsapp_cta_url",
    "Volledige externe URL, bv. https://chat.whatsapp.com/XXXXXX. " +
    "Wordt altijd in een nieuwe tab geopend.",
  ));

  console.log("✓ Stap 39 voltooid (20 velden op site_settings idempotent klaargezet)");
}
