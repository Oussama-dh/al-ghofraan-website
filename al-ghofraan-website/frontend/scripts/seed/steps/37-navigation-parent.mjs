// scripts/seed/steps/37-navigation-parent.mjs
//
// Voegt parent/child-ondersteuning toe aan de navigation_items
// collectie en plaatst "Onze moskee" als child onder "Over ons".
//
// ─── BUGHISTORIE ─────────────────────────────────────────────
// v1: alleen veld, geen relation     → admin "relationship not configured"
// v2: veld + relation, maar type 'uuid' hardcoded
//                                    → FK constraint faalt op Postgres-niveau
//                                       want navigation_items.id is integer
//                                       (default Directus PK), niet uuid.
// v3 (deze): detecteer id-type dynamisch, recover bij verkeerd type.
//
// ─── FLOW ────────────────────────────────────────────────────
// 1. Detecteer type van navigation_items.id via /fields/<col>/id.
// 2. Check huidige status van navigation_items.parent:
//      - bestaat niet → create met juiste type
//      - bestaat met juiste type → ok
//      - bestaat met verkeerd type:
//          - data is leeg → veld + relation droppen, opnieuw aanmaken
//          - data niet leeg → STOP met duidelijke melding voor handmatige migratie
// 3. Relation ensure (idempotent).
// 4. Over ons + Onze moskee zoeken/aanmaken.
//
// Idempotent, defensief, logt echte Directus error bodies.

import { ensureField } from "../lib/helpers.mjs";

const NAV_COLLECTION = "navigation_items";

// ─── Error-body extraction ───────────────────────────────────
function extractDirectusError(err) {
  if (!err) return "(geen error)";
  const payload =
    err?.response?.data?.errors ||
    err?.response?.data         ||
    err?.errors                 ||
    err?.data                   ||
    null;
  if (payload) {
    try {
      return typeof payload === "string" ? payload : JSON.stringify(payload);
    } catch {
      /* fall-through */
    }
  }
  if (err.message) return err.message;
  try { return JSON.stringify(err); } catch { return String(err); }
}

// ─── ensureRelation (zelfde pattern als stap 15/24) ──────────
async function ensureRelation(client, def) {
  const { collection, field, related_collection } = def;
  let existing = null;
  try {
    const resp = await client.get(`/relations/${collection}/${field}`);
    existing = resp?.data || null;
  } catch {
    existing = null;
  }

  if (
    existing &&
    existing.collection         === collection &&
    existing.field              === field &&
    existing.related_collection === related_collection
  ) {
    console.log(`  · relatie ${collection}.${field} → ${related_collection} bestaat al`);
    return false;
  }

  try {
    await client.post("/relations", def);
    console.log(`  ✓ relatie ${collection}.${field} → ${related_collection} aangemaakt`);
    return true;
  } catch (err) {
    const body = extractDirectusError(err);
    if (body.includes("already exists") || body.includes("RECORD_NOT_UNIQUE")) {
      console.log(`  · relatie ${collection}.${field} bestond al (andere vorm)`);
      return false;
    }
    throw new Error(`relatie ${collection}.${field} aanmaken faalde: ${body}`);
  }
}

// ─── Field-introspectie helpers ──────────────────────────────

/**
 * Lees het Directus-type van een veld. Returnt null als veld niet bestaat.
 * Directus' /fields endpoint geeft een object met `type` op top-level
 * (bv. "integer", "uuid", "string", "boolean", "timestamp").
 */
async function getFieldType(client, collection, fieldName) {
  try {
    const resp = await client.get(`/fields/${collection}/${fieldName}`);
    const data = resp?.data;
    if (!data) return null;
    return data.type || null;
  } catch (err) {
    // 404 = veld bestaat niet
    if (err?.response?.status === 404 || err?.status === 404) return null;
    // Andere fout: niet swallowen — caller moet weten wat er mis is
    throw err;
  }
}

/**
 * Check of een veld in een collectie leeg is (overal null/undefined).
 * Gebruikt om te bepalen of we een veld veilig kunnen droppen.
 *
 * We tellen via _nnull (not null) filter — als die count 0 is, is het
 * veld overal leeg.
 */
async function isFieldEmpty(client, collection, fieldName) {
  try {
    const resp = await client.get(
      `/items/${collection}?aggregate[count]=*&filter[${fieldName}][_nnull]=true&limit=0`,
    );
    // Directus aggregate-response: { data: [{ count: "N" }] } (string of number)
    const raw = resp?.data?.[0]?.count;
    const count = raw == null ? 0 : Number(raw);
    return Number.isFinite(count) && count === 0;
  } catch (err) {
    // Kunnen we niet zeker weten of leeg is → defensief 'false' returnen.
    // Beter een handmatige migratie afdwingen dan per ongeluk data te slopen.
    console.warn(
      `    (kon leegte-check voor ${collection}.${fieldName} niet uitvoeren — ` +
      `defensief alsof gevuld: ${extractDirectusError(err)})`,
    );
    return false;
  }
}

