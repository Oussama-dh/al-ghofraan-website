// scripts/seed/steps/56-hadieth-series-tv.mjs
//
// Delivery B — beheerbare hadieth-series voor /gebedstijden/tv:
//
//   1. Nieuwe collectie `hadieth_series`
//        - Algemene container voor "schedule-bare" hadieth-collecties
//          (Djoemoe'ah, Ramadhaan, Sadaqah, Ouders, Gebed, Algemeen, ...).
//
//   2. Nieuwe collectie `hadieth_series_items`
//        - M2O naar hadieth_series
//        - Bevat de eigenlijke ahadieth-content per serie
//
//   3. M2O relation `hadieth_series_items.series` → `hadieth_series`
//
//   4. Permissions toegevoegd aan bestaande policy "Ahadieth beheerder"
//      (van stap 46):
//        - create/read/update op beide collecties
//        - GEEN delete
//        - GEEN site_settings (stap 49 fix gerespecteerd)
//        - GEEN public read (TV-route gebruikt admin-token)
//
//   5. Twee templates aangemaakt als draft+active=false+show_on_tv=false:
//        - "Algemene ahadieth" (schedule_type=always, priority=0)
//          + één voorbeeld-item
//        - "Djoemoe'ah" (schedule_type=weekly_window, priority=50,
//          do@maghreb → vr@maghreb)
//          + één voorbeeld-item
//
// HARDE GARANTIES:
//   - Idempotent (tweede run = no-op).
//   - Stap 37 NIET aangeraakt (eigen ensureRelation lokaal).
//   - Stap 40 NIET aangeraakt.
//   - Stap 46 (Ahadieth-rol) NIET gewijzigd — alleen NIEUWE permissions
//     toegevoegd aan bestaande policy.
//   - Geen rename/migratie van bestaande velden of collecties.
//   - Geen public read whitelist nodig.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

const SERIES_COLLECTION = "hadieth_series";
const ITEMS_COLLECTION  = "hadieth_series_items";

const AHADIETH_POLICY_NAME = "Ahadieth beheerder";

// ─── Dropdown-keuzes (één bron met lib/hadiethSeries.ts) ────────
// Bij wijziging hier: synchroniseer SCHEDULE_TYPES in lib/hadiethSeries.ts.
const SCHEDULE_TYPE_CHOICES = [
  { text: "Altijd actief",                   value: "always" },
  { text: "Datumreeks (start_date → end_date)", value: "date_range" },
  { text: "Wekelijks venster (weekdag/gebed)",  value: "weekly_window" },
  { text: "Hijri-maand",                     value: "hijri_month" },
];

const PRAYER_CHOICES = [
  { text: "Fajr",     value: "fajr" },
  { text: "Shoeroeq", value: "shoeroeq" },
  { text: "Dhoehr",   value: "dhoehr" },
  { text: "Asr",      value: "asr" },
  { text: "Maghrib",  value: "maghrib" },
  { text: "Ishaa",    value: "ishaa" },
];

// JS-conventie: getDay() returnt 0=zondag t/m 6=zaterdag.
const WEEKDAY_CHOICES = [
  { text: "Zondag (0)",    value: 0 },
  { text: "Maandag (1)",   value: 1 },
  { text: "Dinsdag (2)",   value: 2 },
  { text: "Woensdag (3)",  value: 3 },
  { text: "Donderdag (4)", value: 4 },
  { text: "Vrijdag (5)",   value: 5 },
  { text: "Zaterdag (6)",  value: 6 },
];

const HIJRI_MONTH_CHOICES = [
  { text: "1 — Moeharram",          value: 1 },
  { text: "2 — Safar",              value: 2 },
  { text: "3 — Rabi' al-awwal",     value: 3 },
  { text: "4 — Rabi' ath-thani",    value: 4 },
  { text: "5 — Joemada al-oela",    value: 5 },
  { text: "6 — Joemada ath-thaaniya", value: 6 },
  { text: "7 — Radjab",             value: 7 },
  { text: "8 — Sja'baan",           value: 8 },
  { text: "9 — Ramadhaan",          value: 9 },
  { text: "10 — Shawwaal",          value: 10 },
  { text: "11 — Dhoel-Qa'da",       value: 11 },
  { text: "12 — Dhoel-Hijjah",      value: 12 },
];

