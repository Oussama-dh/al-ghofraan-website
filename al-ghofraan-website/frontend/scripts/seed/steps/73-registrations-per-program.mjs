// scripts/seed/steps/73-registrations-per-program.mjs
//
// Inschrijvingen per onderwijsprogramma, kinderen en volwassenen gescheiden.
//
//   adult_registrations   = nieuwe collectie voor volwassenenonderwijs (één
//                           persoon per record, M2O `program`); vervangt de
//                           volwassenen-records in `registrations` uit stap 72
//   quran_registrations   = kinderonderwijs; krijgt een M2O `program`
//   education_programs    = twee O2M-lijsten: "Inschrijvingen (kinderen)" en
//                           "Inschrijvingen (volwassenen)", elk alleen zichtbaar
//                           bij de bijbehorende doelgroep
//   bladwijzers           = per programma een vaste weergave in het zijmenu,
//                           onder de juiste collectie (gefilterd op programma)
//
// Idempotent en niet-destructief:
//   - Bestaande collecties, velden, rechten en bladwijzers blijven staan
//     (een door een beheerder hernoemde bladwijzer wordt niet teruggezet).
//   - Collectienamen worden alleen gezet als er nog geen vertaling is.
//   - Nieuwe programma's krijgen hun bladwijzer bij de volgende run van deze
//     stap (`--only 73`); de lijst op het programma zelf werkt direct.
//   - registrations.first_name/last_name (stap 72) worden alleen verwijderd
//     zolang geen enkel record een waarde heeft.
//
// Public krijgt geen rechten; het formulier schrijft met het server-token.
// Onderwijs beheerder: read + update (geen create/delete), zoals stap 60.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

const PROGRAMS = "education_programs";
const ADULTS = "adult_registrations";
const CHILDREN = "quran_registrations";
const ROLE_NAME = "Onderwijs beheerder";
const LANGS = ["nl-NL", "en-US"];

const STATUS_CHOICES = [
  { text: "Nieuw", value: "new" },
  { text: "Gecontacteerd", value: "contacted" },
  { text: "Bevestigd", value: "confirmed" },
  { text: "Wachtlijst", value: "waiting_list" },
  { text: "Geannuleerd", value: "cancelled" },
];
const STATUS_DISPLAY = [
  { text: "Nieuw", value: "new", foreground: "#FFFFFF", background: "#3A6F8F" },
  { text: "Gecontacteerd", value: "contacted", foreground: "#18222F", background: "#E0C77A" },
  { text: "Bevestigd", value: "confirmed", foreground: "#FFFFFF", background: "#2ECDA7" },
  { text: "Wachtlijst", value: "waiting_list", foreground: "#18222F", background: "#D3DAE4" },
  { text: "Geannuleerd", value: "cancelled", foreground: "#FFFFFF", background: "#A2B5CD" },
];

const ADULT_LIST_FIELDS = ["first_name", "last_name", "age", "phone", "email", "status", "created_at"];
const CHILD_LIST_FIELDS = [
  "contact_1_name", "contact_1_phone", "contact_1_email", "payment_frequency", "status", "created_at",
];

function programField(note) {
  return {
    field: "program",
    type: "integer",
    meta: {
      width: "half",
      interface: "select-dropdown-m2o",
      special: ["m2o"],
      readonly: true,
      note,
      options: { template: "{{title}}" },
      display: "related-values",
      display_options: { template: "{{title}}" },
    },
    // Nullable: verwijderen van een programma laat de inschrijving staan
    // (program_title bewaart dan nog de naam).
    schema: { is_nullable: true },
  };
}

const text = (field, note, required = true) => ({
  field,
  type: "string",
  meta: { width: "half", interface: "input", required, note },
  schema: { is_nullable: !required },
});

const ADULT_FIELDS = [
  programField("Programma waarvoor is ingeschreven"),
  {
    field: "program_title",
    type: "string",
    meta: { width: "half", interface: "input", readonly: true, note: "Titel van het programma op het moment van inschrijven" },
    schema: { is_nullable: true },
  },
  text("first_name", "Voornaam"),
  text("last_name", "Achternaam"),
  text("phone", "Genormaliseerd: 0612345678 of +31612345678"),
  text("email", "E-mailadres"),
  {
    field: "age",
    type: "integer",
    meta: { width: "half", interface: "input", required: true, note: "Leeftijd bij inschrijving (jaren)" },
    schema: { is_nullable: false },
  },
  {
    field: "consent_given",
    type: "boolean",
    meta: { width: "half", interface: "boolean", readonly: true, note: "Verklaring naar waarheid + toestemming gegevensgebruik (privacy)" },
    schema: { default_value: false, is_nullable: false },
  },
  {
    field: "notes",
    type: "text",
    meta: { width: "full", interface: "input-multiline", note: "Interne notities (niet zichtbaar voor de deelnemer)" },
    schema: { is_nullable: true },
  },
  {
    field: "status",
    type: "string",
    meta: {
      width: "half",
      interface: "select-dropdown",
      options: { choices: STATUS_CHOICES },
      display: "labels",
      display_options: { choices: STATUS_DISPLAY },
    },
    schema: { default_value: "new", is_nullable: false },
  },
  {
    field: "created_at",
    type: "timestamp",
    meta: { width: "half", interface: "datetime", readonly: true, special: ["date-created"], note: "Datum inschrijving" },
    schema: {},
  },
  {
    field: "updated_at",
    type: "timestamp",
    meta: { width: "half", interface: "datetime", readonly: true, special: ["date-updated"], note: "Laatst gewijzigd" },
    schema: {},
  },
];

