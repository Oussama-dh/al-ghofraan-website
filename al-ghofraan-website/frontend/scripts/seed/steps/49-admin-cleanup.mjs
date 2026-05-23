// scripts/seed/steps/49-admin-cleanup.mjs
//
// Cleanup-delivery die drie dingen veilig regelt:
//
// 1. UTM-helper terugdraaien:
//    - Detecteert collectie `utm_links` via /collections/utm_links
//    - Als die bestaat: DELETE /collections/utm_links
//      Directus 11 cascade'd automatisch:
//        - de bij die collection horende /fields records
//        - de bij die collection horende /permissions records
//        - de bij die collection horende /relations records
//    - Als de collectie NIET bestaat: log "geen actie nodig"
//    - Géén andere collecties of velden worden geraakt.
//    - Géén data buiten utm_links wordt verwijderd.
//
// 2. Ahadieth beheerder — site_settings cleanup:
//    - Detecteert policy "Ahadieth beheerder"
//    - Detecteert permission met policy=<ahadieth-policy> AND
//      collection=site_settings
//    - Als die bestaat: DELETE /permissions/<id>
//    - Géén andere permissions worden geraakt.
//    - Géén delete-permissions worden toegevoegd aan welke rol dan ook.
//
// 3. Field-note verbeteringen op 5 admin-zichtbare velden:
//    - activities.slug
//    - articles.slug
//    - education_programs.slug
//    - page_content.slug
//    - tv_announcements.type
//    Patch alleen `meta.note` — geen schema-wijziging, geen
//    interface-wijziging, geen rename, geen hidden/read-only changes.
//
// Idempotent: tweede run = no-op:
//   - utm_links cleanup: collectie weg → log "geen actie nodig"
//   - Ahadieth cleanup: permission weg → log "geen actie nodig"
//   - Field-notes: PATCH met identieke note = effectief no-op
//
// HARDE GARANTIES:
// - Alleen utm_links wordt verwijderd. NIETS anders.
// - Alleen één Ahadieth-permission (site_settings) wordt verwijderd.
//   De Ahadieth-rol/policy zelf blijft bestaan.
// - Géén delete-actie op andere collecties, rollen, policies of users.
// - Géén nieuwe public permissions.
// - Géén stap 37/40 wijzigingen.
// - Géén analytics/GA4 wijzigingen.
// - Géén bestaande field interfaces of typen gewijzigd.

const UTM_COLLECTION       = "utm_links";
const AHADIETH_POLICY_NAME = "Ahadieth beheerder";

export async function setupAdminCleanup(client) {
  console.log("\n🧹 Stap 49 · Admin cleanup (UTM weg + Ahadieth fix + field-notes)");

  await cleanupUtmLinks(client);
  await cleanupAhadiethSiteSettings(client);
  await improveFieldNotes(client);

  console.log("✓ Stap 49 voltooid");
}

// ─── 1. UTM-helper terugdraaien ───────────────────────────────

async function cleanupUtmLinks(client) {
  console.log(`  · UTM cleanup: zoeken naar collectie "${UTM_COLLECTION}"`);

  let exists = false;
  try {
    await client.get(`/collections/${UTM_COLLECTION}`);
    exists = true;
  } catch (err) {
    // 403 of 404 → bestaat niet (of niet zichtbaar voor deze token)
    if (err?.response?.status === 404 || err?.errors?.[0]?.extensions?.code === "ROUTE_NOT_FOUND") {
      exists = false;
    } else if (err?.message?.includes("404") || err?.message?.includes("ROUTE_NOT_FOUND")) {
      exists = false;
    } else {
      console.warn(`  ⚠️  UTM-collectie lookup faalde:`, err.message);
      return;
    }
  }

  if (!exists) {
    console.log(`  · UTM cleanup: collectie "${UTM_COLLECTION}" niet gevonden — geen actie nodig`);
    return;
  }

  console.log(`  · UTM cleanup: collectie "${UTM_COLLECTION}" gevonden — verwijderen`);
  console.log(`  · UTM cleanup: dit verwijdert ook automatisch alle velden, permissions en relations die ALLEEN aan "${UTM_COLLECTION}" hangen`);
  console.log(`  · UTM cleanup: GEEN andere collecties of velden worden geraakt`);

  try {
    await client.delete(`/collections/${UTM_COLLECTION}`);
    console.log(`  ✓ UTM cleanup: collectie "${UTM_COLLECTION}" verwijderd`);
  } catch (err) {
    console.warn(`  ⚠️  UTM cleanup: DELETE faalde:`, err.message);
    console.warn(`  ⚠️  UTM cleanup: handmatige verwijdering vereist in Directus admin (Settings → Data Model → utm_links → Delete)`);
  }
}

// ─── 2. Ahadieth beheerder — site_settings cleanup ────────────

