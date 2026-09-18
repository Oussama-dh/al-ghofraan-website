// scripts/seed/steps/61-hifdh-children-model.mjs
//
// Hifdh programma — van één kind per inschrijving naar een relationeel model
// (meerdere kinderen per inschrijving).
//
//   quran_registrations           = één record per inschrijving/gezin
//   quran_registration_children   = één record per kind (M2O `registration`,
//                                   O2M-alias `children` op quran_registrations)
//
// Deze stap bouwt voort op stap 60 (die de oude één-kind-structuur aanmaakte
// en op productie al draait). Stap 60 blijft ONGEWIJZIGD; deze stap migreert.
//
// WAT DEZE STAP DOET (alles idempotent):
//   1. Maakt `quran_registration_children` + velden aan.
//   2. Maakt de O2M-alias `children` op quran_registrations aan en de
//      relatie (ON DELETE CASCADE: verwijdert een beheerder een inschrijving,
//      dan verdwijnen de bijbehorende kinderen mee).
//   3. Maakt de oude kind-kolommen op quran_registrations NULLABLE en
//      VERBORGEN ("legacy"), zodat nieuwe inschrijvingen (zonder die
//      kolommen) kunnen worden opgeslagen. GEEN kolom of collectie wordt
//      verwijderd.
//   4. Kopieert bestaande één-kind-inschrijvingen naar kind-records (alleen
//      records die nog geen kinderen hebben → herhaalbaar zonder duplicaten).
//   5. Werkt de collectie-weergave en lijstpreset bij (kinderen tonen).
//   6. Rechten: Onderwijs beheerder = read + update op de kinderen (alle
//      velden, geen create/delete) — gelijk aan quran_registrations.
//      Public krijgt niets.
//
// FAALT een cruciale stap (schema/relatie/migratie), dan gooit de stap een
// fout zodat een deployment niet stilzwijgend half wordt doorgezet.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

const FAMILY = "quran_registrations";
const CHILDREN = "quran_registration_children";
const ROLE_NAME = "Onderwijs beheerder";

const GENDER_CHOICES = [
  { text: "Jongen", value: "male" },
  { text: "Meisje", value: "female" },
];

// Oude kolom op quran_registrations → veld op quran_registration_children
const LEGACY_TO_CHILD = {
  child_first_name: "first_name",
  child_last_name: "last_name",
  child_birth_date: "birth_date",
  child_gender: "gender",
  reading_level: "reading_level",
  reading_notes: "reading_notes",
  writing_level: "writing_level",
  writing_notes: "writing_notes",
  special_considerations: "special_considerations",
  special_considerations_notes: "special_considerations_notes",
};
const LEGACY_FIELDS = Object.keys(LEGACY_TO_CHILD);

const LEGACY_NOTE =
  "LEGACY — één-kind-structuur van vóór het Hifdh programma met meerdere kinderen. " +
  "Gegevens zijn gekopieerd naar 'Kinderen' (quran_registration_children). Niet meer gebruiken.";

// ─── Veld-helpers (zelfde stijl als stap 60) ─────────────────

function textField(field, note, { width = "half", required = true } = {}) {
  return {
    field,
    type: "string",
    meta: { width, interface: "input", required, note },
    schema: { is_nullable: !required },
  };
}

function longTextField(field, note, { required = false } = {}) {
  return {
    field,
    type: "text",
    meta: { width: "full", interface: "input-multiline", required, note },
    schema: { is_nullable: !required },
  };
}

function levelField(field, note) {
  return {
    field,
    type: "integer",
    meta: { width: "half", interface: "input", required: true, note, options: { min: 1, max: 10 } },
    schema: { is_nullable: false },
  };
}

const CHILD_FIELDS = [
  {
    field: "registration",
    type: "integer",
    meta: {
      width: "half",
      interface: "select-dropdown-m2o",
      special: ["m2o"],
      required: true,
      note: "Inschrijving waartoe dit kind behoort",
      options: { template: "{{contact_1_name}} (#{{id}})" },
      display: "related-values",
      display_options: { template: "{{contact_1_name}} (#{{id}})" },
    },
    schema: { is_nullable: false },
  },
  {
    field: "sort",
    type: "integer",
    meta: { width: "half", interface: "input", hidden: true, note: "Volgorde binnen de inschrijving (kind 1, 2, …)" },
    schema: { is_nullable: true },
  },
  textField("first_name", "Voornaam kind"),
  textField("last_name", "Achternaam kind"),
  {
    field: "birth_date",
    type: "date",
    meta: { width: "half", interface: "datetime", required: true, note: "Geboortedatum kind" },
    schema: { is_nullable: false },
  },
  {
    field: "gender",
    type: "string",
    meta: {
      width: "half",
      interface: "select-dropdown",
      required: true,
      note: "Geslacht kind",
      options: { choices: GENDER_CHOICES },
      display: "labels",
      display_options: { choices: GENDER_CHOICES },
    },
    schema: { is_nullable: false },
  },
  levelField("reading_level", "Leesniveau Arabisch, 1 t/m 10 (1–4 zwak · 5 voldoende · 6–10 goed)"),
  longTextField("reading_notes", "Eventuele toelichting bij het leesniveau (optioneel)"),
  levelField("writing_level", "Schrijfniveau Arabisch, 1 t/m 10 (1–4 zwak · 5 voldoende · 6–10 goed)"),
  longTextField("writing_notes", "Eventuele toelichting bij het schrijfniveau (optioneel)"),
  {
    field: "special_considerations",
    type: "boolean",
    meta: { width: "half", interface: "boolean", note: "Bijzonderheden waar tijdens de lessen rekening mee moet worden gehouden" },
    schema: { default_value: false, is_nullable: false },
  },
  longTextField("special_considerations_notes", "Toelichting (verplicht in het formulier bij 'Ja') — vertrouwelijk behandelen"),
  {
    field: "created_at",
    type: "timestamp",
    meta: { width: "half", interface: "datetime", readonly: true, special: ["date-created"], note: "Aangemaakt" },
    schema: {},
  },
  {
    field: "updated_at",
    type: "timestamp",
    meta: { width: "half", interface: "datetime", readonly: true, special: ["date-updated"], note: "Laatst gewijzigd" },
    schema: {},
  },
];

