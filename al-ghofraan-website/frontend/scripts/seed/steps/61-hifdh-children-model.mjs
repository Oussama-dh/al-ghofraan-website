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
//   5. Admin-weergave in Directus (idempotent, ook op bestaande installaties):
//        - Nederlandse collectienamen en veldlabels (translations)
//        - veldvolgorde: status, Kinderen, contactgegevens, betaling, …
//        - O2M-interface 'Kinderen' als tabel (naam, geboortedatum, geslacht,
//          leesniveau, schrijfniveau, bijzonderheden) direct op de inschrijving
//        - lijstpresets: kolommen staan in layout_query.tabular.fields (dáár
//          leest Directus ze); verwijdert oude kind-kolommen ook uit
//          gebruikersspecifieke presets
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

// O2M-interface: kinderen als tabel direct op de inschrijving. Aanmaken en
// koppelen van bestaande kinderen is uitgeschakeld (kinderen komen uit het
// formulier); bewerken via de rij blijft mogelijk.
const CHILDREN_INTERFACE_OPTIONS = {
  layout: "table",
  fields: [
    "first_name", "last_name", "birth_date", "gender",
    "reading_level", "writing_level", "special_considerations",
  ],
  enableCreate: false,
  enableSelect: false,
  limit: 20,
};

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
    options: CHILDREN_INTERFACE_OPTIONS,
    display: "related-values",
    display_options: { template: "{{first_name}} {{last_name}}" },
  },
};

// Kinderen als geneste kolommen (children.first_name → "Yusuf, Amina"): de kale
// O2M-kolom "children" toont in de lijst alleen een telling ("2 Kinderen").
const CHILDREN_LIST_COLUMNS = ["children.first_name", "children.last_name"];

const LIST_FIELDS = [
  ...CHILDREN_LIST_COLUMNS,
  "contact_1_name", "contact_1_phone",
  "payment_frequency",
  "status", "created_at",
];

const CHILD_LIST_FIELDS = [
  "first_name", "last_name", "birth_date", "gender",
  "reading_level", "writing_level", "special_considerations",
  "registration",
];

// Nederlandse namen in Directus (translations). Voor zowel nl-NL als en-US, zodat
// het ook klopt als het admin-account op Engels staat. Technische veldnamen blijven Engels.
const LANGS = ["nl-NL", "en-US"];

const COLLECTION_LABELS = {
  [FAMILY]:   { translation: "Hifdh inschrijvingen", singular: "Hifdh inschrijving", plural: "Hifdh inschrijvingen" },
  [CHILDREN]: { translation: "Hifdh kinderen",       singular: "Kind",               plural: "Kinderen" },
};

const FAMILY_LABELS = {
  status: "Status",
  children: "Kinderen",
  involved_guardians: "Betrokken ouder(s)/verzorger(s)",
  involved_guardians_other: "Betrokken — namelijk",
  contact_1_name: "Eerste contactpersoon — naam",
  contact_1_relation: "Eerste contactpersoon — relatie",
  contact_1_relation_other: "Eerste contactpersoon — relatie (toelichting)",
  contact_1_phone: "Eerste contactpersoon — telefoon",
  contact_1_email: "Eerste contactpersoon — e-mail",
  secondary_contact_absent: "Geen tweede contactpersoon",
  secondary_contact_name: "Tweede contactpersoon — naam",
  secondary_contact_relation: "Tweede contactpersoon — relatie",
  secondary_contact_relation_other: "Tweede contactpersoon — relatie (toelichting)",
  secondary_contact_phone: "Tweede contactpersoon — telefoon",
  secondary_contact_email: "Tweede contactpersoon — e-mail",
  payment_frequency: "Betalingsperiode",
  additional_notes: "Aanvullende opmerkingen",
  consent_given: "Toestemming gegeven",
  created_at: "Ingeschreven op",
  updated_at: "Laatst gewijzigd",
};

const CHILD_LABELS = {
  registration: "Inschrijving",
  sort: "Volgorde",
  first_name: "Voornaam",
  last_name: "Achternaam",
  birth_date: "Geboortedatum",
  gender: "Geslacht",
  reading_level: "Leesniveau Arabisch",
  reading_notes: "Toelichting leesniveau",
  writing_level: "Schrijfniveau Arabisch",
  writing_notes: "Toelichting schrijfniveau",
  special_considerations: "Bijzonderheden",
  special_considerations_notes: "Toelichting bijzonderheden",
  created_at: "Aangemaakt",
  updated_at: "Laatst gewijzigd",
};

