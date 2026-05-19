// scripts/seed/steps/45-daily-hadiths.mjs
//
// Nieuwe collectie `daily_hadiths` voor de "Hadith van de dag"-blok op
// de homepage. Volledig CMS-beheerd; GEEN externe hadith-API.
//
// Velden:
//   - id              (auto, integer)
//   - status          (string, draft|published|archived)  — Directus standaard
//   - active          (boolean) — alleen rijen met status=published EN active=true zijn publiekelijk leesbaar
//   - title           (string) — bv. "Hadith van de dag"
//   - arabic_text     (text)
//   - translation_nl  (text)   — vereist; zonder vertaling renderen we niets
//   - source          (string) — bv. "Sahih Al-Bukhari, hadith 1"
//   - grade           (string) — authenticiteit, bv. "Sahih"
//   - explanation_short (text)
//   - display_date    (date)   — optioneel, alleen ter info voor admin
//   - sort            (integer) — admin volgorde
//   - created_at      (timestamp)
//
// Public-read permissions worden in stap 02-permissions.mjs gezet (filter:
// status=published EN active=true).
//
// Idempotent:
//   - ensureCollection skipt als de collectie al bestaat.
//   - ensureField skipt bestaande velden.
//   - upsertHadith (lokaal) zoekt op title — bij bestaand: vult alleen
//     lege velden aan. Bij niet-bestaand: maakt aan met status=draft +
//     active=false als template.

import { ensureCollection, ensureField } from "../lib/helpers.mjs";

const COLLECTION = "daily_hadiths";

// ─── Voorbeeld-rij (active=false zodat hij niet uitlekt) ──────

const SAMPLE_HADITH = {
  status:            "draft",
  active:            false,
  title:             "Hadith van de dag",
  arabic_text:       "إنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى",
  translation_nl:    "Voorwaar, de daden worden slechts beoordeeld op intenties, en voorwaar, voor iedere persoon geldt wat hij heeft beoogd.",
  source:            "Sahih Al-Bukhari 1, Sahih Muslim 1907",
  grade:             "Sahih (overgeleverd door Al-Bukhari en Muslim)",
  explanation_short: "De eerste hadith uit Sahih Al-Bukhari onderstreept het belang van de intentie achter elke handeling.",
  sort:              1,
};

function isEmpty(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

async function upsertHadithByTitle(client, data) {
  const search = await client.get(
    `/items/${COLLECTION}?filter[title][_eq]=${encodeURIComponent(data.title)}&limit=1`,
  );
  const existing = search?.data?.[0];

  if (existing) {
    const patch = {};
    for (const [field, value] of Object.entries(data)) {
      if (field === "title") continue;
      if (isEmpty(existing[field])) patch[field] = value;
    }
    if (Object.keys(patch).length === 0) {
      console.log(`  · ${COLLECTION}: "${data.title}" ongewijzigd`);
      return;
    }
    await client.patch(`/items/${COLLECTION}/${existing.id}`, patch);
    console.log(`  ↻ ${COLLECTION}: "${data.title}" aangevuld (${Object.keys(patch).join(", ")})`);
    return;
  }

  await client.post(`/items/${COLLECTION}`, data);
  console.log(`  ✓ ${COLLECTION}: "${data.title}" template aangemaakt (active=false)`);
}

export async function setupDailyHadiths(client) {
  console.log("\n📖 Stap 45 · daily_hadiths collectie");

  await ensureCollection(client, {
    collection: COLLECTION,
    meta: {
      icon:             "menu_book",
      note:             "Hadiths beheerd voor de 'Hadith van de dag'-blok op de homepage.",
      display_template: "{{title}} — {{source}}",
      sort_field:       "sort",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  // ─── Velden ────────────────────────────────────────────────

  await ensureField(client, COLLECTION, {
    field: "status",
    type:  "string",
    meta: {
      width:      "half",
      interface:  "select-dropdown",
      options:    {
        choices: [
          { text: "Concept",       value: "draft"     },
          { text: "Gepubliceerd",  value: "published" },
          { text: "Gearchiveerd",  value: "archived"  },
        ],
      },
      display:    "labels",
      required:   true,
    },
    schema: { default_value: "draft", is_nullable: false },
  });

  await ensureField(client, COLLECTION, {
    field: "active",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Alleen rijen met status=published EN active=true verschijnen op de homepage. " +
        "Slechts één actieve hadith tegelijk; bij meerdere actieve rijen toont de homepage " +
        "de rij met laagste 'sort' waarde.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, COLLECTION, {
    field: "title",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      required:  true,
      note:      "Werktitel voor admin (niet zichtbaar op homepage — daar staat altijd 'Hadith van de dag').",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, COLLECTION, {
    field: "arabic_text",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:      "Arabische tekst van de hadith (RTL). Mag leeg blijven als alleen vertaling getoond wordt.",
    },
    schema: {},
  });

  await ensureField(client, COLLECTION, {
    field: "translation_nl",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      required:  true,
      note:      "Nederlandse vertaling. Verplicht — zonder vertaling rendert de homepage geen hadith.",
    },
    schema: { is_nullable: false },
  });

  await ensureField(client, COLLECTION, {
    field: "source",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      note:      "Bron, bv. 'Sahih Al-Bukhari 1, Sahih Muslim 1907'.",
    },
    schema: {},
  });

  await ensureField(client, COLLECTION, {
    field: "grade",
    type:  "string",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Authenticiteit, bv. 'Sahih', 'Hasan'. Mag leeg blijven.",
    },
    schema: {},
  });

  await ensureField(client, COLLECTION, {
    field: "explanation_short",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:      "Optionele korte uitleg of context (1-3 zinnen).",
    },
    schema: {},
  });

  await ensureField(client, COLLECTION, {
    field: "display_date",
    type:  "date",
    meta: {
      width:     "half",
      interface: "datetime",
      note:      "Optioneel — alleen ter eigen administratie wanneer deze hadith is/wordt getoond.",
    },
    schema: {},
  });

  await ensureField(client, COLLECTION, {
    field: "sort",
    type:  "integer",
    meta: {
      width:     "half",
      interface: "input",
      note:      "Lager = eerder. Bij meerdere actieve hadiths kiest de homepage de laagste sort.",
    },
    schema: { default_value: 1 },
  });

  await ensureField(client, COLLECTION, {
    field: "created_at",
    type:  "timestamp",
    meta: {
      width:     "full",
      interface: "datetime",
      special:   ["date-created"],
      readonly:  true,
    },
    schema: {},
  });

  // ─── Voorbeeld-rij (active=false) ──────────────────────────
  await upsertHadithByTitle(client, SAMPLE_HADITH);

  console.log("✓ Stap 45 voltooid");
}
