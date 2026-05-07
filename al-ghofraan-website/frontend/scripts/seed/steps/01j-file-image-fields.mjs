// scripts/seed/steps/01j-heal-file-fields.mjs
//
// Patcht de meta van bekende File/Image-velden zodat ze in Directus 11
// als echt upload-veld verschijnen i.p.v. een gewone UUID/Input.
//
// Bestand-data zelf blijft 100% intact — we patchen alleen de meta op het
// veld (interface, special). Gebeurt alleen als de huidige meta NIET klopt.
//
// Volledig idempotent: bij correcte interface gebeurt er niets.

const FILE_IMAGE_META_DEFAULTS = {
  interface: "file-image",
  special:   ["file"],
};

const TARGETS = [
  {
    collection: "site_settings",
    field:      "logo",
    note:       "Logo voor de header. PNG/SVG met transparante achtergrond.",
    label:      "header logo",
  },
  {
    collection: "site_settings",
    field:      "footer_logo",
    note:       "Apart logo voor de footer. Als leeg, valt de site terug op `logo`.",
    label:      "footer logo",
  },
  {
    collection: "site_settings",
    field:      "favicon",
    note:       "Favicon (.ico, .png of .svg). Aanbevolen: 32×32 of 64×64.",
    label:      "favicon",
  },
  {
    collection: "site_settings",
    field:      "og_image",
    note:       "Social-sharing afbeelding (1200×630 aanbevolen).",
    label:      "og-image",
  },
  {
    collection: "activities",
    field:      "image",
    note:       "Hero-afbeelding voor de activiteit.",
    label:      "activity image",
  },
  {
    collection: "education_programs",
    field:      "image",
    note:       "Hero-afbeelding voor het onderwijsprogramma.",
    label:      "education image",
  },
  {
    collection: "page_sections",
    field:      "image",
    note:       "Afbeelding voor de sectie.",
    label:      "page section image",
  },
  {
    collection: "page_section_items",
    field:      "image",
    note:       "Afbeelding voor het item binnen een sectie.",
    label:      "page section item image",
  },
];

async function healField(client, target) {
  const { collection, field, note, label } = target;

  let existing;
  try {
    const resp = await client.get(`/fields/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    return; // veld bestaat (nog) niet → wordt elders aangemaakt
  }
  if (!existing) return;

  const currentInterface = existing.meta?.interface;
  const currentSpecial   = existing.meta?.special || [];

  const interfaceCorrect = currentInterface === "file-image" || currentInterface === "file";
  const specialCorrect   = Array.isArray(currentSpecial) && currentSpecial.includes("file");

  if (interfaceCorrect && specialCorrect) {
    return; // alles ok
  }

  console.log(
    `  ⚠️  ${collection}.${field} (${label}) heeft niet de juiste interface ` +
    `(interface=${currentInterface}, special=${JSON.stringify(currentSpecial)}) — wordt gepatcht`
  );

  try {
    await client.patch(`/fields/${collection}/${field}`, {
      meta: {
        ...FILE_IMAGE_META_DEFAULTS,
        note,
      },
    });
    console.log(`  ✓ ${collection}.${field} → file-image interface`);
  } catch (err) {
    console.warn(`  ⚠️  Patchen ${collection}.${field} mislukt: ${err.message}`);
    console.warn(
      `     Handmatige fix in Directus: Settings → Data Model → ${collection} → ` +
      `klik op ${field} → Interface → kies "Image" → Save`
    );
  }
}

export async function setupFileImageFields(client) {
  console.log("\n🩹 Stap 1j · File/Image-veld interfaces healen");

  for (const target of TARGETS) {
    await healField(client, target);
  }

  console.log("✓ Stap 1j voltooid");
}