/**
 * Probeer een veld + zijn relation te verwijderen. Relation eerst —
 * Directus laat een veld met FK-constraint anders niet droppen.
 */
async function dropFieldAndRelation(client, collection, fieldName) {
  // Eerst relation, dan veld
  try {
    await client.delete(`/relations/${collection}/${fieldName}`);
    console.log(`    ↺ relation ${collection}.${fieldName} verwijderd`);
  } catch (err) {
    // 404 op relation = geen relation aanwezig, ga door naar veld
    const status = err?.response?.status || err?.status;
    if (status !== 404) {
      console.warn(
        `    (relation drop ${collection}.${fieldName} skipped: ${extractDirectusError(err)})`,
      );
    }
  }
  await client.delete(`/fields/${collection}/${fieldName}`);
  console.log(`    ↺ veld ${collection}.${fieldName} verwijderd`);
}

// ─── Find existing nav item (label OR href) ──────────────────
async function findNavItem(client, label, href) {
  for (const filter of [
    `filter[label][_eq]=${encodeURIComponent(label)}`,
    `filter[href][_eq]=${encodeURIComponent(href)}`,
  ]) {
    try {
      const resp = await client.get(
        `/items/${NAV_COLLECTION}?${filter}&limit=1&fields=id,label,href,parent`,
      );
      const hit = resp?.data?.[0];
      if (hit) return hit;
    } catch (err) {
      console.warn(`    (lookup faalde: ${extractDirectusError(err)})`);
    }
  }
  return null;
}

// ─── Bouw de field-definitie voor `parent` op het juiste type ─
function buildParentFieldDef(idType) {
  return {
    field: "parent",
    type:  idType, // exact zelfde type als navigation_items.id
    meta: {
      width:     "half",
      interface: "select-dropdown-m2o",
      special:   ["m2o"],
      options:   { template: "{{label}}" },
      note:
        "Optioneel: maak dit item een child onder een ander " +
        "navigatie-item. Top-level items laten leeg. Er wordt " +
        "maar één niveau van nesting ondersteund.",
    },
    schema: {},
  };
}

