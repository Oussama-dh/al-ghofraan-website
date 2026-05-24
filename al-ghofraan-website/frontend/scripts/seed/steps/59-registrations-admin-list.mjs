// scripts/seed/steps/59-registrations-admin-list.mjs
//
// Delivery 58-hotfix — verbetering van de admin-list layout voor
// `registrations` zodat Activiteiten beheerders direct relevante
// kolommen zien (naam, e-mail, telefoon, bron, check-in status, ...).
//
// Context:
//   De originele preset (stap 26) was onderwijs-georiënteerd
//   (student_number, parent_name, parent_phone). Voor de
//   Activiteiten beheerder die alleen registrations met
//   type=activity ziet, zijn die kolommen leeg en onnuttig.
//
//   Deze nieuwe preset toont kolommen die voor BEIDE flows zinvol
//   zijn: naam, e-mail, telefoon, bron (activity/program), type,
//   status, check-in moment, aangemeld op. Onderwijs-specifieke
//   kolommen (student_number, parent_*) kunnen beheerders desgewenst
//   per gebruiker zelf instellen via Directus' eigen layout-knop.
//
// Geen permissions-wijziging. Geen velden toegevoegd of verwijderd.
// Alleen een UI-preset op de `registrations` collectie.
//
// HARDE GARANTIES:
//   - Idempotent (tweede run = no-op).
//   - Stap 37 niet aangeraakt.
//   - Stap 40 niet aangeraakt.
//   - Stap 25/30/46 rollen NIET aangeraakt — Activiteiten beheerder
//     behoudt zijn bestaande filtered access (type=activity).
//   - Geen delete-permissions toegevoegd.
//   - Bestaande check-in flow, donatieflow, TV-route, hadieth-series:
//     niet geraakt.

const COLLECTION = "registrations";

const NEW_LIST_FIELDS = [
  "name", "email", "phone",
  "source_title", "type", "status",
  "checked_in_at", "created_at",
];

const NEW_LIST_SORT = ["-created_at"];

export async function setupRegistrationsAdminList(client) {
  console.log("\n📋 Stap 59 · registrations admin-list — relevante kolommen voor beide flows");

  // 1. Welke velden bestaan? (Idempotent + veilig — skip onbekende.)
  let availableFields;
  try {
    const resp = await client.get(`/fields/${COLLECTION}?limit=-1`);
    availableFields = new Set((resp?.data || []).map((f) => f.field));
  } catch (err) {
    console.warn(`  ⚠ ${COLLECTION}: kan velden niet ophalen (${err.message}) — stap overgeslagen`);
    return;
  }

  const filtered = NEW_LIST_FIELDS.filter((f) => availableFields.has(f));
  const filteredSort = NEW_LIST_SORT.filter((s) => availableFields.has(s.replace(/^-/, "")));
  if (filtered.length === 0) {
    console.log(`  · ${COLLECTION}: geen veld beschikbaar — preset overgeslagen`);
    return;
  }

  // 2. Globale preset vinden of aanmaken (role=null, user=null)
  let existing;
  try {
    const search = await client.get(
      `/presets` +
      `?filter[collection][_eq]=${encodeURIComponent(COLLECTION)}` +
      `&filter[role][_null]=true` +
      `&filter[user][_null]=true` +
      `&limit=1`,
    );
    existing = search?.data?.[0];
  } catch (err) {
    console.warn(`  ⚠ ${COLLECTION}: preset-lookup mislukt (${err.message})`);
    return;
  }

  const payload = {
    collection:     COLLECTION,
    role:           null,
    user:           null,
    layout:         "tabular",
    layout_query:   { tabular: { sort: filteredSort } },
    layout_options: { tabular: { fields: filtered } },
  };

  try {
    if (existing) {
      const sameLayout = existing.layout === payload.layout;
      const sameOpts   = JSON.stringify(existing.layout_options) === JSON.stringify(payload.layout_options);
      const sameQuery  = JSON.stringify(existing.layout_query)   === JSON.stringify(payload.layout_query);
      if (sameLayout && sameOpts && sameQuery) {
        console.log(`  · ${COLLECTION}: preset al up-to-date`);
      } else {
        await client.patch(`/presets/${existing.id}`, payload);
        console.log(`  ↻ ${COLLECTION}: preset bijgewerkt (${filtered.length} kolommen)`);
      }
    } else {
      await client.post("/presets", payload);
      console.log(`  ✓ ${COLLECTION}: preset aangemaakt (${filtered.length} kolommen)`);
    }
  } catch (err) {
    console.warn(`  ⚠ ${COLLECTION}: preset-update mislukt (${err.message})`);
  }

  console.log("✓ Stap 59 voltooid");
}
