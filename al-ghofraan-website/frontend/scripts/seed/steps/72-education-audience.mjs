// scripts/seed/steps/72-education-audience.mjs
//
// Doelgroep per onderwijsprogramma: kinderonderwijs of volwassenenonderwijs.
// De doelgroep bepaalt welk inschrijfformulier /onderwijs/[slug] toont:
//
//   children → het Hifdh-formulier (Baraa'im): 1..n kinderen, niveaus,
//              contactpersonen, betaling → quran_registrations
//   adults   → kort formulier: voornaam, achternaam, telefoon, e-mail,
//              leeftijd → registrations (type "education")
//
// Velden:
//   education_programs.audience              — keuze (verplicht in Directus)
//   education_programs.require_letters_check — vraag "Kan het kind de Arabische
//                                              letters herkennen?" (alleen zichtbaar
//                                              bij kinderonderwijs)
//   quran_registrations.program_slug/_title  — voor welk programma de inschrijving is
//   registrations.first_name / last_name     — volwassenenformulier
//
// Idempotent en niet-destructief (zelfde patroon als stap 62/65/69):
//   - Hifdh ("hifdhprogramma") krijgt audience=children ALLEEN als het veld leeg is.
//   - require_letters_check wordt voor Hifdh ALLEEN op true gezet wanneer het veld
//     in deze run is aangemaakt (anders zou een bewuste "uit" van een beheerder
//     worden overschreven).
//   - Bestaande quran_registrations zonder programma krijgen de Hifdh-waarden
//     (ze komen allemaal uit het Hifdh-formulier); gevulde waarden blijven staan.
//   - Andere programma's worden niet aangeraakt; zonder doelgroep toont de site
//     het volwassenenformulier.

import { ensureField } from "../lib/helpers.mjs";

const PROGRAMS = "education_programs";
const QURAN = "quran_registrations";
const HIFDH_SLUG = "hifdhprogramma";
const HIFDH_TITLE = "Hifdh programma";

const AUDIENCE_CHOICES = [
  { text: "Kinderonderwijs",      value: "children" },
  { text: "Volwassenenonderwijs", value: "adults" },
];

export async function setupEducationAudience(client) {
  console.log("\n👪 Stap 72 · Doelgroep onderwijsprogramma (kinderen / volwassenen)");

  // ── education_programs ─────────────────────────────────────
  await ensureField(client, PROGRAMS, {
    field: "audience",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      required:  true,
      options:   { choices: AUDIENCE_CHOICES },
      display:   "labels",
      display_options: {
        choices: [
          { text: "Kinderen",    value: "children", foreground: "#FFFFFF", background: "#7E5A3A" },
          { text: "Volwassenen", value: "adults",   foreground: "#FFFFFF", background: "#3A6F8F" },
        ],
      },
      note:
        "Bepaalt het inschrijfformulier. Kinderonderwijs: zelfde formulier als het Hifdh programma " +
        "(kinderen, niveaus, contactpersonen, betaling). Volwassenenonderwijs: voornaam, achternaam, " +
        "telefoon, e-mail en leeftijd.",
    },
    schema: { is_nullable: true },
  });

  const lettersAdded = await ensureField(client, PROGRAMS, {
    field: "require_letters_check",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      special:   ["cast-boolean"],
      options:   { label: "Eerst vragen of het kind de Arabische letters kent" },
      note:
        "Aan: het formulier vraagt eerst of het kind minimaal de Arabische letters kan herkennen. " +
        "Alleen bij 'Ja' verschijnt het formulier, met een verplicht bevestigingsvinkje.",
      conditions: [
        {
          name:   "Alleen bij kinderonderwijs",
          rule:   { audience: { _neq: "children" } },
          hidden: true,
        },
      ],
    },
    schema: { default_value: false, is_nullable: true },
  });

  const hifdh = (
    await client.get(`/items/${PROGRAMS}?filter[slug][_eq]=${HIFDH_SLUG}&fields=id,audience&limit=1`)
  )?.data?.[0];

  if (!hifdh) {
    console.log(`  · programma "${HIFDH_SLUG}" niet gevonden — geen doelgroep gezet`);
  } else {
    const patch = {};
    if (!hifdh.audience) patch.audience = "children";
    if (lettersAdded) patch.require_letters_check = true;
    if (Object.keys(patch).length > 0) {
      await client.patch(`/items/${PROGRAMS}/${hifdh.id}`, patch);
      console.log(`  ↻ ${HIFDH_SLUG}: ${Object.entries(patch).map(([k, v]) => `${k}=${v}`).join(", ")}`);
    } else {
      console.log(`  · ${HIFDH_SLUG}: doelgroep al ingevuld — niet gewijzigd`);
    }
  }

  // ── quran_registrations: voor welk programma ───────────────
  try {
    await client.get(`/collections/${QURAN}`);
  } catch {
    throw new Error(`Collectie "${QURAN}" bestaat niet — draai eerst stap 60.`);
  }

  await ensureField(client, QURAN, {
    field: "program_title",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      readonly:  true,
      note:      "Titel van het kinderprogramma op het moment van inschrijven",
    },
    schema: { is_nullable: true },
  });

  await ensureField(client, QURAN, {
    field: "program_slug",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      readonly:  true,
      note:      "Slug van het kinderprogramma (education_programs)",
    },
    schema: { is_nullable: true },
  });

  const unassigned = (
    await client.get(`/items/${QURAN}?filter[program_slug][_null]=true&fields=id&limit=-1`)
  )?.data ?? [];
  if (unassigned.length > 0) {
    await client.patch(`/items/${QURAN}`, {
      keys: unassigned.map((r) => r.id),
      data: { program_slug: HIFDH_SLUG, program_title: HIFDH_TITLE },
    });
    console.log(`  ↻ ${unassigned.length} bestaande inschrijving(en) gekoppeld aan ${HIFDH_SLUG}`);
  }

  // Kolom "Programma" in de lijstweergave (globale preset uit stap 60).
  try {
    const preset = (
      await client.get(
        `/presets?filter[collection][_eq]=${QURAN}&filter[role][_null]=true&filter[user][_null]=true&limit=1`,
      )
    )?.data?.[0];
    const fields = preset?.layout_options?.tabular?.fields;
    if (preset && Array.isArray(fields) && !fields.includes("program_title")) {
      await client.patch(`/presets/${preset.id}`, {
        layout_options: {
          ...preset.layout_options,
          tabular: { ...preset.layout_options.tabular, fields: ["program_title", ...fields] },
        },
      });
      console.log(`  ↻ ${QURAN}: kolom program_title toegevoegd aan lijstweergave`);
    }
  } catch (err) {
    console.warn(`  ⚠ ${QURAN}: preset bijwerken mislukt (${err.message})`);
  }

  // ── registrations: voor- en achternaam (volwassenen) ───────
  for (const [field, note] of [
    ["first_name", "Voornaam — ingevuld bij volwassenenonderwijs"],
    ["last_name",  "Achternaam — ingevuld bij volwassenenonderwijs"],
  ]) {
    await ensureField(client, "registrations", {
      field,
      type: "string",
      meta: { width: "half", interface: "input", note },
      schema: { is_nullable: true },
    });
  }

  console.log("✓ Stap 72 voltooid");
}