// Volgorde in het Directus-formulier (lager = hoger). Kinderen direct onder de status;
// legacy-velden (verborgen) onderaan.
const FAMILY_ORDER = [
  "id", "status", "children",
  "involved_guardians", "involved_guardians_other",
  "contact_1_name", "contact_1_relation", "contact_1_relation_other", "contact_1_phone", "contact_1_email",
  "secondary_contact_absent", "secondary_contact_name", "secondary_contact_relation",
  "secondary_contact_relation_other", "secondary_contact_phone", "secondary_contact_email",
  "payment_frequency", "additional_notes", "consent_given",
  "created_at", "updated_at",
  ...LEGACY_FIELDS,
];

const CHILD_ORDER = [
  "id", "registration", "sort",
  "first_name", "last_name", "birth_date", "gender",
  "reading_level", "reading_notes", "writing_level", "writing_notes",
  "special_considerations", "special_considerations_notes",
  "created_at", "updated_at",
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

  // 5. Weergave: collectienamen, labels, volgorde, O2M-interface, presets
  await updateFamilyPresentation(client);
  await updateAdminPresentation(client);

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

// ─── Weergave: collectie-instellingen ────────────────────────

async function updateFamilyPresentation(client) {
  // Collectie-weergave: op naam eerste contactpersoon i.p.v. de (legacy) kindnaam.
  const wanted = {
    display_template: "{{contact_1_name}}",
    note: "Inschrijvingen Hifdh programma. Eén record per inschrijving; de kinderen staan direct onder de status in het veld 'Kinderen'. Medewerkers volgen op via de status.",
  };
  const cur = (await client.get(`/collections/${FAMILY}`))?.data?.meta || {};
  if (cur.display_template !== wanted.display_template || cur.note !== wanted.note) {
    await client.patch(`/collections/${FAMILY}`, { meta: wanted });
    console.log(`  ↻ ${FAMILY}: collectie-weergave bijgewerkt`);
  } else {
    console.log(`  · ${FAMILY}: collectie-weergave al up-to-date`);
  }
}

// ─── Admin-weergave: labels, volgorde, O2M-interface, presets ─

const sameJson = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const translationsFor = (text) => LANGS.map((language) => ({ language, translation: text }));

async function updateAdminPresentation(client) {
  // 1. Collectienamen (Nederlands)
  for (const [collection, l] of Object.entries(COLLECTION_LABELS)) {
    const wanted = LANGS.map((language) => ({ language, translation: l.translation, singular: l.singular, plural: l.plural }));
    const cur = (await client.get(`/collections/${collection}`))?.data?.meta?.translations;
    if (!sameJson(cur, wanted)) {
      await client.patch(`/collections/${collection}`, { meta: { translations: wanted } });
      console.log(`  ↻ ${collection}: Nederlandse collectienaam`);
    } else {
      console.log(`  · ${collection}: collectienaam al up-to-date`);
    }
  }

  // 2. Veldlabels
  await ensureLabels(client, FAMILY, FAMILY_LABELS);
  await ensureLabels(client, CHILDREN, CHILD_LABELS);

  // 3. O2M-interface 'Kinderen' als tabel
  const alias = (await client.get(`/fields/${FAMILY}/children`))?.data;
  if (alias && !sameJson(alias.meta?.options, CHILDREN_INTERFACE_OPTIONS)) {
    await client.patch(`/fields/${FAMILY}/children`, {
      type: alias.type,
      meta: { options: CHILDREN_INTERFACE_OPTIONS, interface: "list-o2m", width: "full" },
    });
    console.log(`  ↻ ${FAMILY}.children: O2M-interface als tabel`);
  } else {
    console.log(`  · ${FAMILY}.children: O2M-interface al up-to-date`);
  }

  // 4. Veldvolgorde
  await ensureOrder(client, FAMILY, FAMILY_ORDER);
  await ensureOrder(client, CHILDREN, CHILD_ORDER);

  // 5. Lijstpresets (kolommen horen in layout_query.tabular.fields)
  await ensureGlobalPreset(client, FAMILY, LIST_FIELDS, ["-created_at"]);
  await ensureGlobalPreset(client, CHILDREN, CHILD_LIST_FIELDS, ["-registration", "sort"]);
  await sanitizeUserPresets(client, FAMILY, LIST_FIELDS);
}

async function ensureLabels(client, collection, labels) {
  let changed = 0;
  for (const [field, text] of Object.entries(labels)) {
    let existing;
    try {
      existing = (await client.get(`/fields/${collection}/${field}`))?.data;
    } catch (err) {
      if (/→\s*40[34]/.test(err.message || "")) continue;
      throw err;
    }
    const wanted = translationsFor(text);
    if (sameJson(existing?.meta?.translations, wanted)) continue;
    await client.patch(`/fields/${collection}/${field}`, { type: existing.type, meta: { translations: wanted } });
    changed += 1;
  }
  console.log(changed ? `  ↻ ${collection}: ${changed} veldlabel(s) Nederlands` : `  · ${collection}: veldlabels al up-to-date`);
}

async function ensureOrder(client, collection, order) {
  const fields = (await client.get(`/fields/${collection}`))?.data || [];
  const current = Object.fromEntries(fields.map((f) => [f.field, f.meta?.sort ?? null]));
  const updates = [];
  order.forEach((field, i) => {
    if (field in current && current[field] !== i + 1) updates.push({ field, meta: { sort: i + 1 } });
  });
  if (updates.length === 0) {
    console.log(`  · ${collection}: veldvolgorde al up-to-date`);
    return;
  }
  await client.patch(`/fields/${collection}`, updates);
  console.log(`  ↻ ${collection}: veldvolgorde bijgewerkt (${updates.length} velden)`);
}

async function ensureGlobalPreset(client, collection, fields, sort) {
  const search = await client.get(
    `/presets?filter[collection][_eq]=${encodeURIComponent(collection)}` +
      `&filter[role][_null]=true&filter[user][_null]=true&limit=1`,
  );
  const existing = search?.data?.[0];
  // Directus leest de kolommen uit layout_query.tabular.fields (niet uit layout_options).
  const payload = {
    collection,
    role: null,
    user: null,
    layout: "tabular",
    layout_query: { tabular: { fields, sort } },
    layout_options: { tabular: {} },
  };
  if (!existing) {
    await client.post("/presets", payload);
    console.log(`  ✓ ${collection}: lijstpreset aangemaakt`);
    return;
  }
  const same =
    existing.layout === payload.layout &&
    sameJson(existing.layout_query, payload.layout_query) &&
    sameJson(existing.layout_options, payload.layout_options);
  if (same) {
    console.log(`  · ${collection}: lijstpreset al up-to-date`);
  } else {
    await client.patch(`/presets/${existing.id}`, payload);
    console.log(`  ↻ ${collection}: lijstpreset bijgewerkt (kolommen in layout_query)`);
  }
}

/**
 * Gebruikers- of rolspecifieke presets (Directus maakt die automatisch aan zodra
 * iemand de lijst bekijkt) kunnen de oude kind-kolommen nog bevatten en winnen van
 * de globale preset. Verwijder alleen de legacy-kolommen; overige eigen keuzes
 * van de gebruiker blijven staan.
 */
async function sanitizeUserPresets(client, collection, defaultFields) {
  const presets = (await client.get(
    `/presets?filter[collection][_eq]=${encodeURIComponent(collection)}&limit=-1`,
  ))?.data || [];
  let fixed = 0;
  for (const p of presets) {
    if (p.role === null && p.user === null) continue; // globale preset: al afgehandeld
    const q = p.layout_query?.tabular || {};
    const o = p.layout_options?.tabular || {};
    const fromQuery = Array.isArray(q.fields) ? q.fields : null;
    const fromOptions = Array.isArray(o.fields) ? o.fields : null;
    const current = fromQuery || fromOptions;
    const usesLegacy = current && current.some((f) => LEGACY_FIELDS.includes(f));
    const sortLegacy = Array.isArray(q.sort) && q.sort.some((f) => LEGACY_FIELDS.includes(String(f).replace(/^-/, "")));
    if (!usesLegacy && !sortLegacy) continue;
    let fields = (current || defaultFields).filter((f) => !LEGACY_FIELDS.includes(f));
    // Kale "children"-kolom (telling) vervangen door de geneste kindnamen.
    fields = fields.flatMap((f) => (f === "children" ? CHILDREN_LIST_COLUMNS : [f]));
    if (!fields.some((f) => f.startsWith("children."))) fields = [...CHILDREN_LIST_COLUMNS, ...fields];
    const query = { ...(p.layout_query || {}), tabular: { ...q, fields, sort: sortLegacy ? ["-created_at"] : q.sort } };
    await client.patch(`/presets/${p.id}`, { layout_query: query });
    fixed += 1;
  }
  console.log(fixed
    ? `  ↻ ${collection}: ${fixed} gebruikerspreset(s) ontdaan van oude kind-kolommen`
    : `  · ${collection}: geen gebruikerspresets met oude kind-kolommen`);
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
