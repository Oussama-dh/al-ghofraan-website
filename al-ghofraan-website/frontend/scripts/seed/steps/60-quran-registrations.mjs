// scripts/seed/steps/60-quran-registrations.mjs
//
// Koranonderwijs-inschrijving (/onderwijs/inschrijven).
//
// Maakt de collectie `quran_registrations` aan (idempotent), een
// bruikbare lijstweergave voor medewerkers en rechten voor de rol
// "Onderwijs beheerder".
//
// HARDE GARANTIES:
//   - Public krijgt GEEN enkele permission op deze collectie. Inschrijvingen
//     worden uitsluitend server-side geschreven door /api/onderwijs/inschrijven
//     met het DIRECTUS_TOKEN (zelfde architectuur als `registrations`).
//   - Onderwijs beheerder: read + update op alle velden (geen create, geen
//     delete). Dit sluit aan bij `registrations` (stap 12 + 25): daar zijn
//     persoonsgegevens (naam, e-mail, telefoon) ook bewerkbaar voor
//     medewerkers en zijn alleen systeemvelden read-only.
//   - Idempotent: tweede run = no-op. Geen bestaande collectie, rol of
//     preset wordt gewijzigd of verwijderd.
//   - Statuswaarden identiek aan `registrations` (stap 12).
//   - Timestamps volgens projectconventie: `created_at` (date-created) en
//     `updated_at` (date-updated), zoals in stap 12/16.
//
// Keuzelijsten hieronder MOETEN synchroon blijven met lib/quranRegistration.ts
// (CHILD_GENDER_OPTIONS, INVOLVED_GUARDIANS_OPTIONS, RELATION_OPTIONS,
// PAYMENT_FREQUENCY_OPTIONS).

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

const COLLECTION = "quran_registrations";
const ROLE_NAME = "Onderwijs beheerder";

const GENDER_CHOICES = [
  { text: "Jongen", value: "male" },
  { text: "Meisje", value: "female" },
];

const INVOLVED_CHOICES = [
  { text: "Beide ouders/verzorgers", value: "both" },
  { text: "Eén ouder/verzorger", value: "one" },
  { text: "Anders", value: "other" },
];

const RELATION_CHOICES = [
  { text: "Vader", value: "father" },
  { text: "Moeder", value: "mother" },
  { text: "Verzorger", value: "guardian" },
  { text: "Anders", value: "other" },
];

const PAYMENT_CHOICES = [
  { text: "Maandelijks", value: "monthly" },
  { text: "Per kwartaal – iedere 3 maanden", value: "quarterly" },
  { text: "Per halfjaar – iedere 6 maanden", value: "semiannual" },
  { text: "Jaarlijks", value: "yearly" },
];

// Zelfde status-conventie en kleuren als `registrations` (stap 12).
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

// Verplicht = `is_nullable: false` (database) + `meta.required`.
// Optioneel = `is_nullable: true`.
// Niet read-only: medewerkers mogen gegevens corrigeren (zoals bij
// `registrations`). Alleen created_at/updated_at zijn read-only.
function textField(field, note, { width = "half", required = true } = {}) {
  return {
    field,
    type: "string",
    meta: { width, interface: "input", required, note },
    schema: { is_nullable: !required },
  };
}

