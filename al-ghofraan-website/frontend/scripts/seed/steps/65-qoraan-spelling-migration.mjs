// scripts/seed/steps/65-qoraan-spelling-migration.mjs
//
// Migreert BESTAANDE Directus-content met de oude standaard-schrijfwijze
// (Qur'aan / Qur’aan / Quraan) naar "Qoraan". Alleen teksten die door de
// seedstappen 05, 10 en 11 zijn aangemaakt worden geraakt.
//
// Veilig en idempotent:
//   - Titels worden alleen gewijzigd bij een EXACTE match met een bekende oude
//     standaardwaarde (na trim). Elke andere waarde blijft onaangeraakt.
//   - Rich-text (`page_content.body`) wordt NIET globaal vervangen. Alleen de
//     bekende oude standaardzin (woord + omringende seed-context) wordt
//     aangepast. Heeft een beheerder de zin herschreven, dan is er geen match
//     en gebeurt er niets.
//   - Slugs, veldnamen en overige velden blijven ongewijzigd.
//   - Bestaat de collectie of het record niet (bv. verse installatie), dan wordt
//     dat overgeslagen. Een tweede run vindt niets meer om te wijzigen.
//
// Geraakt:
//   page_content          slug "dawahcommissie" en "onze-moskee"  → veld `body`
//   page_section_items    jongeren / activities                   → veld `title`
//   education_programs    slug "quraan-recitatie-beginners"       → veld `title`
//                         (de slug zelf verandert NIET)
//
// Volgorde: staat in STEPS vóór stap 10, zodat stap 10 (die items op titel
// opzoekt) na een volledige seed geen dubbel item met de nieuwe titel aanmaakt.

import { is404 } from "../lib/helpers.mjs";

/** Bekende oude spelling van het woord "Qoraan" (Qur'aan, Qur’aan, Quraan). */
const OLD = "(?:Qur(?:['’]|&#39;|&rsquo;)aan|Quraan)";

const TITLE_MIGRATIONS = [
  {
    label:      "page_section_items jongeren/activities",
    collection: "page_section_items",
    filter:     "filter[page_slug][_eq]=jongeren&filter[section_key][_eq]=activities",
    from:       ["Qur'aan-cursus", "Qur’aan-cursus", "Quraan-cursus"],
    to:         "Qoraan-cursus",
  },
  {
    label:      "education_programs quraan-recitatie-beginners",
    collection: "education_programs",
    filter:     "filter[slug][_eq]=quraan-recitatie-beginners",
    from: [
      "Qur'aan-recitatie voor beginners",
      "Qur’aan-recitatie voor beginners",
      "Quraan-recitatie voor beginners",
    ],
    to: "Qoraan-recitatie voor beginners",
  },
];

// Alleen deze bekende seed-zinnen worden in `body` aangepast (met context).
const BODY_MIGRATIONS = [
  {
    slug: "dawahcommissie",
    // <li>… Tawheed, Fiqh, Arabisch, Qur'aanrecitatie</li>
    pattern: new RegExp(`(Arabisch,\\s+)${OLD}(recitatie</li>)`),
  },
  {
    slug: "onze-moskee",
    // … (Tawheed, Fiqh, Arabisch,\n Qur'aanrecitatie) en speciale jeugdprogramma's
    pattern: new RegExp(`(Arabisch,\\s+)${OLD}(recitatie\\)\\s+en speciale jeugdprogramma)`),
  },
];

async function findItems(client, collection, query) {
  try {
    const res = await client.get(`/items/${collection}?${query}&limit=50`);
    return res?.data ?? [];
  } catch (err) {
    if (is404(err)) {
      console.log(`  · ${collection}: niet beschikbaar — overgeslagen`);
      return null;
    }
    throw err;
  }
}

async function migrateTitles(client, m) {
  const items = await findItems(client, m.collection, `${m.filter}&fields=id,title`);
  if (items === null) return;

  const old = items.filter((i) => typeof i.title === "string" && m.from.includes(i.title.trim()));
  if (old.length === 0) {
    console.log(`  · ${m.label}: geen oude standaardtitel gevonden — niets gewijzigd`);
    return;
  }

  const alreadyNew = items.some((i) => typeof i.title === "string" && i.title.trim() === m.to);
  if (alreadyNew) {
    console.log(`  ! ${m.label}: "${m.to}" bestaat al naast de oude titel — niet gemigreerd, handmatig controleren`);
    return;
  }

  for (const item of old) {
    const oldTitle = item.title;
    await client.patch(`/items/${m.collection}/${item.id}`, { title: m.to });
    console.log(`  ↻ ${m.label}: "${oldTitle}" → "${m.to}"`);
  }
}

async function migrateBodies(client) {
  for (const m of BODY_MIGRATIONS) {
    const items = await findItems(
      client,
      "page_content",
      `filter[slug][_eq]=${encodeURIComponent(m.slug)}&fields=id,body`,
    );
    if (items === null) return;

    const item = items[0];
    if (!item || typeof item.body !== "string" || !m.pattern.test(item.body)) {
      console.log(`  · page_content "${m.slug}": geen bekende oude standaardzin gevonden — niets gewijzigd`);
      continue;
    }

    const body = item.body.replace(m.pattern, "$1Qoraan$2");
    await client.patch(`/items/page_content/${item.id}`, { body });
    console.log(`  ↻ page_content "${m.slug}": standaardzin bijgewerkt naar "Qoraanrecitatie"`);
  }
}

export async function migrateQoraanSpelling(client) {
  console.log("\n✍️  Stap 65 · Spelling Qoraan — migratie bestaande content");

  await migrateBodies(client);
  for (const m of TITLE_MIGRATIONS) await migrateTitles(client, m);

  console.log("✓ Stap 65 voltooid");
}
