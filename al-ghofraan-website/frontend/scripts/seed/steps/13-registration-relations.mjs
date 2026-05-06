// scripts/seed/steps/13-registration-relations.mjs
//
// Maakt M2O-relaties aan tussen registrations en zowel education_programs als
// activities. Hierdoor kan de /api/inschrijven route bij elke nieuwe inschrijving
// een echte FK invullen (registrations.education_program of registrations.activity).
//
// BELANGRIJK — geen alias/related-items velden:
// In een eerdere versie werd een alias-veld aangemaakt op
// `education_programs.registrations` en `activities.registrations`. Onder
// Directus 11 leverde dat een database-error op:
//
//   column activities.registrations does not exist
//
// Reden: het veld werd in sommige situaties als gewone string-kolom gezien
// in plaats van puur als alias. We slaan die alias-velden daarom over en
// documenteren in docs/CMS_BEHEER.md hoe een redacteur de inschrijvingen
// per cursus/activiteit terugvindt via filters in de Registrations-collectie.
//
// Wat deze stap doet (idempotent):
//   1. Eventueel verkeerd aangemaakte alias/database-velden weer opruimen
//   2. registrations.education_program  (M2O → education_programs)
//   3. registrations.activity           (M2O → activities)
//   4. /relations entries met one_field=null (geen inverse alias)
//
// Bestaande source_id / source_slug / source_title velden blijven intact.

import { ensureField } from "../lib/helpers.mjs";

const CLEANUP_TARGETS = [
  { collection: "education_programs", field: "registrations" },
  { collection: "activities",         field: "registrations" },
];

async function dropFieldIfExists(client, collection, field) {
  // Bestaat het veld in /fields ?
  let existing;
  try {
    const resp = await client.get(`/fields/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    return false; // bestaat niet — niets te doen
  }

  if (!existing) return false;

  // Heuristiek: een correct alias-veld heeft type "alias" + special bevat "o2m" of "no-data".
  // Een verkeerd aangemaakt veld heeft type "string"/"uuid"/etc. of mist de special.
  const isCleanAlias =
    existing.type === "alias" &&
    Array.isArray(existing.meta?.special) &&
    (existing.meta.special.includes("o2m") || existing.meta.special.includes("no-data"));

  if (isCleanAlias) {
    // Schoon alias-veld — laten staan kan ook problemen geven (zelfde fout in DB).
    // Beter: nu helemaal verwijderen zodat het nieuwe gedrag voorspelbaar is.
    console.log(`  · ${collection}.${field}: bestaand alias-veld wordt opgeruimd`);
  } else {
    console.log(`  ⚠️  ${collection}.${field}: verkeerd aangemaakt veld gedetecteerd (type=${existing.type}) — wordt verwijderd`);
  }

  try {
    await client.delete(`/fields/${collection}/${field}`);
    console.log(`  ✓ ${collection}.${field} verwijderd`);
    return true;
  } catch (err) {
    console.warn(`  ⚠️  Verwijderen van ${collection}.${field} mislukt: ${err.message}`);
    console.warn(`     Handmatig in Directus: Settings → Data Model → ${collection} → veld ${field} → trash-icoon`);
    return false;
  }
}

async function ensureRelation(client, def) {
  const { collection, field, related_collection } = def;
  let existing;
  try {
    const resp = await client.get(`/relations/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    existing = null;
  }

  const correct =
    existing &&
    existing.collection         === collection &&
    existing.field              === field &&
    existing.related_collection === related_collection;

  if (correct) {
    console.log(`  · relatie ${collection}.${field} → ${related_collection} bestaat al`);
    return false;
  }

  try {
    await client.post("/relations", def);
    console.log(`  ✓ relatie ${collection}.${field} → ${related_collection} aangemaakt`);
    return true;
  } catch (err) {
    const msg = err.message || "";
    if (msg.includes("already exists") || msg.includes("RECORD_NOT_UNIQUE")) {
      console.log(`  · relatie ${collection}.${field} bestond al (andere vorm)`);
      return false;
    }
    console.warn(`  ⚠️  relatie ${collection}.${field} aanmaken mislukt: ${msg}`);
    return false;
  }
}

export async function setupRegistrationRelations(client) {
  console.log("\n🔗 Stap 13 · M2O relaties: registrations → education_programs / activities");

  // ─── 1. Opruimen ────────────────────────────────────────────
  // Verwijder eventuele eerdere foutieve "registrations" alias-velden op
  // education_programs / activities die de seed deden falen.
  for (const target of CLEANUP_TARGETS) {
    await dropFieldIfExists(client, target.collection, target.field);
  }

  // ─── 2. M2O velden op registrations ────────────────────────
  await ensureField(client, "registrations", {
    field: "education_program",
    type:  "uuid",
    meta:  {
      width:     "half",
      interface: "select-dropdown-m2o",
      special:   ["m2o"],
      options:   { template: "{{title}}" },
      note:      "Gekoppeld onderwijsprogramma (alleen bij type=education).",
    },
    schema:{ foreign_key_table: "education_programs" },
  });

  await ensureField(client, "registrations", {
    field: "activity",
    type:  "uuid",
    meta:  {
      width:     "half",
      interface: "select-dropdown-m2o",
      special:   ["m2o"],
      options:   { template: "{{title}}" },
      note:      "Gekoppelde activiteit (alleen bij type=activity).",
    },
    schema:{ foreign_key_table: "activities" },
  });

  // ─── 3. /relations entries (zonder inverse alias!) ─────────
  await ensureRelation(client, {
    collection:         "registrations",
    field:              "education_program",
    related_collection: "education_programs",
    meta: {
      one_field:           null,        // bewust GEEN inverse alias
      sort_field:          null,
      one_deselect_action: "nullify",
    },
    schema: { on_delete: "SET NULL" },
  });

  await ensureRelation(client, {
    collection:         "registrations",
    field:              "activity",
    related_collection: "activities",
    meta: {
      one_field:           null,
      sort_field:          null,
      one_deselect_action: "nullify",
    },
    schema: { on_delete: "SET NULL" },
  });

  console.log("✓ Stap 13 voltooid");
  console.log("  💡 Filter op programma/activiteit doe je in de Registrations-collectie zelf — zie docs/CMS_BEHEER.md sectie 12");
}
