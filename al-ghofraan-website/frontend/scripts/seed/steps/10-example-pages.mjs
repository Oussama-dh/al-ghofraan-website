// scripts/seed/steps/10-example-pages.mjs
// Voegt een voorbeeld-dynamische-pagina toe als demo van [slug].
// Idempotent: vult alleen lege velden, behoudt handmatige edits.

function isEmpty(v) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

async function upsertPageContent(client, data) {
  const { slug } = data;
  const search = await client.get(
    `/items/page_content?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1`
  );
  const existing = search?.data?.[0];

  if (existing) {
    const patch = {};
    for (const [field, value] of Object.entries(data)) {
      if (field === "slug") continue;
      if (isEmpty(existing[field])) patch[field] = value;
    }
    if (Object.keys(patch).length === 0) {
      console.log(`  · page_content/${slug}: ongewijzigd`);
    } else {
      await client.patch(`/items/page_content/${existing.id}`, patch);
      console.log(`  ↻ page_content/${slug}: aangevuld (${Object.keys(patch).join(", ")})`);
    }
    return existing.id;
  }
  const created = await client.post("/items/page_content", data);
  console.log(`  ✓ page_content/${slug}: aangemaakt`);
  return created?.data?.id;
}

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
    const patch = {};
    for (const [field, value] of Object.entries(data)) {
      if (field === "page_slug" || field === "key") continue;
      if (Array.isArray(value)) {
        if (!existing[field] || (Array.isArray(existing[field]) && existing[field].length === 0)) {
          patch[field] = value;
        }
      } else if (isEmpty(existing[field])) {
        patch[field] = value;
      }
    }
    if (Object.keys(patch).length === 0) {
      console.log(`  · page_sections: ${page_slug}/${key} ongewijzigd`);
    } else {
      await client.patch(`/items/page_sections/${existing.id}`, patch);
      console.log(`  ↻ page_sections: ${page_slug}/${key} aangevuld`);
    }
    return existing.id;
  }
  await client.post("/items/page_sections", data);
  console.log(`  ✓ page_sections: ${page_slug}/${key} aangemaakt`);
}

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
  await client.post("/items/page_section_items", data);
  console.log(`  ✓ page_section_items: ${page_slug}/${section_key}/"${title}" aangemaakt`);
}

export async function seedExamplePages(client) {
  console.log("\n📄 Stap 10 · Voorbeeld dynamische pagina (jongeren)");

  // Pagina-content
  await upsertPageContent(client, {
    slug:     "jongeren",
    title:    "Jongerenprogramma",
    subtitle: "Voor de volgende generatie",
    intro:    "Activiteiten en cursussen speciaal voor jongeren binnen onze gemeenschap.",
    body:     "<p>De DawahCommissie organiseert maandelijks activiteiten voor jongeren tussen 12 en 25 jaar. Doel: identiteit versterken, kennis verdiepen en een hechte gemeenschap bouwen.</p>",
    icon:     "users",
    status:   "draft",  // Bewust draft — gebruiker activeert zelf
    seo_title: "Jongerenprogramma | DawahCommissie Al-Ghofraan",
    seo_description: "Activiteiten en cursussen speciaal voor jongeren binnen onze gemeenschap.",
  });

  // Voorbeeld-sectie: card_grid
  await upsertSection(client, {
    page_slug:          "jongeren",
    key:                "activities",
    type:               "card_grid",
    label:              "Wat doen we voor jongeren",
    title:              "Wat we aanbieden",
    intro:              "Een overzicht van onze jongerenprogramma's.",
    background_variant: "default",
    active:             true,
    sort:               10,
  });

  await upsertSectionItem(client, {
    page_slug:   "jongeren",
    section_key: "activities",
    title:       "Maandelijkse jongerenavond",
    description: "Discussies, lezingen en sociale activiteiten voor jongeren.",
    icon:        "users",
    sort:        10,
    active:      true,
  });

  await upsertSectionItem(client, {
    page_slug:   "jongeren",
    section_key: "activities",
    title:       "Qur'aan-cursus",
    description: "Recitatie en uitleg van betekenissen voor beginners en gevorderden.",
    icon:        "book-open",
    sort:        20,
    active:      true,
  });

  await upsertSectionItem(client, {
    page_slug:   "jongeren",
    section_key: "activities",
    title:       "Sportieve activiteiten",
    description: "Voetbal-toernooien, zwemmen en uitstapjes.",
    icon:        "sparkles",
    sort:        30,
    active:      true,
  });

  // CTA onderaan
  await upsertSection(client, {
    page_slug:           "jongeren",
    key:                 "join_cta",
    type:                "cta",
    label:               "CTA jongeren",
    eyebrow_ar:          "للشباب",
    title:               "Doe mee!",
    intro:               "Neem contact op om je aan te sluiten bij ons jongerenprogramma.",
    primary_cta_label:   "Meld je aan",
    primary_cta_href:    "/contact",
    secondary_cta_label: "Bekijk de agenda",
    secondary_cta_href:  "/agenda",
    icon:                "hand-heart",
    active:              true,
    sort:                20,
  });

  console.log("✓ Stap 10 voltooid (let op: pagina staat op 'draft' — activeer in Directus om hem live te zetten)");
}