function o2mAlias(field, label, audience, listFields, template) {
  return {
    field,
    type: "alias",
    schema: null,
    meta: {
      width: "full",
      interface: "list-o2m",
      special: ["o2m"],
      note: "Inschrijvingen voor dit programma (komen binnen via het formulier op de website).",
      options: { layout: "table", fields: listFields, limit: 25, enableCreate: false, enableSelect: false },
      display: "related-values",
      display_options: { template },
      translations: LANGS.map((language) => ({ language, translation: label })),
      conditions: [
        { name: `Alleen bij doelgroep ${audience}`, rule: { audience: { _neq: audience } }, hidden: true },
      ],
    },
  };
}

async function ensureRelation(client, collection, oneField) {
  try {
    await client.get(`/relations/${collection}/program`);
    console.log(`  · relatie ${collection}.program → ${PROGRAMS} bestaat al`);
  } catch (err) {
    if (!/→\s*40[34]/.test(err.message || "")) throw err;
    await client.post("/relations", {
      collection,
      field: "program",
      related_collection: PROGRAMS,
      meta: { one_field: oneField, one_deselect_action: "nullify" },
      schema: { on_delete: "SET NULL" },
    });
    console.log(`  ✓ relatie ${collection}.program ↔ ${PROGRAMS}.${oneField} aangemaakt`);
  }
}

async function ensureCollectionName(client, collection, name, singular) {
  const meta = (await client.get(`/collections/${collection}`))?.data?.meta;
  if (Array.isArray(meta?.translations) && meta.translations.length > 0) return;
  await client.patch(`/collections/${collection}`, {
    meta: { translations: LANGS.map((language) => ({ language, translation: name, singular, plural: name })) },
  });
  console.log(`  ↻ ${collection}: naam "${name}"`);
}

export async function setupRegistrationsPerProgram(client) {
  console.log("\n🗂️  Stap 73 · Inschrijvingen per onderwijsprogramma (kinderen / volwassenen gescheiden)");

  for (const c of [PROGRAMS, CHILDREN]) {
    try {
      await client.get(`/collections/${c}`);
    } catch {
      throw new Error(`Collectie "${c}" bestaat niet — draai eerst stap 11/60.`);
    }
  }

  // ── Volwassenen: eigen collectie ───────────────────────────
  await ensureCollection(client, {
    collection: ADULTS,
    meta: {
      icon: "school",
      note: "Inschrijvingen volwassenenonderwijs. Nieuwe inschrijvingen komen uit het formulier op /onderwijs/[programma].",
      display_template: "{{first_name}} {{last_name}} — {{program_title}}",
      archive_field: "status",
      archive_value: "cancelled",
      unarchive_value: "new",
      translations: LANGS.map((language) => ({
        language,
        translation: "Inschrijvingen volwassenenonderwijs",
        singular: "Inschrijving volwassenenonderwijs",
        plural: "Inschrijvingen volwassenenonderwijs",
      })),
    },
    schema: {},
  });
  for (const f of ADULT_FIELDS) await ensureField(client, ADULTS, f);
  await ensureRelation(client, ADULTS, "adult_registrations");

  // ── Kinderen: programma-koppeling op quran_registrations ───
  await ensureField(client, CHILDREN, programField("Kinderprogramma waarvoor is ingeschreven"));
  await ensureRelation(client, CHILDREN, "child_registrations");
  await ensureCollectionName(client, CHILDREN, "Inschrijvingen kinderonderwijs", "Inschrijving kinderonderwijs");

  // Bestaande kinderinschrijvingen koppelen via program_slug (stap 72).
  const programs = (await client.get(`/items/${PROGRAMS}?fields=id,slug,title,status,audience&limit=-1`))?.data ?? [];
  const idBySlug = new Map(programs.map((p) => [p.slug, p.id]));
  const loose = (await client.get(`/items/${CHILDREN}?filter[program][_null]=true&fields=id,program_slug&limit=-1`))?.data ?? [];
  let linked = 0;
  for (const r of loose) {
    const id = idBySlug.get(r.program_slug);
    if (id === undefined) continue;
    await client.patch(`/items/${CHILDREN}/${r.id}`, { program: id });
    linked += 1;
  }
  if (linked > 0) console.log(`  ↻ ${linked} kinderinschrijving(en) aan hun programma gekoppeld`);

  // ── Lijsten op het programma zelf ──────────────────────────
  await ensureField(
    client, PROGRAMS,
    o2mAlias("child_registrations", "Inschrijvingen (kinderen)", "children",
      ["contact_1_name", "contact_1_phone", "status", "created_at"], "{{contact_1_name}}"),
  );
  await ensureField(
    client, PROGRAMS,
    o2mAlias("adult_registrations", "Inschrijvingen (volwassenen)", "adults",
      ["first_name", "last_name", "phone", "status", "created_at"], "{{first_name}} {{last_name}}"),
  );

  await ensureListPreset(client, ADULTS, ADULT_LIST_FIELDS);
  await ensurePermissions(client, ADULTS);
  await ensureBookmarks(client, programs);
  await dropUnusedRegistrationNameFields(client);

  console.log("✓ Stap 73 voltooid");
}

