// scripts/seed/steps/09-page-sections.mjs
// Vult page_sections + page_section_items met voorbeelddata.
//
// Idempotent met compound-key upsert: zoekt op page_slug + key.
// Behoudt handmatige edits — overschrijft alleen als de waarde leeg is.

const HOME_MISSION = {
  page_slug:     "home",
  key:           "mission",
  type:          "split_feature",
  label:         "Missieblok homepage",
  eyebrow_ar:    "رسالتنا",
  title:         "Onze missie",
  intro:         "Wij geloven dat kennis, gemeenschap en dienstbaarheid de pijlers zijn van een bloeiende moslimgemeenschap.",
  card_title_ar: "الدعوة",
  card_subtitle: "Ad-Da'wa — De Uitnodiging",
  card_tags:     ["الإيمان", "العلم", "العمل"],
  active:        true,
  sort:          10,
};

const HOME_MISSION_ITEMS = [
  {
    page_slug:   "home",
    section_key: "mission",
    title:       "Kennis verspreiden",
    description: "Door lezingen en cursussen de kennis over de islam toegankelijk maken voor iedereen.",
    icon:        "book-open",
    sort:        10,
    active:      true,
  },
  {
    page_slug:   "home",
    section_key: "mission",
    title:       "Gemeenschap bouwen",
    description: "Bruggen slaan binnen en buiten de moslimgemeenschap door ontmoeting en dialoog.",
    icon:        "users",
    sort:        20,
    active:      true,
  },
  {
    page_slug:   "home",
    section_key: "mission",
    title:       "Dienend zijn",
    description: "De samenleving dienen met oprechtheid en toewijding, zoals de Profeet ﷺ ons leerde.",
    icon:        "hand-heart",
    sort:        30,
    active:      true,
  },
];

function isEmpty(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/**
 * Compound upsert voor page_sections.
 * Zoekt op page_slug + key. Bestaat al? Vult alleen lege velden aan.
 * Bestaat niet? Maakt aan met alle velden.
 */
async function upsertSection(client, data) {
  const { page_slug, key } = data;
  const search = await client.get(
    `/items/page_sections` +
    `?filter[page_slug][_eq]=${encodeURIComponent(page_slug)}` +
    `&filter[key][_eq]=${encodeURIComponent(key)}` +
    `&limit=1`
  );
  const existing = search?.data?.[0];

  if (existing) {
    // Vul alleen lege velden aan — bewaar handmatige edits
    const patch = {};
    for (const [field, value] of Object.entries(data)) {
      if (field === "page_slug" || field === "key") continue;
      const current = existing[field];
      if (Array.isArray(value)) {
        if (!current || (Array.isArray(current) && current.length === 0)) {
          patch[field] = value;
        }
      } else if (isEmpty(current)) {
        patch[field] = value;
      }
    }
    if (Object.keys(patch).length === 0) {
      console.log(`  · page_sections: ${page_slug}/${key} ongewijzigd (al ingevuld)`);
    } else {
      await client.patch(`/items/page_sections/${existing.id}`, patch);
      console.log(`  ↻ page_sections: ${page_slug}/${key} aangevuld (${Object.keys(patch).join(", ")})`);
    }
    return existing.id;
  }

  const created = await client.post("/items/page_sections", data);
  console.log(`  ✓ page_sections: ${page_slug}/${key} aangemaakt`);
  return created?.data?.id;
}

/**
 * Compound upsert voor page_section_items.
 * Zoekt op page_slug + section_key + title.
 */
async function upsertSectionItem(client, data) {
  const { page_slug, section_key, title } = data;
  const search = await client.get(
    `/items/page_section_items` +
    `?filter[page_slug][_eq]=${encodeURIComponent(page_slug)}` +
    `&filter[section_key][_eq]=${encodeURIComponent(section_key)}` +
    `&filter[title][_eq]=${encodeURIComponent(title)}` +
    `&limit=1`
  );
  const existing = search?.data?.[0];

  if (existing) {
    const patch = {};
    for (const [field, value] of Object.entries(data)) {
      if (field === "page_slug" || field === "section_key" || field === "title") continue;
      if (isEmpty(existing[field])) patch[field] = value;
    }
    if (Object.keys(patch).length === 0) {
      console.log(`  · page_section_items: ${page_slug}/${section_key}/"${title}" ongewijzigd`);
    } else {
      await client.patch(`/items/page_section_items/${existing.id}`, patch);
      console.log(`  ↻ page_section_items: ${page_slug}/${section_key}/"${title}" aangevuld`);
    }
    return existing.id;
  }

  const created = await client.post("/items/page_section_items", data);
  console.log(`  ✓ page_section_items: ${page_slug}/${section_key}/"${title}" aangemaakt`);
  return created?.data?.id;
}

export async function seedPageSections(client) {
  console.log("\n🧱 Stap 9 · Voorbeeld-secties + items");

  await upsertSection(client, HOME_MISSION);

  for (const item of HOME_MISSION_ITEMS) {
    await upsertSectionItem(client, item);
  }

  console.log("✓ Stap 9 voltooid");
}