async function cleanupAhadiethSiteSettings(client) {
  console.log(`  · Ahadieth cleanup: zoeken naar policy "${AHADIETH_POLICY_NAME}"`);

  let policyId;
  try {
    const resp = await client.get(
      `/policies?filter[name][_eq]=${encodeURIComponent(AHADIETH_POLICY_NAME)}&limit=1`
    );
    policyId = resp?.data?.[0]?.id;
  } catch (err) {
    console.warn(`  ⚠️  Ahadieth cleanup: policy-lookup faalde:`, err.message);
    return;
  }

  if (!policyId) {
    console.log(`  · Ahadieth cleanup: policy "${AHADIETH_POLICY_NAME}" niet gevonden — geen actie nodig`);
    return;
  }

  // Zoek permission(s) met deze policy + collection=site_settings.
  let permissions = [];
  try {
    const resp = await client.get(
      `/permissions` +
      `?filter[policy][_eq]=${policyId}` +
      `&filter[collection][_eq]=site_settings` +
      `&limit=-1`
    );
    permissions = resp?.data || [];
  } catch (err) {
    console.warn(`  ⚠️  Ahadieth cleanup: permission-lookup faalde:`, err.message);
    return;
  }

  if (permissions.length === 0) {
    console.log(`  · Ahadieth cleanup: geen site_settings-permission op "${AHADIETH_POLICY_NAME}" gevonden — geen actie nodig`);
    return;
  }

  console.log(`  · Ahadieth cleanup: ${permissions.length} site_settings-permission(s) gevonden — verwijderen`);

  for (const perm of permissions) {
    try {
      await client.delete(`/permissions/${perm.id}`);
      console.log(`  ✓ Ahadieth cleanup: permission ${perm.id} (action=${perm.action}) verwijderd`);
    } catch (err) {
      console.warn(`  ⚠️  Ahadieth cleanup: DELETE permission ${perm.id} faalde:`, err.message);
    }
  }
}

// ─── 3. Field-note verbeteringen ─────────────────────────────

// 5 admin-zichtbare velden waar de bestaande note ontbrak of te
// technisch was. We patchen ALLEEN meta.note; alle andere meta-keys
// blijven intact (PATCH op /fields/{collection}/{field} is partial).
const NOTE_UPDATES = [
  {
    collection: "activities",
    field:      "slug",
    note:
      "De URL-naam voor deze activiteit. Wordt automatisch aangevuld " +
      "vanuit de titel. Alleen kleine letters, cijfers en koppeltekens. " +
      "Wijzigen NA publicatie kan oude links breken — laat staan tenzij " +
      "echt nodig.",
  },
  {
    collection: "articles",
    field:      "slug",
    note:
      "De URL-naam voor dit artikel (verschijnt in /artikelen/...). " +
      "Wordt automatisch aangevuld vanuit de titel. Alleen kleine " +
      "letters, cijfers en koppeltekens. Wijzigen NA publicatie kan " +
      "oude links breken.",
  },
  {
    collection: "education_programs",
    field:      "slug",
    note:
      "De URL-naam voor dit onderwijsprogramma (verschijnt in " +
      "/onderwijs/...). Wordt automatisch aangevuld vanuit de titel. " +
      "Alleen kleine letters, cijfers en koppeltekens. Wijzigen NA " +
      "publicatie kan oude links breken.",
  },
  {
    collection: "page_content",
    field:      "slug",
    note:
      "Unieke pagina-key, bv. 'home', 'dawahcommissie', 'doneren', " +
      "'onze-moskee'. Bepaalt de URL: slug='onze-moskee' → " +
      "/onze-moskee. Wijzig dit alleen voor nieuwe pagina's; " +
      "bestaande slugs niet aanraken — dat breekt bookmarks en SEO.",
  },
  {
    collection: "tv_announcements",
    field:      "type",
    note:
      "Soort aankondiging — bepaalt subtiele visuele variatie op het " +
      "TV-scherm. Voor 'Hadieth' worden velden bron/referentie/grade " +
      "extra prominent getoond. Voor 'Mededeling' en 'Reminder' is een " +
      "korte titel + tekst meestal voldoende.",
  },
];

async function improveFieldNotes(client) {
  console.log(`  · Field-notes: ${NOTE_UPDATES.length} veld(en) bijwerken`);

  for (const update of NOTE_UPDATES) {
    await patchFieldNote(client, update.collection, update.field, update.note);
  }
}

async function patchFieldNote(client, collection, field, note) {
  // Eerst checken of het veld bestaat — we willen geen create
  // forceren in deze cleanup-stap.
  let existing;
  try {
    const resp = await client.get(`/fields/${collection}/${field}`);
    existing = resp?.data;
  } catch (err) {
    console.warn(`  ⚠️  Field-note: ${collection}.${field} niet gevonden — overgeslagen`);
    return;
  }

  const currentNote = existing?.meta?.note || "";
  if (currentNote === note) {
    console.log(`  · Field-note: ${collection}.${field} ongewijzigd (al up-to-date)`);
    return;
  }

  try {
    await client.patch(`/fields/${collection}/${field}`, {
      meta: { note },
    });
    console.log(`  ✓ Field-note: ${collection}.${field} bijgewerkt`);
  } catch (err) {
    console.warn(`  ⚠️  Field-note: ${collection}.${field} PATCH faalde:`, err.message);
  }
}