// ─── Lijstweergave (globale preset, zoals stap 60) ─────────────
async function ensureListPreset(client, collection, fields) {
  try {
    const existing = (
      await client.get(
        `/presets?filter[collection][_eq]=${collection}&filter[role][_null]=true&filter[user][_null]=true&filter[bookmark][_null]=true&limit=1`,
      )
    )?.data?.[0];
    if (existing) {
      console.log(`  · ${collection}: lijstweergave bestaat al`);
      return;
    }
    await client.post("/presets", {
      collection,
      role: null,
      user: null,
      layout: "tabular",
      layout_query: { tabular: { sort: ["-created_at"] } },
      layout_options: { tabular: { fields } },
    });
    console.log(`  ✓ ${collection}: lijstweergave aangemaakt`);
  } catch (err) {
    console.warn(`  ⚠ ${collection}: lijstweergave mislukt (${err.message})`);
  }
}

// ─── Rechten: Onderwijs beheerder = read + update ──────────────
async function ensurePermissions(client, collection) {
  let policyId;
  try {
    policyId = (await client.get(`/policies?filter[name][_eq]=${encodeURIComponent(ROLE_NAME)}&limit=1`))?.data?.[0]?.id;
  } catch (err) {
    console.warn(`  ⚠ policy-lookup mislukt (${err.message}) — rechten overgeslagen`);
    return;
  }
  if (!policyId) {
    console.log(`  · policy "${ROLE_NAME}" niet gevonden (draai stap 25) — rechten overgeslagen`);
    return;
  }
  for (const action of ["read", "update"]) {
    const existing = (
      await client.get(
        `/permissions?filter[policy][_eq]=${policyId}&filter[collection][_eq]=${collection}&filter[action][_eq]=${action}&limit=1`,
      )
    )?.data?.[0];
    if (existing) continue;
    await client.post("/permissions", {
      policy: policyId, collection, action, fields: ["*"], permissions: null, validation: null, presets: null,
    });
    console.log(`  ✓ permission ${collection}/${action} (${ROLE_NAME})`);
  }
}

// ─── Bladwijzer per programma (zijmenu onder de collectie) ─────
async function ensureBookmarks(client, programs) {
  const existing = (
    await client.get(
      `/presets?filter[bookmark][_nnull]=true&filter[collection][_in]=${ADULTS},${CHILDREN}&filter[user][_null]=true&fields=id,collection,filter&limit=-1`,
    )
  )?.data ?? [];
  const has = (collection, programId) =>
    existing.some((p) => p.collection === collection && String(p.filter?.program?._eq) === String(programId));

  for (const p of programs) {
    if (p.status === "archived" || (p.audience !== "children" && p.audience !== "adults")) continue;
    const collection = p.audience === "children" ? CHILDREN : ADULTS;
    if (has(collection, p.id)) continue;
    await client.post("/presets", {
      bookmark: p.title,
      collection,
      role: null,
      user: null,
      icon: "bookmark",
      filter: { program: { _eq: p.id } },
      layout: "tabular",
      layout_query: { tabular: { sort: ["-created_at"] } },
      layout_options: { tabular: { fields: collection === ADULTS ? ADULT_LIST_FIELDS : CHILD_LIST_FIELDS } },
    });
    console.log(`  ✓ bladwijzer "${p.title}" onder ${collection}`);
  }
}

// ─── Opruimen: first_name/last_name op registrations (stap 72) ─
async function dropUnusedRegistrationNameFields(client) {
  for (const field of ["first_name", "last_name"]) {
    try {
      await client.get(`/fields/registrations/${field}`);
    } catch {
      continue;
    }
    const used = (await client.get(`/items/registrations?filter[${field}][_nnull]=true&fields=id&limit=1`))?.data ?? [];
    if (used.length > 0) {
      console.log(`  · registrations.${field} bevat data — niet verwijderd`);
      continue;
    }
    await client.delete(`/fields/registrations/${field}`);
    console.log(`  − veld "registrations.${field}" verwijderd (ongebruikt; volwassenen staan in ${ADULTS})`);
  }
}
