// scripts/seed/steps/40-page-sections-ayah-whatsapp.mjs
//
// Delivery sections — pagina-specifieke contentblokken (ayah, CTA,
// WhatsApp CTA) op `page_sections` zetten in plaats van site_settings.
//
// Wat doet deze stap?
//   1. Breidt de `type` dropdown van page_sections uit met de waarden
//      "ayah" en "whatsapp_cta". Bestaande waarden (split_feature,
//      card_grid, simple_text, cta) blijven onveranderd.
//   2. Voegt 2 nieuwe velden toe aan page_sections:
//        - ayah_arabic     (text)   — Arabische tekst voor type=ayah
//        - ayah_reference  (string) — bronvermelding voor type=ayah
//   3. Seed 4 voorbeeld-rijen (allemaal active=false) zodat de
//      beheerder ze in Directus admin ziet als template:
//        - home/ayah         (type=ayah)
//        - home/main_cta     (type=cta)
//        - home/whatsapp     (type=whatsapp_cta)
//        - doneren/ayah      (type=ayah)
//
// Backward compatibility:
//   - Site_settings velden uit stap 39 blijven bestaan en worden door
//     de frontend gelezen als 2e fallback (3-tier: section →
//     site_settings → hardcode).
//   - Bestaande page_sections rijen behouden hun type — geen migratie.
//
// Idempotent:
//   - Type-enum: alleen toevoegen wat ontbreekt, behoud bestaande order.
//   - Velden: ensureField skipt als al aanwezig.
//   - Voorbeeld-rijen: bestaande upsert-helper vult alleen lege velden
//     aan (geen overwrites), zoekt op page_slug + key.

import { ensureField } from "../lib/helpers.mjs";

const COLLECTION = "page_sections";

// ─── Nieuwe choices die we toevoegen aan de type-dropdown ──
const NEW_CHOICES = [
  { text: "Ayah (Arabisch vers + vertaling + bron)",      value: "ayah" },
  { text: "WhatsApp CTA (kanaal-uitnodiging met knop)",   value: "whatsapp_cta" },
];

// ─── Helpers ───────────────────────────────────────────────

/**
 * Idempotent: voegt ontbrekende choices toe aan de `type`-dropdown
 * van page_sections. Behoudt bestaande choices in hun order, voegt
 * nieuwe achteraan toe. PATCH wordt alleen verstuurd als er iets
 * verandert.
 */
async function ensureTypeChoices(client) {
  let field;
  try {
    const res = await client.get(`/fields/${COLLECTION}/type`);
    field = res?.data;
  } catch (err) {
    const status = err?.response?.status || err?.status;
    if (status === 404) {
      console.log(`  ⚠ veld ${COLLECTION}.type bestaat niet — overgeslagen`);
      return false;
    }
    // Productie kan 403 geven op field-introspectie. Skippen is
    // veilig: zonder field-meta access kunnen we de dropdown niet
    // uitbreiden, maar de nieuwe types werken nog steeds als de
    // beheerder ze handmatig invoert of als een eerdere seed-run
    // (met meer rechten) ze al heeft toegevoegd.
    if (status === 403) {
      console.log(`  ⚠ geen permissie om ${COLLECTION}.type uit te lezen — choices-merge overgeslagen`);
      return false;
    }
    throw err;
  }

  if (!field?.meta) {
    console.log(`  ⚠ veld ${COLLECTION}.type heeft geen meta — overgeslagen`);
    return false;
  }

  const currentOptions = field.meta.options || {};
  const currentChoices = Array.isArray(currentOptions.choices) ? currentOptions.choices : [];
  const existingValues = new Set(currentChoices.map((c) => c?.value));

  const merged = currentChoices.slice();
  let changed = false;
  for (const choice of NEW_CHOICES) {
    if (!existingValues.has(choice.value)) {
      merged.push(choice);
      changed = true;
    }
  }

  if (!changed) {
    console.log(`  · ${COLLECTION}.type choices ongewijzigd`);
    return false;
  }

  await client.patch(`/fields/${COLLECTION}/type`, {
    meta: { options: { ...currentOptions, choices: merged } },
  });
  console.log(`  ↻ ${COLLECTION}.type choices uitgebreid met: ${NEW_CHOICES.map((c) => c.value).join(", ")}`);
  return true;
}

/**
 * Upsert helper voor page_sections — zoekt op page_slug + key.
 * Bestaat al? Vult alleen lege velden aan (bewaart handmatige edits).
 * Bestaat niet? Maakt aan met alle velden.
 *
 * Lokale copy van het patroon uit stap 09 — bewust niet geïmporteerd
 * om coupling tussen seed-stappen te vermijden.
 */