// Alias-veld op de inschrijving: toont de kinderen in Directus.
const CHILDREN_ALIAS = {
  field: "children",
  type: "alias",
  schema: null,
  meta: {
    width: "full",
    interface: "list-o2m",
    special: ["o2m"],
    note: "Kinderen bij deze inschrijving",
    options: {
      template: "{{first_name}} {{last_name}} — lezen {{reading_level}}/10, schrijven {{writing_level}}/10",
    },
    display: "related-values",
    display_options: { template: "{{first_name}} {{last_name}}" },
  },
};

const LIST_FIELDS = [
  "children",
  "contact_1_name", "contact_1_phone",
  "payment_frequency",
  "status", "created_at",
];

export async function setupHifdhChildrenModel(client) {
  console.log("\n👨‍👩‍👧 Stap 61 · Hifdh programma: kinderen-model + migratie");

  // Voorwaarde: stap 60 (quran_registrations) moet bestaan.
  try {
    await client.get(`/collections/${FAMILY}`);
  } catch {
    throw new Error(`Collectie "${FAMILY}" bestaat niet — draai eerst stap 60.`);
  }

  // 1. Kinderen-collectie + velden
  await ensureCollection(client, {
    collection: CHILDREN,
    meta: {
      icon: "child_care",
      note: "Kinderen bij een Hifdh programma-inschrijving (één record per kind). Beheer via de inschrijving.",
      display_template: "{{first_name}} {{last_name}}",
      sort_field: "sort",
    },
    schema: {},
  });
  for (const f of CHILD_FIELDS) {
    await ensureField(client, CHILDREN, f);
  }

  // 2. O2M-alias + relatie
  await ensureField(client, FAMILY, CHILDREN_ALIAS);
  await ensureRelation(client);

  // 3. Legacy-kolommen: nullable + verborgen (niets verwijderen)
  await relaxLegacyFields(client);

  // 4. Data migreren
  await migrateLegacyRows(client);

  // 5. Weergave + lijstpreset
  await updateFamilyPresentation(client);

  // 6. Rechten
  await setupPermissions(client);

  console.log("✓ Stap 61 voltooid");
}

// ─── Relatie ─────────────────────────────────────────────────

async function ensureRelation(client) {
  try {
    await client.get(`/relations/${CHILDREN}/registration`);
    console.log("  · relatie quran_registration_children.registration → quran_registrations bestaat al");
    return;
  } catch (err) {
    if (!/→\s*40[34]/.test(err.message || "")) throw err;
  }
  await client.post("/relations", {
    collection: CHILDREN,
    field: "registration",
    related_collection: FAMILY,
    meta: {
      one_field: "children",
      sort_field: "sort",
      one_deselect_action: "delete",
    },
    schema: { on_delete: "CASCADE" },
  });
  console.log("  ✓ relatie aangemaakt (O2M children ↔ M2O registration, ON DELETE CASCADE)");
}

// ─── Legacy-kolommen ─────────────────────────────────────────

async function relaxLegacyFields(client) {
  for (const name of LEGACY_FIELDS) {
    let existing;
    try {
      existing = (await client.get(`/fields/${FAMILY}/${name}`))?.data;
    } catch (err) {
      if (/→\s*40[34]/.test(err.message || "")) continue; // veld bestaat niet: niets te doen
      throw err;
    }
    const needsNullable = existing?.schema?.is_nullable === false;
    const needsMeta = existing?.meta?.required === true || existing?.meta?.hidden !== true;
    if (!needsNullable && !needsMeta) {
      console.log(`  · legacy ${FAMILY}.${name}: al nullable + verborgen`);
      continue;
    }
    await client.patch(`/fields/${FAMILY}/${name}`, {
      type: existing.type,
      schema: needsNullable ? { is_nullable: true } : undefined,
      meta: { required: false, hidden: true, readonly: true, note: LEGACY_NOTE },
    });
    console.log(`  ↻ legacy ${FAMILY}.${name}: nullable + verborgen`);
  }
}