export async function setupNavigationParent(client) {
  console.log("");
  console.log("37. Navigation parent veld + 'Onze moskee' onder 'Over ons'");

  // ─── A. Detecteer id-type ────────────────────────────────
  let idType;
  try {
    idType = await getFieldType(client, NAV_COLLECTION, "id");
  } catch (err) {
    throw new Error(
      `Kon type van ${NAV_COLLECTION}.id niet ophalen: ${extractDirectusError(err)}`,
    );
  }

  if (!idType) {
    throw new Error(
      `${NAV_COLLECTION}.id niet gevonden — collectie bestaat mogelijk niet. ` +
      `Draai eerst stap 01-collections.`,
    );
  }
  console.log(`  · ${NAV_COLLECTION}.id type = "${idType}"`);

  // ─── B. Check huidige status van parent ──────────────────
  let parentType;
  try {
    parentType = await getFieldType(client, NAV_COLLECTION, "parent");
  } catch (err) {
    const status = err?.response?.status || err?.status;
    const body = extractDirectusError(err);

    if (
      status === 403 ||
      body.includes("FORBIDDEN") ||
      body.toLowerCase().includes("permission")
    ) {
      console.warn(
        `  ⚠️  Kon type van ${NAV_COLLECTION}.parent niet ophalen door permissie. ` +
        `We gaan ervan uit dat het veld al bestaat en slaan de type-check over.`,
      );

      // Productie kan 403 geven op field-introspectie.
      // Ga er dan NIET vanuit dat het veld bestaat.
      // Laat de normale parentType === null flow het veld idempotent aanmaken.
      parentType = null;
    } else {
      throw new Error(
        `Kon type van ${NAV_COLLECTION}.parent niet ophalen: ${body}`,
      );
    }
  }

  if (parentType === null) {
    // Niet bestaand → create met juiste type
    console.log(`  · parent veld ontbreekt — aanmaken met type "${idType}"`);
    try {
      await ensureField(client, NAV_COLLECTION, buildParentFieldDef(idType));
    } catch (err) {
      throw new Error(
        `Veld navigation_items.parent aanmaken faalde: ${extractDirectusError(err)}`,
      );
    }
  } else if (parentType === idType) {
    // Goed type → niets doen
    console.log(`  · parent veld bestaat met juiste type "${parentType}" — ok`);
  } else {
    // Verkeerd type → check of we mogen recoveren
    console.log(
      `  ⚠️  parent veld heeft VERKEERD type "${parentType}" (verwacht "${idType}"). ` +
      `Dit komt door een eerdere foutieve seed-run.`,
    );
    const empty = await isFieldEmpty(client, NAV_COLLECTION, "parent");
    if (!empty) {
      throw new Error(
        `parent veld heeft data in zich — automatische recovery is onveilig. ` +
        `Verwijder eerst handmatig in Directus admin (Settings → Data Model → ` +
        `navigation_items → parent veld → ⋮ → Delete Field), zet handmatig ` +
        `eventuele parent-relaties terug op null, en draai daarna 'npm run seed' opnieuw.`,
      );
    }
    console.log(`    · parent veld is leeg — herstelbaar. Verwijderen + opnieuw aanmaken.`);
    try {
      await dropFieldAndRelation(client, NAV_COLLECTION, "parent");
    } catch (err) {
      throw new Error(
        `parent veld verwijderen faalde: ${extractDirectusError(err)}`,
      );
    }
    try {
      await ensureField(client, NAV_COLLECTION, buildParentFieldDef(idType));
      console.log(`    ✓ parent veld opnieuw aangemaakt met type "${idType}"`);
    } catch (err) {
      throw new Error(
        `parent veld opnieuw aanmaken faalde: ${extractDirectusError(err)}`,
      );
    }
  }

  // ─── C. Relation (self-reference) ────────────────────────
  try {
    await ensureRelation(client, {
      collection:         NAV_COLLECTION,
      field:              "parent",
      related_collection: NAV_COLLECTION,
      meta: {
        one_field:           null,
        sort_field:          null,
        one_deselect_action: "nullify",
      },
      schema: { on_delete: "SET NULL" },
    });
  } catch (err) {
    throw new Error(
      `Relation navigation_items.parent setup faalde: ${extractDirectusError(err)}`,
    );
  }

  // ─── D. "Over ons" zekerstellen ──────────────────────────
  let overOnsId = null;
  try {
    const existing = await findNavItem(client, "Over ons", "/dawahcommissie");
    if (existing) {
      overOnsId = existing.id;
      console.log(`  · 'Over ons' bestaat (id=${overOnsId}) — ok.`);
    } else {
      const created = await client.post(`/items/${NAV_COLLECTION}`, {
        label:     "Over ons",
        href:      "/dawahcommissie",
        sort:      20,
        highlight: false,
        external:  false,
        active:    true,
        location:  "both",
        parent:    null,
      });
      overOnsId = created?.data?.id || null;
      console.log(`  + 'Over ons' aangemaakt (id=${overOnsId})`);
    }
  } catch (err) {
    console.warn(
      `  ⚠️  'Over ons' setup faalde — details:\n     ${extractDirectusError(err)}`,
    );
    return;
  }

  if (overOnsId === null || overOnsId === undefined) {
    console.warn(`  ⚠️  'Over ons' id niet beschikbaar — skip 'Onze moskee' setup.`);
    return;
  }

  // ─── E. "Onze moskee" zoeken/aanmaken/updaten ────────────
  try {
    const existing = await findNavItem(client, "Onze moskee", "/onze-moskee");

    if (existing) {
      if (existing.parent === overOnsId) {
        console.log(`  · 'Onze moskee' is al child van 'Over ons' — ok.`);
      } else if (existing.parent === null || existing.parent === undefined) {
        await client.patch(`/items/${NAV_COLLECTION}/${existing.id}`, {
          parent: overOnsId,
        });
        console.log(`  ↻ 'Onze moskee' parent gezet → 'Over ons'`);
      } else {
        console.log(
          `  · 'Onze moskee' heeft al andere parent (${existing.parent}) — niet aangeraakt.`,
        );
      }
    } else {
      await client.post(`/items/${NAV_COLLECTION}`, {
        label:     "Onze moskee",
        href:      "/onze-moskee",
        sort:      25,
        highlight: false,
        external:  false,
        active:    true,
        location:  "header",
        parent:    overOnsId,
      });
      console.log(`  + 'Onze moskee' aangemaakt als child van 'Over ons'`);
    }
  } catch (err) {
    console.warn(
      `  ⚠️  'Onze moskee' setup faalde — details:\n     ${extractDirectusError(err)}`,
    );
  }
}