function isEmpty(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

async function upsertSection(client, data) {
  const { page_slug, key } = data;
  const search = await client.get(
    `/items/${COLLECTION}` +
    `?filter[page_slug][_eq]=${encodeURIComponent(page_slug)}` +
    `&filter[key][_eq]=${encodeURIComponent(key)}` +
    `&limit=1`
  );
  const existing = search?.data?.[0];

  if (existing) {
    const patch = {};
    for (const [field, value] of Object.entries(data)) {
      if (field === "page_slug" || field === "key") continue;
      const current = existing[field];
      if (Array.isArray(value)) {
        if (!current || (Array.isArray(current) && current.length === 0)) {
          patch[field] = value;
        }
      } else if (isEmpty(current)) {
        patch[field] = value;
      }
    }
    if (Object.keys(patch).length === 0) {
      console.log(`  · ${COLLECTION}: ${page_slug}/${key} ongewijzigd`);
    } else {
      await client.patch(`/items/${COLLECTION}/${existing.id}`, patch);
      console.log(`  ↻ ${COLLECTION}: ${page_slug}/${key} aangevuld (${Object.keys(patch).join(", ")})`);
    }
    return;
  }

  await client.post(`/items/${COLLECTION}`, data);
  console.log(`  ✓ ${COLLECTION}: ${page_slug}/${key} aangemaakt`);
}

// ─── Voorbeeld-rijen (allemaal active=false) ───────────────

const EXAMPLE_ROWS = [
  {
    page_slug:      "home",
    key:            "ayah",
    type:           "ayah",
    label:          "Homepage — ayah-blok",
    title:          "",
    intro:          "Voorbeeld: een korte Nederlandse vertaling van de ayah.",
    ayah_arabic:    "",
    ayah_reference: "Soera ...",
    active:         false,
    sort:           5,
  },
  {
    page_slug:           "home",
    key:                 "main_cta",
    type:                "cta",
    label:               "Homepage — hoofd CTA onderaan",
    title:               "Steun het werk van de DawahCommissie",
    intro:               "Uw bijdrage helpt ons om de gemeenschap te blijven dienen.",
    primary_cta_label:   "Doneer hier",
    primary_cta_href:    "/doneren",
    secondary_cta_label: "Meer over ons",
    secondary_cta_href:  "/dawahcommissie",
    active:              false,
    sort:                900,
  },
  {
    page_slug:         "home",
    key:               "whatsapp",
    type:              "whatsapp_cta",
    label:             "Homepage — WhatsApp-kanaal",
    title:             "Sluit je aan bij ons WhatsApp-kanaal",
    intro:             "Ontvang updates over lezingen, activiteiten en aankondigingen.",
    primary_cta_label: "Bekijk kanaal",
    primary_cta_href:  "https://chat.whatsapp.com/",
    active:            false,
    sort:              500,
  },
  {
    page_slug:      "doneren",
    key:            "ayah",
    type:           "ayah",
    label:          "Doneren — ayah-blok",
    title:          "",
    intro:          "En wat u ook aan goeds uitgeeft, dat is voor uzelf.",
    ayah_arabic:    "وَمَا تُنفِقُوا مِنْ خَيْرٍ فَلِأَنفُسِكُمْ",
    ayah_reference: "Soera Al-Baqara 2:272",
    active:         false,
    sort:           5,
  },
];

// ─── Main ──────────────────────────────────────────────────

export async function setupPageSectionsAyahWhatsapp(client) {
  console.log("\n📜 Stap 40 · page_sections uitbreiden met ayah + whatsapp_cta types");

  // 1. Type-dropdown uitbreiden
  await ensureTypeChoices(client);

  // 2. Nieuwe velden voor ayah-secties
  await ensureField(client, COLLECTION, {
    field: "ayah_arabic",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:      "Voor type='ayah': de Arabische tekst van het vers (RTL). " +
                 "De Nederlandse vertaling vult u in het 'intro'-veld in, " +
                 "en de bronvermelding (bv. \"Soera Al-Baqara 2:272\") " +
                 "in 'ayah_reference'.",
    },
    schema: {},
  });

  await ensureField(client, COLLECTION, {
    field: "ayah_reference",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:      "Voor type='ayah': bronvermelding, bv. \"Soera Al-Baqara 2:272\".",
    },
    schema: {},
  });

  // 3. Voorbeeld-rijen (active=false — templates voor beheerder)
  for (const row of EXAMPLE_ROWS) {
    await upsertSection(client, row);
  }

  console.log("✓ Stap 40 voltooid");
}
