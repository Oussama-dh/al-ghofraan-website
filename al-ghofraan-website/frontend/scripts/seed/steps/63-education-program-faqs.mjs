// scripts/seed/steps/63-education-program-faqs.mjs
//
// Veelgestelde vragen per onderwijsprogramma.
//
//   education_program_faqs  = één record per vraag (M2O `program`)
//   education_programs.faqs = O2M-alias, zodat beheerders de vragen direct
//                             op het programma beheren
//
// Idempotent en niet-destructief: maakt alleen aan wat ontbreekt. Geen
// bestaande data, velden of rechten worden gewijzigd. Public mag alleen
// FAQ's met status "published" lezen; de pagina toont de sectie alleen als
// er minstens één gepubliceerde vraag is.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

const FAQS = "education_program_faqs";
const PROGRAMS = "education_programs";
const LANGS = ["nl-NL", "en-US"];

const STATUS_CHOICES = [
  { text: "Concept", value: "draft" },
  { text: "Gepubliceerd", value: "published" },
  { text: "Gearchiveerd", value: "archived" },
];

const FAQ_FIELDS = [
  {
    field: "status",
    type: "string",
    meta: {
      width: "half",
      interface: "select-dropdown",
      options: { choices: STATUS_CHOICES },
      display: "labels",
      display_options: { choices: STATUS_CHOICES },
      note: "Alleen 'Gepubliceerd' is zichtbaar op de website",
    },
    schema: { default_value: "draft", is_nullable: false },
  },
  {
    field: "program",
    type: "integer",
    meta: {
      width: "half",
      interface: "select-dropdown-m2o",
      special: ["m2o"],
      required: true,
      note: "Onderwijsprogramma waar deze vraag bij hoort",
      options: { template: "{{title}}" },
      display: "related-values",
      display_options: { template: "{{title}}" },
    },
    schema: { is_nullable: false },
  },
  {
    field: "question",
    type: "string",
    meta: { width: "full", interface: "input", required: true, note: "De vraag" },
    schema: { is_nullable: false },
  },
  {
    field: "answer",
    type: "text",
    meta: { width: "full", interface: "input-rich-text-html", required: true, note: "Het antwoord" },
    schema: { is_nullable: false },
  },
  {
    field: "sort",
    type: "integer",
    meta: { width: "half", interface: "input", note: "Volgorde binnen het programma (laag = eerst)" },
    schema: { is_nullable: true },
  },
  {
    field: "date_created",
    type: "timestamp",
    meta: { width: "half", interface: "datetime", readonly: true, special: ["date-created"], note: "Aangemaakt" },
    schema: {},
  },
  {
    field: "date_updated",
    type: "timestamp",
    meta: { width: "half", interface: "datetime", readonly: true, special: ["date-updated"], note: "Laatst gewijzigd" },
    schema: {},
  },
];

const LABELS = {
  status: "Status",
  program: "Programma",
  question: "Vraag",
  answer: "Antwoord",
  sort: "Volgorde",
  date_created: "Aangemaakt",
  date_updated: "Laatst gewijzigd",
};

const translations = (text) => LANGS.map((language) => ({ language, translation: text }));

const FAQS_ALIAS = {
  field: "faqs",
  type: "alias",
  schema: null,
  meta: {
    width: "full",
    interface: "list-o2m",
    special: ["o2m"],
    note: "Veelgestelde vragen (onderaan de programmapagina, in accordeon)",
    options: { layout: "table", fields: ["question", "status", "sort"], limit: 50 },
    display: "related-values",
    display_options: { template: "{{question}}" },
    translations: translations("Veelgestelde vragen"),
  },
};

export async function setupEducationProgramFaqs(client) {
  console.log("\n❓ Stap 63 · Veelgestelde vragen per onderwijsprogramma");

  try {
    await client.get(`/collections/${PROGRAMS}`);
  } catch {
    throw new Error(`Collectie "${PROGRAMS}" bestaat niet — draai eerst stap 11.`);
  }

  await ensureCollection(client, {
    collection: FAQS,
    meta: {
      icon: "help",
      note: "Veelgestelde vragen per onderwijsprogramma",
      display_template: "{{question}}",
      sort_field: "sort",
      archive_field: "status",
      archive_value: "archived",
      unarchive_value: "draft",
      translations: LANGS.map((language) => ({
        language,
        translation: "Veelgestelde vragen (onderwijs)",
        singular: "Veelgestelde vraag",
        plural: "Veelgestelde vragen",
      })),
    },
    schema: {},
  });

  for (const f of FAQ_FIELDS) {
    await ensureField(client, FAQS, {
      ...f,
      meta: { ...f.meta, translations: translations(LABELS[f.field]) },
    });
  }

  await ensureField(client, PROGRAMS, FAQS_ALIAS);

  // Relatie: bij het verwijderen van een programma verdwijnen de FAQ's mee.
  try {
    await client.get(`/relations/${FAQS}/program`);
    console.log("  · relatie education_program_faqs.program → education_programs bestaat al");
  } catch (err) {
    if (!/→\s*40[34]/.test(err.message || "")) throw err;
    await client.post("/relations", {
      collection: FAQS,
      field: "program",
      related_collection: PROGRAMS,
      meta: { one_field: "faqs", sort_field: "sort", one_deselect_action: "delete" },
      schema: { on_delete: "CASCADE" },
    });
    console.log("  ✓ relatie aangemaakt (O2M faqs ↔ M2O program, ON DELETE CASCADE)");
  }

  await setupPermissions(client);
  console.log("✓ Stap 63 voltooid");
}

// Public: alleen gepubliceerde FAQ's lezen.
async function setupPermissions(client) {
  // Zelfde zoekvolgorde als stap 02: naam "Public", anders icoon "public"
  // (Directus 11 noemt de standaardpolicy "$t:public_label").
  let policy;
  try {
    policy = (await client.get(`/policies?filter[name][_eq]=Public&limit=1`))?.data?.[0];
    if (!policy) {
      const all = (await client.get(`/policies?limit=-1`))?.data || [];
      policy = all.find((p) => (p.name || "").toLowerCase() === "public") || all.find((p) => p.icon === "public");
    }
  } catch {
    /* fall through */
  }
  if (!policy) {
    console.warn("  ⚠️  Public-policy niet gevonden — public read op FAQ's niet ingesteld");
    return;
  }
  const payload = {
    policy: policy.id,
    collection: FAQS,
    action: "read",
    permissions: { status: { _eq: "published" } },
    validation: null,
    presets: null,
    fields: ["*"],
  };
  const existing = (
    await client.get(
      `/permissions?filter[policy][_eq]=${policy.id}&filter[collection][_eq]=${FAQS}&filter[action][_eq]=read&limit=1`,
    )
  )?.data?.[0];
  if (existing) {
    await client.patch(`/permissions/${existing.id}`, payload);
    console.log(`  ↻ ${FAQS}: public read (alleen published) geüpdatet`);
  } else {
    await client.post("/permissions", payload);
    console.log(`  ✓ ${FAQS}: public read (alleen published) aangemaakt`);
  }
}