// ─── Data-migratie: oude één-kind-rijen → kind-records ───────

async function migrateLegacyRows(client) {
  const fields = ["id", ...LEGACY_FIELDS, "children"].join(",");
  let rows;
  try {
    rows = (await client.get(
      `/items/${FAMILY}?limit=-1&fields=${fields}&filter[child_first_name][_nnull]=true`,
    ))?.data || [];
  } catch (err) {
    if (/→\s*40[034]/.test(err.message || "")) {
      console.log("  · geen legacy-kolommen leesbaar — migratie overgeslagen");
      return;
    }
    throw err;
  }

  let migrated = 0;
  let skipped = 0;
  for (const row of rows) {
    if (Array.isArray(row.children) && row.children.length > 0) {
      skipped += 1; // al gemigreerd (of al nieuw model)
      continue;
    }
    const child = { registration: row.id, sort: 1 };
    for (const [legacy, target] of Object.entries(LEGACY_TO_CHILD)) {
      if (row[legacy] !== undefined) child[target] = row[legacy];
    }
    await client.post(`/items/${CHILDREN}`, child);
    migrated += 1;
  }
  console.log(`  ✓ migratie: ${migrated} inschrijving(en) naar kind-record gekopieerd, ${skipped} overgeslagen (al gemigreerd)`);
}

// ─── Weergave + lijstpreset ──────────────────────────────────

async function updateFamilyPresentation(client) {
  // Collectie-weergave: op naam eerste contactpersoon i.p.v. de (legacy) kindnaam.
  const wanted = {
    display_template: "{{contact_1_name}}",
    note: "Inschrijvingen Hifdh programma (/onderwijs/hifdhprogramma). Eén record per inschrijving; de kinderen staan in het veld 'Kinderen'. Medewerkers volgen op via de status.",
  };
  const cur = (await client.get(`/collections/${FAMILY}`))?.data?.meta || {};
  if (cur.display_template !== wanted.display_template || cur.note !== wanted.note) {
    await client.patch(`/collections/${FAMILY}`, { meta: wanted });
    console.log(`  ↻ ${FAMILY}: collectie-weergave bijgewerkt`);
  } else {
    console.log(`  · ${FAMILY}: collectie-weergave al up-to-date`);
  }

  // Globale lijstpreset
  const search = await client.get(
    `/presets?filter[collection][_eq]=${encodeURIComponent(FAMILY)}` +
      `&filter[role][_null]=true&filter[user][_null]=true&limit=1`,
  );
  const existing = search?.data?.[0];
  const payload = {
    collection: FAMILY,
    role: null,
    user: null,
    layout: "tabular",
    layout_query: { tabular: { sort: ["-created_at"] } },
    layout_options: { tabular: { fields: LIST_FIELDS } },
  };
  if (!existing) {
    await client.post("/presets", payload);
    console.log(`  ✓ ${FAMILY}: lijstpreset aangemaakt`);
  } else {
    const same =
      existing.layout === payload.layout &&
      JSON.stringify(existing.layout_options) === JSON.stringify(payload.layout_options) &&
      JSON.stringify(existing.layout_query) === JSON.stringify(payload.layout_query);
    if (same) {
      console.log(`  · ${FAMILY}: lijstpreset al up-to-date`);
    } else {
      await client.patch(`/presets/${existing.id}`, payload);
      console.log(`  ↻ ${FAMILY}: lijstpreset bijgewerkt`);
    }
  }
}

// ─── Rechten ─────────────────────────────────────────────────

async function setupPermissions(client) {
  const roles = await client.get(`/roles?filter[name][_eq]=${encodeURIComponent(ROLE_NAME)}&limit=1`);
  if (!roles?.data?.[0]) {
    console.log(`  · rol "${ROLE_NAME}" bestaat niet (draai stap 25) — permissions overgeslagen`);
    return;
  }
  const pol = await client.get(`/policies?filter[name][_eq]=${encodeURIComponent(ROLE_NAME)}&limit=1`);
  const policyId = pol?.data?.[0]?.id;
  if (!policyId) {
    console.log(`  · policy "${ROLE_NAME}" niet gevonden — permissions overgeslagen`);
    return;
  }

  for (const action of ["read", "update"]) {
    const existing = await client.get(
      `/permissions?filter[policy][_eq]=${policyId}` +
        `&filter[collection][_eq]=${CHILDREN}&filter[action][_eq]=${action}&limit=1`,
    );
    if (existing?.data?.[0]) {
      console.log(`  · permission ${CHILDREN}/${action} bestaat al`);
      continue;
    }
    await client.post("/permissions", {
      policy: policyId,
      collection: CHILDREN,
      action,
      fields: ["*"],
      permissions: null,
      validation: null,
    });
    console.log(`  ✓ permission ${CHILDREN}/${action} aangemaakt (${ROLE_NAME})`);
  }
}
