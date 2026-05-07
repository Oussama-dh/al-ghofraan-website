// scripts/seed/steps/13-registration-relations.mjs
//
// HISTORIE — wat hier eerder stond, en waarom we het terugdraaien:
//
//   v1: alias-velden op education_programs.registrations en activities.registrations.
//       Resultaat: Directus 11 zag deze als gewone DB-kolommen.
//       Fout: "column activities.registrations does not exist".
//
//   v2: M2O-velden op registrations.education_program en registrations.activity
//       als type "uuid".
//       Resultaat: bestaande activities/education_programs hebben integer-IDs.
//       Fout: "invalid input syntax for type uuid: \"3\"" bij inschrijven.
//
//   v3 (deze versie): we laten relationele velden helemaal achterwege.
//       source_id / source_slug / source_title zijn voldoende voor opzoeken
//       en filteren. Filteren in Directus gaat via de Registrations-collectie
//       (zie docs/CMS_BEHEER.md sectie 12.1).
//
// Wat deze stap nu doet — uitsluitend opruimen, idempotent:
//   - verwijder eventuele eerder aangemaakte M2O-velden op registrations
//   - verwijder bijbehorende /relations entries
//   - verwijder eventuele alias-velden op education_programs / activities
//
// Bestaande inschrijvingen blijven 100% intact: source_id/source_slug/
// source_title staan los van deze relationele velden.

const REGISTRATIONS_M2O_FIELDS = ["education_program", "activity"];

const ALIAS_TARGETS = [
  { collection: "education_programs", field: "registrations" },
  { collection: "activities",         field: "registrations" },
];

async function dropFieldIfExists(client, collection, field, label = "") {
  // Bestaat het veld in /fields?
  let existing;
  try {
    const resp = await client.get(`/fields/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    return false; // bestaat niet — niets te doen
  }
  if (!existing) return false;

  try {
    await client.delete(`/fields/${collection}/${field}`);
    console.log(`  ✓ verwijderd: ${collection}.${field}${label ? ` (${label})` : ""}`);
    return true;
  } catch (err) {
    console.warn(`  ⚠️  verwijderen ${collection}.${field} mislukt: ${err.message}`);
    console.warn(
      `     Handmatige fallback: Directus → Settings → Data Model → ${collection} → ` +
      `klik op ${field} → prullenbak-icoon → bevestig`
    );
    return false;
  }
}

async function dropRelationIfExists(client, collection, field) {
  let existing;
  try {
    const resp = await client.get(`/relations/${collection}/${field}`);
    existing = resp?.data;
  } catch {
    return false; // bestaat niet
  }
  if (!existing) return false;

  try {
    await client.delete(`/relations/${collection}/${field}`);
    console.log(`  ✓ relatie verwijderd: ${collection}.${field}`);
    return true;
  } catch (err) {
    console.warn(`  ⚠️  relatie ${collection}.${field} verwijderen mislukt: ${err.message}`);
    return false;
  }
}

export async function setupRegistrationRelations(client) {
  console.log("\n🔗 Stap 13 · Opruimen oude registrations-relaties");
  console.log("  (relationele koppeling werd ingewisseld voor source_id/source_slug/source_title)");

  // 1. Eerst /relations weghalen — anders blokkeren ze het verwijderen van de velden
  for (const field of REGISTRATIONS_M2O_FIELDS) {
    await dropRelationIfExists(client, "registrations", field);
  }

  // 2. M2O-velden op registrations
  for (const field of REGISTRATIONS_M2O_FIELDS) {
    await dropFieldIfExists(client, "registrations", field, "oud M2O-veld");
  }

  // 3. Eventuele alias-velden uit een nóg eerdere poging
  for (const target of ALIAS_TARGETS) {
    await dropFieldIfExists(client, target.collection, target.field, "oud alias-veld");
  }

  console.log("✓ Stap 13 voltooid");
  console.log(
    "  💡 Inschrijvingen filteren per cursus/activiteit gaat via " +
    "Registrations → filter op source_slug. Zie docs/CMS_BEHEER.md sectie 12.1."
  );
}