function selectField(field, choices, note, { required = true } = {}) {
  return {
    field,
    type: "string",
    meta: {
      width: "half",
      interface: "select-dropdown",
      required,
      note,
      options: { choices },
      display: "labels",
      display_options: { choices },
    },
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

function booleanField(field, note) {
  return {
    field,
    type: "boolean",
    meta: { width: "half", interface: "boolean", note },
    schema: { default_value: false, is_nullable: false },
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

const FIELDS = [
  // 1. Kind
  textField("child_first_name", "Voornaam kind"),
  textField("child_last_name", "Achternaam kind"),
  {
    field: "child_birth_date",
    type: "date",
    meta: { width: "half", interface: "datetime", required: true, note: "Geboortedatum kind" },
    schema: { is_nullable: false },
  },
  selectField("child_gender", GENDER_CHOICES, "Geslacht kind"),

  // 2. Betrokken ouders/verzorgers
  selectField("involved_guardians", INVOLVED_CHOICES, "Betrokken bij opvoeding en onderwijs"),
  textField("involved_guardians_other", "Alleen bij 'Anders': namelijk…", { required: false }),

  // 3. Eerste contactpersoon (verplicht)
  textField("contact_1_name", "Eerste contactpersoon — naam"),
  selectField("contact_1_relation", RELATION_CHOICES, "Eerste contactpersoon — relatie"),
  textField("contact_1_relation_other", "Alleen bij relatie 'Anders'", { required: false }),
  textField("contact_1_phone", "Genormaliseerd: 0612345678 of +31612345678"),
  textField("contact_1_email", "Eerste contactpersoon — e-mailadres"),

  // 4. Tweede contactpersoon (optioneel)
  booleanField("secondary_contact_absent", "Aangevinkt = er is GEEN tweede contactpersoon (velden hieronder zijn dan leeg)"),
  textField("secondary_contact_name", "Tweede contactpersoon — naam", { required: false }),
  selectField("secondary_contact_relation", RELATION_CHOICES, "Tweede contactpersoon — relatie", { required: false }),
  textField("secondary_contact_relation_other", "Alleen bij relatie 'Anders'", { required: false }),
  textField("secondary_contact_phone", "Tweede contactpersoon — telefoon", { required: false }),
  textField("secondary_contact_email", "Tweede contactpersoon — e-mailadres", { required: false }),

  // 5. Niveau Arabisch (1 t/m 10: 1–2 zeer zwak · 3–4 zwak/matig · 5 voldoende · 6–7 goed · 8–10 zeer goed tot uitstekend)
  levelField("reading_level", "Leesniveau Arabisch, 1 t/m 10 (1–2 zeer zwak · 3–4 zwak/matig · 5 voldoende · 6–7 goed · 8–10 zeer goed tot uitstekend)"),
  longTextField("reading_notes", "Eventuele toelichting bij het leesniveau (optioneel)"),
  levelField("writing_level", "Schrijfniveau Arabisch, 1 t/m 10 (1–2 zeer zwak · 3–4 zwak/matig · 5 voldoende · 6–7 goed · 8–10 zeer goed tot uitstekend)"),
  longTextField("writing_notes", "Eventuele toelichting bij het schrijfniveau (optioneel)"),

  // 6. Bijzonderheden
  booleanField("special_considerations", "Bijzonderheden waar tijdens de lessen rekening mee moet worden gehouden"),
  longTextField("special_considerations_notes", "Toelichting (verplicht in het formulier bij 'Ja') — vertrouwelijk behandelen"),

  // 7. Betaling + afronding
  selectField("payment_frequency", PAYMENT_CHOICES, "Gekozen betalingsfrequentie (alleen voorkeur; geen automatische betaling)"),
  longTextField("additional_notes", "Vragen, opmerkingen of andere belangrijke informatie (optioneel)"),
  booleanField("consent_given", "Verklaring naar waarheid + toestemming gegevensgebruik (privacy)"),

  // Opvolging
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

  // Timestamps (conventie: created_at / updated_at, zie stap 12 en 16)
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

// Kolommen in de lijstweergave (volgorde = kolomvolgorde).
const LIST_FIELDS = [
  "child_first_name", "child_last_name", "child_birth_date",
  "contact_1_name", "contact_1_phone",
  "reading_level", "payment_frequency",
  "status", "created_at",
];

export async function setupQuranRegistrations(client) {
  console.log("\n📖 Stap 60 · quran_registrations (Koranonderwijs-inschrijving)");

  await ensureCollection(client, {
    collection: COLLECTION,
    meta: {
      icon: "menu_book",
      note: "Inschrijvingen Koranonderwijs (/onderwijs/inschrijven). Nieuwe inschrijvingen komen uit het formulier; medewerkers volgen op via de status.",
      display_template: "{{child_first_name}} {{child_last_name}}",
      sort_field: null,
      archive_field: "status",
      archive_value: "cancelled",
      unarchive_value: "new",
    },
    schema: {},
  });

  for (const f of FIELDS) {
    await ensureField(client, COLLECTION, f);
  }

  await setupListPreset(client);
  await setupPermissions(client);

  console.log("✓ Stap 60 voltooid");
}

// ─── Lijstweergave (globale preset, zoals stap 59) ───────────

async function setupListPreset(client) {
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
    collection: COLLECTION,
    role: null,
    user: null,
    layout: "tabular",
    layout_query: { tabular: { sort: ["-created_at"] } },
    layout_options: { tabular: { fields: LIST_FIELDS } },
  };

  try {
    if (existing) {
      const same =
        existing.layout === payload.layout &&
        JSON.stringify(existing.layout_options) === JSON.stringify(payload.layout_options) &&
        JSON.stringify(existing.layout_query) === JSON.stringify(payload.layout_query);
      if (same) {
        console.log(`  · ${COLLECTION}: preset al up-to-date`);
      } else {
        await client.patch(`/presets/${existing.id}`, payload);
        console.log(`  ↻ ${COLLECTION}: preset bijgewerkt`);
      }
    } else {
      await client.post("/presets", payload);
      console.log(`  ✓ ${COLLECTION}: preset aangemaakt (${LIST_FIELDS.length} kolommen)`);
    }
  } catch (err) {
    console.warn(`  ⚠ ${COLLECTION}: preset-update mislukt (${err.message})`);
  }
}

// ─── Rechten: Onderwijs beheerder = read + update (alle velden) ─
// Gelijk aan `registrations` in stap 25. Public en alle andere rollen
// blijven onaangeroerd. Geen create (alleen het formulier maakt aan) en
// geen delete.

async function setupPermissions(client) {
  let policyId;
  try {
    const roles = await client.get(`/roles?filter[name][_eq]=${encodeURIComponent(ROLE_NAME)}&limit=1`);
    if (!roles?.data?.[0]) {
      console.log(`  · rol "${ROLE_NAME}" bestaat niet (draai stap 25) — permissions overgeslagen`);
      return;
    }
    // Stap 25 geeft de policy dezelfde naam als de rol.
    const pol = await client.get(`/policies?filter[name][_eq]=${encodeURIComponent(ROLE_NAME)}&limit=1`);
    policyId = pol?.data?.[0]?.id;
    if (!policyId) {
      console.log(`  · policy "${ROLE_NAME}" niet gevonden — permissions overgeslagen`);
      return;
    }
  } catch (err) {
    console.warn(`  ⚠ policy-lookup mislukt (${err.message}) — permissions overgeslagen`);
    return;
  }

  for (const action of ["read", "update"]) {
    try {
      const existing = await client.get(
        `/permissions` +
          `?filter[policy][_eq]=${policyId}` +
          `&filter[collection][_eq]=${COLLECTION}` +
          `&filter[action][_eq]=${action}` +
          `&limit=1`,
      );
      if (existing?.data?.[0]) {
        console.log(`  · permission ${COLLECTION}/${action} bestaat al`);
        continue;
      }
      await client.post("/permissions", {
        policy: policyId,
        collection: COLLECTION,
        action,
        fields: ["*"],
        permissions: null,
        validation: null,
      });
      console.log(`  ✓ permission ${COLLECTION}/${action} aangemaakt (${ROLE_NAME})`);
    } catch (err) {
      console.warn(`  ⚠ permission ${COLLECTION}/${action} mislukt (${err.message})`);
    }
  }
}