// ─── Templates ───────────────────────────────────────────────────
//
// Twee templates worden meegestuurd als beheerder-referentie:
//   1. "Algemene ahadieth" — schedule_type=always, priority=0.
//      Dit wordt de continue achtergrond-serie waarover speciale series
//      heen kunnen winnen.
//   2. "Djoemoe'ah" — schedule_type=weekly_window, donderdag-maghreb
//      t/m vrijdag-maghreb. Voorbeeld voor weekly windows.
//
// Beide templates worden aangemaakt met:
//   status = "draft"
//   active = false
//   show_on_tv = false
// Zo komen ze NOOIT vanzelf op TV — beheerder zet ze handmatig aan.

const TEMPLATE_GENERAL = {
  series: {
    slug:          "algemene-ahadieth",
    status:        "draft",
    active:        false,
    show_on_tv:    false,
    title:         "Algemene ahadieth",
    description:
      "Doorlopende serie met ahadieth voor de TV. Heeft de laagste " +
      "priority (0) — speciale series zoals Djoemoe'ah of Ramadhaan " +
      "winnen automatisch wanneer ze actief zijn.",
    priority:      0,
    schedule_type: "always",
    sort:          1,
  },
  items: [
    {
      slug:          "voorbeeld-niyyah",
      status:        "draft",
      active:        false,
      arabic_text:   "إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ",
      translation_nl:
        "Voorwaar, de daden worden slechts beoordeeld op intenties. " +
        "(Bewerk dit voorbeeld-item of voeg eigen ahadieth toe.)",
      source:        "Sahih Al-Bukhari 1, Sahih Muslim 1907",
      authenticity:  "Sahih",
      explanation_short:
        "Voorbeeld-item. Activeer pas wanneer de tekst en bron " +
        "gecontroleerd zijn.",
      sort:          1,
    },
  ],
};

const TEMPLATE_DJOEMOEAH = {
  series: {
    slug:          "djoemoeah",
    status:        "draft",
    active:        false,
    show_on_tv:    false,
    title:         "Djoemoe'ah",
    description:
      "Serie die actief wordt vanaf donderdag-Maghreb tot vrijdag-Maghreb " +
      "(Europe/Amsterdam). Hogere priority (50) dan 'Algemene ahadieth' " +
      "zodat deze automatisch wint op donderdagavond en vrijdag.",
    priority:      50,
    schedule_type: "weekly_window",
    weekday_start: 4,        // donderdag (JS: 0=zondag)
    start_prayer:  "maghrib",
    weekday_end:   5,        // vrijdag
    end_prayer:    "maghrib",
    sort:          2,
  },
  items: [
    {
      slug:          "voorbeeld-djoemoeah",
      status:        "draft",
      active:        false,
      arabic_text:   "خَيْرُ يَوْمٍ طَلَعَتْ عَلَيْهِ الشَّمْسُ يَوْمُ الْجُمُعَةِ",
      translation_nl:
        "De beste dag waarop de zon opkomt is de dag van Djoemoe'ah. " +
        "(Bewerk dit voorbeeld-item of voeg eigen Djoemoe'ah-ahadieth toe.)",
      source:        "Sahih Muslim 854",
      authenticity:  "Sahih",
      explanation_short:
        "Voorbeeld-item voor de Djoemoe'ah-serie. Activeer pas wanneer " +
        "de tekst en bron gecontroleerd zijn.",
      sort:          1,
    },
  ],
};

// ─── Hoofd-entry ─────────────────────────────────────────────────

