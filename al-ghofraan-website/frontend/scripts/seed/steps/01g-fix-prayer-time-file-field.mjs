// scripts/seed/steps/01g-fix-prayer-time-file-field.mjs
//
// Repareert het prayer_time_files.file veld zodat het in Directus 11
// een echte File-relatie wordt naar directus_files i.p.v. een gewoon
// UUID-input-veld.
//
// Het probleem in oudere seeds: ensureField zette interface op "file"
// maar maakte nooit de relatie in /relations aan. Daardoor zag Directus
// het veld als losse UUID-input.
//
// Deze stap is idempotent:
//   - Veld bestaat én heeft juiste interface + relation → niets doen
//   - Veld bestaat met verkeerde meta → meta patchen
//   - Relatie ontbreekt → relatie aanmaken
//   - Veld bestaat helemaal niet → fout loggen, gebruiker doorverwijzen
//     naar handmatige fallback in CSV_GEBEDSTIJDEN.md (we maken het veld
//     niet zelf aan om bestaande data niet te beschadigen)

const TARGET_COLLECTION = "prayer_time_files";
const TARGET_FIELD      = "file";

export async function fixPrayerTimeFileField(client) {
  console.log("\n📎 Stap 1g · Repareren prayer_time_files.file relatie");

  // ─── 1. Bestaat het veld? ──────────────────────────────────
  let existingField;
  try {
    const resp = await client.get(`/fields/${TARGET_COLLECTION}/${TARGET_FIELD}`);
    existingField = resp?.data;
  } catch {
    console.warn("  ⚠️  Veld 'file' bestaat niet in prayer_time_files.");
    console.warn("     Zie docs/CSV_GEBEDSTIJDEN.md voor handmatige instructies.");
    return;
  }

  console.log(`  · Veld gevonden (type: ${existingField.type})`);

  // ─── 2. Patch field-meta naar correcte file-interface ──────
  const wantedMeta = {
    interface: "file",
    special:   ["file"],
    options:   {
      folder: null, // upload naar root, redacteur kan zelf folder kiezen
    },
    display:        "file",
    display_options: null,
    note: "CSV-bestand met gebedstijden. Klik om uit de File Library te kiezen of nieuw te uploaden.",
  };

  const currentInterface = existingField.meta?.interface;
  const currentSpecial   = existingField.meta?.special || [];

  const interfaceCorrect = currentInterface === "file";
  const specialCorrect   = Array.isArray(currentSpecial) && currentSpecial.includes("file");

  if (!interfaceCorrect || !specialCorrect) {
    try {
      await client.patch(`/fields/${TARGET_COLLECTION}/${TARGET_FIELD}`, {
        meta: wantedMeta,
      });
      console.log("  ✓ Veld-meta gepatcht naar interface 'file' + special 'file'");
    } catch (err) {
      console.warn(`  ⚠️  Veld-meta patch mislukt: ${err.message}`);
      console.warn("     Zie docs/CSV_GEBEDSTIJDEN.md sectie 'Handmatige fix'.");
      return;
    }
  } else {
    console.log("  · Veld-meta is al correct");
  }

  // ─── 3. Bestaat de relatie naar directus_files? ───────────
  let relations;
  try {
    const resp = await client.get(
      `/relations/${TARGET_COLLECTION}/${TARGET_FIELD}`
    );
    relations = resp?.data;
  } catch {
    relations = null;
  }

  // Verwacht: relation met collection=prayer_time_files, field=file,
  // related_collection=directus_files
  const hasCorrectRelation =
    relations &&
    relations.collection         === TARGET_COLLECTION &&
    relations.field              === TARGET_FIELD &&
    relations.related_collection === "directus_files";

  if (hasCorrectRelation) {
    console.log("  · Relatie naar directus_files bestaat al");
  } else {
    // Probeer de relatie aan te maken
    try {
      await client.post("/relations", {
        collection:         TARGET_COLLECTION,
        field:              TARGET_FIELD,
        related_collection: "directus_files",
        meta: {
          one_field:           null,
          sort_field:          null,
          one_deselect_action: "nullify",
        },
        schema: {
          on_delete: "SET NULL",
        },
      });
      console.log("  ✓ Relatie naar directus_files aangemaakt");
    } catch (err) {
      // Relatie bestond mogelijk in een andere vorm — log en ga door
      const msg = err.message || "";
      if (msg.includes("already exists") || msg.includes("RECORD_NOT_UNIQUE")) {
        console.log("  · Relatie bestond al (in andere vorm)");
      } else {
        console.warn(`  ⚠️  Relatie aanmaken mislukt: ${msg}`);
        console.warn("     Zie docs/CSV_GEBEDSTIJDEN.md sectie 'Handmatige fix'.");
      }
    }
  }

  console.log("✓ Stap 1g voltooid");
  console.log("  💡 Refresh Directus admin (Ctrl+Shift+R) om het bijgewerkte veld te zien");
}
