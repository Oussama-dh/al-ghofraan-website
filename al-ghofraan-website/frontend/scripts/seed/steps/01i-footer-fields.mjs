// scripts/seed/steps/01i-footer-fields.mjs
//
// Voegt extra branding/footer-velden toe aan site_settings:
//   - site_subtitle       (subtitel naast site-naam in header, bv. "DawahCommissie")
//   - footer_logo         (apart logo voor footer; valt terug op logo als leeg)
//   - footer_title        (latijnse titel in footer-branding)
//   - footer_arabic_title (arabische titel in footer-branding)
//   - footer_description  (beschrijvende tekst in footer)
//
// Idempotent — bestaande velden worden niet overschreven.
// Bestaande site_settings-rij blijft intact (waarden worden NIET aangepast,
// alleen nieuwe veld-definities komen erbij).
//
// Optionele healing: als logo/footer_logo bestaan maar verkeerde meta hebben
// (bv. interface "input" in plaats van "file-image"), wordt de meta gepatcht.
// Bestand-data zelf blijft staan.

import { ensureField } from "../lib/helpers.mjs";

const FILE_IMAGE_META_LOGO = {
  width:     "half",
  interface: "file-image",
  special:   ["file"],
  note:      "Logo voor de header. Aanbevolen: PNG/SVG met transparante achtergrond.",
};

const FILE_IMAGE_META_FOOTER_LOGO = {
  width:     "half",
  interface: "file-image",
  special:   ["file"],
  note:      "Apart logo voor de footer. Als leeg, gebruikt de site `logo`. PNG/SVG met lichte kleuren werkt het beste op de donkere footer.",
};

async function patchFieldMetaIfNeeded(client, collection, field, wantedMeta, label) {
  let existing;
  try {
    const resp = await client.get(`/fields/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    return; // bestaat niet — wordt door ensureField alsnog aangemaakt
  }
  if (!existing) return;

  const currentInterface = existing.meta?.interface;
  const currentSpecial   = existing.meta?.special || [];

  const interfaceCorrect = currentInterface === "file-image";
  const specialCorrect   = Array.isArray(currentSpecial) && currentSpecial.includes("file");

  if (interfaceCorrect && specialCorrect) {
    return; // alles is goed
  }

  console.log(`  ⚠️  ${collection}.${field} (${label}) heeft niet de juiste interface — wordt gepatcht`);
  try {
    await client.patch(`/fields/${collection}/${field}`, { meta: wantedMeta });
    console.log(`  ✓ ${collection}.${field} interface gepatcht naar file-image`);
  } catch (err) {
    console.warn(`  ⚠️  Patchen mislukt: ${err.message}`);
    console.warn(`     Handmatig in Directus → Settings → Data Model → site_settings → ${field} → interface naar "Image" zetten`);
  }
}

export async function setupFooterFields(client) {
  console.log("\n🦶 Stap 1i · Footer- en branding-velden in site_settings");

  // ─── 1. Eventueel bestaande logo/footer_logo healen ─────────
  // (bv. als ze ooit als gewone uuid-input zijn aangemaakt en de upload-knop
  // ontbreekt in de admin)
  await patchFieldMetaIfNeeded(client, "site_settings", "logo",        FILE_IMAGE_META_LOGO,        "header logo");
  await patchFieldMetaIfNeeded(client, "site_settings", "footer_logo", FILE_IMAGE_META_FOOTER_LOGO, "footer logo");

  // ─── 2. Velden toevoegen als ze ontbreken ───────────────────
  await ensureField(client, "site_settings", {
    field: "site_subtitle",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Subtitel onder de site-naam in de header (bv. 'DawahCommissie').",
    },
    schema:{},
  });

  await ensureField(client, "site_settings", {
    field: "footer_logo",
    type:  "uuid",
    meta:  FILE_IMAGE_META_FOOTER_LOGO,
    schema:{ foreign_key_table: "directus_files" },
  });

  await ensureField(client, "site_settings", {
    field: "footer_title",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Latijnse titel in footer-branding. Als leeg, valt terug op site_name.",
    },
    schema:{},
  });

  await ensureField(client, "site_settings", {
    field: "footer_arabic_title",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Arabische titel onder footer-titel (bv. 'المسجد الغفران').",
    },
    schema:{},
  });

  await ensureField(client, "site_settings", {
    field: "footer_description",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Beschrijvende tekst in de footer-branding kolom. Als leeg, valt terug op footer_text.",
    },
    schema:{},
  });

  console.log("✓ Stap 1i voltooid");
}