export async function setupHadiethSeriesTv(client) {
  console.log("\n📖 Stap 56 · Hadieth-series voor TV (collecties + permissions + templates)");

  // ─── 1. Collectie hadieth_series ──────────────────────────────
  await ensureCollection(client, {
    collection: SERIES_COLLECTION,
    meta: {
      icon:             "auto_stories",
      note:
        "Beheerbare hadieth-series voor /gebedstijden/tv. Voorbeeld-series: " +
        "'Algemene ahadieth' (always), 'Djoemoe'ah' (weekly_window do→vr), " +
        "'Ramadhaan' (date_range of hijri_month). Hogere priority wint bij overlap.",
      display_template: "{{title}} — {{schedule_type}} (priority {{priority}})",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "status",
    type:  "string",
    meta: {
      width: "half", interface: "select-dropdown", required: true, display: "labels",
      options: {
        choices: [
          { text: "Concept",      value: "draft"     },
          { text: "Gepubliceerd", value: "published" },
          { text: "Gearchiveerd", value: "archived"  },
        ],
      },
    },
    schema: { default_value: "draft", is_nullable: false },
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "active",
    type:  "boolean",
    meta: {
      width: "half", interface: "boolean",
      note:
        "Master-toggle: alleen wanneer status=published EN active=true EN " +
        "show_on_tv=true wordt deze serie gewogen voor /gebedstijden/tv. " +
        "Zet eerst op true wanneer titel + items gecontroleerd zijn.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "show_on_tv",
    type:  "boolean",
    meta: {
      width: "half", interface: "boolean",
      note:
        "Tonen op /gebedstijden/tv. Werkt samen met 'active' en de " +
        "schedule_type-evaluatie. Bij meerdere actieve series wint de " +
        "hoogste 'priority'.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "title",
    type:  "string",
    meta: {
      width: "full", interface: "input", required: true,
      note:
        "Naam van de serie, bv. 'Djoemoe'ah', 'Ramadhaan', 'Sadaqah', " +
        "'Ouders', 'Gebed', 'Kennis', 'Algemene ahadieth'. Wordt op TV " +
        "als label boven het item getoond.",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "slug",
    type:  "string",
    meta: {
      width: "half", interface: "input", required: true,
      note:
        "Korte interne identifier (bv. 'djoemoeah'). Wordt gebruikt voor " +
        "stabiele tie-break bij gelijke priority. Niet zichtbaar op TV.",
    },
    schema: { is_nullable: false, is_unique: true },
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "priority",
    type:  "integer",
    meta: {
      width: "half", interface: "input",
      note:
        "Hoger getal = hogere prioriteit. Bij meerdere tegelijk actieve " +
        "series wint de hoogste. Suggesties: 0 = algemene serie, " +
        "50 = wekelijkse special (Djoemoe'ah), 100 = jaarlijkse " +
        "special (Ramadhaan, Dhoel-Hijjah).",
    },
    schema: { default_value: 0, is_nullable: false },
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "description",
    type:  "text",
    meta: {
      width: "full", interface: "input-multiline",
      note: "Interne beschrijving. Niet zichtbaar op TV.",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "schedule_type",
    type:  "string",
    meta: {
      width: "half", interface: "select-dropdown", required: true, display: "labels",
      options: { choices: SCHEDULE_TYPE_CHOICES },
      note:
        "Bepaalt WANNEER deze serie actief is op TV.\n" +
        "• always = altijd actief.\n" +
        "• date_range = tussen start_date en end_date (vul beide).\n" +
        "• weekly_window = wekelijks venster (vul weekday_start, " +
        "start_prayer, weekday_end, end_prayer).\n" +
        "• hijri_month = wanneer huidige Hijri-maand gelijk is aan " +
        "hijri_month. LET OP: native Intl-berekening kan 1 dag afwijken " +
        "van lokale maanwaarneming — voor Ramadhaan is date_range vaak " +
        "betrouwbaarder.",
    },
    schema: { default_value: "always", is_nullable: false },
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "start_date",
    type:  "date",
    meta: {
      width: "half", interface: "datetime",
      note:
        "Alleen voor schedule_type=date_range. " +
        "Start van het venster (inclusief, NL-datum).",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "end_date",
    type:  "date",
    meta: {
      width: "half", interface: "datetime",
      note:
        "Alleen voor schedule_type=date_range. " +
        "Einde van het venster (inclusief, NL-datum).",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "weekday_start",
    type:  "integer",
    meta: {
      width: "half", interface: "select-dropdown",
      options: { choices: WEEKDAY_CHOICES },
      note:
        "Alleen voor schedule_type=weekly_window. Start-weekdag van " +
        "het venster. Conventie 0=zondag, 1=maandag, 2=dinsdag, " +
        "3=woensdag, 4=donderdag, 5=vrijdag, 6=zaterdag. " +
        "Voorbeeld Djoemoe'ah: start donderdag (4) bij Maghreb, " +
        "einde vrijdag (5) bij Maghreb.",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "start_prayer",
    type:  "string",
    meta: {
      width: "half", interface: "select-dropdown",
      options: { choices: PRAYER_CHOICES },
      note:
        "Alleen voor schedule_type=weekly_window. Gebed op weekday_start " +
        "waarvanaf de serie actief is (tijd uit dagelijkse CSV).",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "weekday_end",
    type:  "integer",
    meta: {
      width: "half", interface: "select-dropdown",
      options: { choices: WEEKDAY_CHOICES },
      note:
        "Alleen voor schedule_type=weekly_window. Eind-weekdag van het " +
        "venster (zie weekday_start voor conventie).",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "end_prayer",
    type:  "string",
    meta: {
      width: "half", interface: "select-dropdown",
      options: { choices: PRAYER_CHOICES },
      note:
        "Alleen voor schedule_type=weekly_window. Gebed op weekday_end " +
        "tot waar de serie actief is (exclusief).",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "hijri_month",
    type:  "integer",
    meta: {
      width: "half", interface: "select-dropdown",
      options: { choices: HIJRI_MONTH_CHOICES },
      note:
        "Alleen voor schedule_type=hijri_month. Maand 1-12 volgens " +
        "Umm Al-Qura-kalender (native Intl). Voor Ramadhaan kan dit 1 " +
        "dag afwijken van lokale maanwaarneming — overweeg date_range " +
        "voor een specifiek jaar als zekerheid belangrijker is.",
    },
    schema: {},
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "sort",
    type:  "integer",
    meta: {
      width: "half", interface: "input",
      note: "Sorteervolgorde in Directus admin. Geen effect op TV-selectie.",
    },
    schema: { default_value: 1 },
  });

  await ensureField(client, SERIES_COLLECTION, {
    field: "created_at",
    type:  "timestamp",
    meta: {
      width: "full", interface: "datetime",
      special: ["date-created"], readonly: true,
    },
    schema: {},
  });

  // ─── 2. Collectie hadieth_series_items ────────────────────────
  await ensureCollection(client, {
    collection: ITEMS_COLLECTION,
    meta: {
      icon:             "format_quote",
      note:
        "Items (ahadieth) binnen een hadieth-serie. Eén item per dag " +
        "wordt deterministisch gekozen voor /gebedstijden/tv " +
        "(dagrotatie, iedereen ziet zelfde item op zelfde dag).",
      display_template: "{{translation_nl}}",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "status",
    type:  "string",
    meta: {
      width: "half", interface: "select-dropdown", required: true, display: "labels",
      options: {
        choices: [
          { text: "Concept",      value: "draft"     },
          { text: "Gepubliceerd", value: "published" },
          { text: "Gearchiveerd", value: "archived"  },
        ],
      },
    },
    schema: { default_value: "draft", is_nullable: false },
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "active",
    type:  "boolean",
    meta: {
      width: "half", interface: "boolean",
      note:
        "Alleen status=published EN active=true items doen mee in de " +
        "dagrotatie van hun serie op TV.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "series",
    type:  "integer",
    meta: {
      width:     "full",
      interface: "select-dropdown-m2o",
      special:   ["m2o"],
      options:   { template: "{{title}} ({{schedule_type}})" },
      required:  true,
      note:      "De serie waar dit item bij hoort.",
    },
    schema: { foreign_key_table: SERIES_COLLECTION, is_nullable: false },
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "arabic_text",
    type:  "text",
    meta: {
      width: "full", interface: "input-multiline",
      note: "Arabische tekst (RTL). Mag leeg blijven.",
    },
    schema: {},
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "translation_nl",
    type:  "text",
    meta: {
      width: "full", interface: "input-multiline", required: true,
      note:
        "Nederlandse vertaling. Verplicht — zonder vertaling wordt het " +
        "item overgeslagen door de TV-route.",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "source",
    type:  "string",
    meta: {
      width: "full", interface: "input",
      note: "Bron, bv. 'Sahih Muslim 1031'.",
    },
    schema: {},
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "authenticity",
    type:  "string",
    meta: {
      width: "half", interface: "input",
      note: "Authenticiteit, bv. 'Sahih', 'Hasan'. Mag leeg.",
    },
    schema: {},
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "explanation_short",
    type:  "text",
    meta: {
      width: "full", interface: "input-multiline",
      note: "Optionele korte uitleg of context. Niet getoond op TV (compact).",
    },
    schema: {},
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "sort",
    type:  "integer",
    meta: {
      width: "half", interface: "input",
      note: "Lager = eerder in rotatie. Dagrotatie cycleert volgens deze volgorde.",
    },
    schema: { default_value: 1 },
  });

  await ensureField(client, ITEMS_COLLECTION, {
    field: "created_at",
    type:  "timestamp",
    meta: {
      width: "full", interface: "datetime",
      special: ["date-created"], readonly: true,
    },
    schema: {},
  });

  // ─── 3. M2O relation ──────────────────────────────────────────
  await ensureRelation(client, {
    collection:         ITEMS_COLLECTION,
    field:              "series",
    related_collection: SERIES_COLLECTION,
    meta: {
      one_field:           null,    // geen reverse O2M om gedoe te vermijden
      sort_field:          null,
      one_deselect_action: "nullify",
    },
    // CASCADE op delete: items horen bij hun serie. Beheerders hebben geen
    // delete-permission op series (alleen archive), dus CASCADE is in de
    // praktijk alleen via direct DB-access. Veilig.
    schema: { on_delete: "CASCADE" },
  });

  // ─── 4. Permissions voor "Ahadieth beheerder" policy ──────────
  await grantAhadiethPermissions(client);

  // ─── 5. Templates ─────────────────────────────────────────────
  await seedTemplate(client, TEMPLATE_GENERAL);
  await seedTemplate(client, TEMPLATE_DJOEMOEAH);

  console.log("✓ Stap 56 voltooid");
}

// ─── ensureRelation (lokaal — patroon van stap 38) ───────────────
// We dupliceren omdat helpers.mjs deze helper niet bevat en stap 37 niet
// aangeraakt mag worden.
async function ensureRelation(client, def) {
  const { collection, field, related_collection } = def;
  let existing;
  try {
    const resp = await client.get(`/relations/${collection}/${field}`);
    existing = resp?.data;
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
    const msg = err.message || "";
    if (msg.includes("already exists") || msg.includes("RECORD_NOT_UNIQUE")) {
      console.log(`  · relatie ${collection}.${field} bestond al (andere vorm)`);
      return false;
    }
    console.warn(`  ⚠️  relatie ${collection}.${field} aanmaken mislukt: ${msg}`);
    return false;
  }
}

// ─── Permissions toevoegen aan bestaande Ahadieth-policy ─────────

async function grantAhadiethPermissions(client) {
  // 1. Policy opzoeken
  let policyId;
  try {
    const resp = await client.get(
      `/policies?filter[name][_eq]=${encodeURIComponent(AHADIETH_POLICY_NAME)}&limit=1`,
    );
    policyId = resp?.data?.[0]?.id;
  } catch (err) {
    console.warn(`  ⚠️  Permission-policy-lookup faalde: ${err.message}`);
    return;
  }

  if (!policyId) {
    console.log(
      `  · Policy "${AHADIETH_POLICY_NAME}" niet gevonden — geen permissions toegevoegd. ` +
      `Run eerst seed 46.`,
    );
    return;
  }

  // 2. CRU permissions op beide collecties
  const collections = [SERIES_COLLECTION, ITEMS_COLLECTION];
  const actions     = ["create", "read", "update"];
  // BEWUST GEEN "delete" — gewone beheerders mogen niet permanent verwijderen.

  for (const collection of collections) {
    for (const action of actions) {
      await ensurePermission(client, {
        policy:      policyId,
        collection,
        action,
        fields:      ["*"],
        permissions: null,
        validation:  null,
      });
    }
  }
}

async function ensurePermission(client, p) {
  let existing;
  try {
    const resp = await client.get(
      `/permissions` +
      `?filter[policy][_eq]=${p.policy}` +
      `&filter[collection][_eq]=${encodeURIComponent(p.collection)}` +
      `&filter[action][_eq]=${p.action}` +
      `&limit=1`,
    );
    existing = resp?.data?.[0];
  } catch (err) {
    console.warn(`  ⚠️  permission-lookup faalde voor ${p.collection}/${p.action}: ${err.message}`);
    return;
  }

  if (existing) {
    const sameFields     = JSON.stringify(existing.fields ?? ["*"]) === JSON.stringify(p.fields);
    const samePerms      = JSON.stringify(existing.permissions ?? null) === JSON.stringify(p.permissions ?? null);
    const sameValidation = JSON.stringify(existing.validation ?? null) === JSON.stringify(p.validation ?? null);
    if (sameFields && samePerms && sameValidation) {
      console.log(`  · permission ${p.collection}/${p.action} (Ahadieth) ongewijzigd`);
      return;
    }
    try {
      await client.patch(`/permissions/${existing.id}`, {
        fields:      p.fields,
        permissions: p.permissions,
        validation:  p.validation,
      });
      console.log(`  ↻ permission ${p.collection}/${p.action} (Ahadieth) bijgewerkt`);
    } catch (err) {
      console.warn(`  ⚠️  permission-update faalde voor ${p.collection}/${p.action}: ${err.message}`);
    }
    return;
  }

  try {
    await client.post("/permissions", p);
    console.log(`  ✓ permission ${p.collection}/${p.action} (Ahadieth) aangemaakt`);
  } catch (err) {
    console.warn(`  ⚠️  permission-create faalde voor ${p.collection}/${p.action}: ${err.message}`);
  }
}

// ─── Template-seeding ────────────────────────────────────────────
//
// Strategie: zoek op slug. Bestaat al → niets doen (we overschrijven NIET,
// want beheerder kan z'n eigen werk hebben aangepast). Bestaat niet →
// aanmaken in draft+active=false+show_on_tv=false.

async function seedTemplate(client, template) {
  // 1. Series upsert op slug
  let existingSeriesId;
  try {
    const resp = await client.get(
      `/items/${SERIES_COLLECTION}` +
      `?filter[slug][_eq]=${encodeURIComponent(template.series.slug)}&limit=1`,
    );
    existingSeriesId = resp?.data?.[0]?.id;
  } catch (err) {
    console.warn(`  ⚠️  series-lookup voor "${template.series.slug}" faalde: ${err.message}`);
    return;
  }

  if (existingSeriesId) {
    console.log(`  · ${SERIES_COLLECTION}: "${template.series.title}" bestaat al — items niet overschreven`);
    return;
  }

  // 2. Series aanmaken
  let seriesId;
  try {
    const resp = await client.post(`/items/${SERIES_COLLECTION}`, template.series);
    seriesId = resp?.data?.id;
    console.log(`  ✓ ${SERIES_COLLECTION}: "${template.series.title}" template aangemaakt (draft, inactive)`);
  } catch (err) {
    console.warn(`  ⚠️  series-create voor "${template.series.title}" faalde: ${err.message}`);
    return;
  }

  // 3. Items aanmaken
  for (const item of template.items) {
    // Sla intern hulpveld "slug" niet op — collectie kent dat niet.
    // We gebruiken het alleen voor identifying-comments.
    // Maar voor zekerheid: filter slug-veld uit payload.
    const { slug: _itemSlug, ...itemData } = item;
    try {
      await client.post(`/items/${ITEMS_COLLECTION}`, {
        ...itemData,
        series: seriesId,
      });
      console.log(`  ✓ ${ITEMS_COLLECTION}: voorbeeld-item aangemaakt voor "${template.series.title}"`);
    } catch (err) {
      console.warn(`  ⚠️  item-create voor "${template.series.title}" faalde: ${err.message}`);
    }
  }
}
