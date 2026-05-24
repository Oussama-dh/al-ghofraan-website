// scripts/seed/steps/26-admin-list-layouts.mjs
//
// Maakt admin-lijsten in Directus overzichtelijker via twee veilige
// metadata-pads:
//
//   1. collection.meta:
//        display_template — hoe een record wordt weergegeven in M2O/lijst
//        sort_field       — welk veld als default-sortering voor de UI
//        archive_field    — toggle archived/active in toolbar
//      (`PATCH /collections/<name>` met een meta-payload. Idempotent:
//       we lezen eerst de huidige meta en patchen alleen verschillen.)
//
//   2. directus_presets:
//        Een "global preset" (role=null, user=null, collection=<name>)
//        bepaalt de lijst-layout voor *alle* gebruikers tenzij ze hun
//        eigen preset hebben opgeslagen. We zetten:
//          - layout            = "tabular"
//          - layout_query      = { tabular: { sort: [..] } }
//          - layout_options    = { tabular: { fields: [..] } }
//
//      Velden die niet in de collectie bestaan worden veilig
//      overgeslagen zodat een PATCH nooit faalt op een ontbrekend
//      veld (bv. `category_ref` op een oudere installatie).
//
// HARDE GARANTIES:
//   - Geen data wijzigingen (records).
//   - Geen permissies wijzigen.
//   - Geen velden verwijderen.
//   - Geen collecties hernoemen.
//   - Tweede run = no-op (preset-record wordt gevonden en alleen bij
//     verschil ge-patched).
//   - Per-user/per-role presets blijven onaangeraakt — we werken alleen
//     op de globale preset (role=null, user=null).

const LAYOUTS = [
  {
    collection: "registrations",
    template:   "{{student_number}} · {{name}} ({{type}})",
    sort_field: "-created_at",
    archive_field: "status",
    listFields: [
      "student_number", "name", "parent_name", "parent_phone",
      "source_title", "type", "status", "created_at",
    ],
    listSort: ["-created_at"],
  },
  {
    collection: "contact_messages",
    template:   "{{subject}} — {{name}}",
    sort_field: "-created_at",
    archive_field: "status",
    listFields: [
      "subject", "name", "email", "status",
      "handled_by", "last_contacted_at", "created_at",
    ],
    listSort: ["-created_at"],
  },
  {
    collection: "donations",
    template:   "€{{amount_display}} · {{donor_name}}",
    sort_field: "-created_at",
    archive_field: "status",
    listFields: [
      "amount_display", "campaign_title", "donor_name", "donor_email",
      "status", "type", "paid_at", "created_at",
    ],
    listSort: ["-created_at"],
  },
  {
    collection: "education_programs",
    template:   "{{title}} ({{target_group}})",
    sort_field: "sort",
    archive_field: "status",
    listFields: [
      "title", "teacher", "target_group", "registration_enabled",
      "status", "start_date", "sort",
    ],
    listSort: ["sort", "start_date"],
  },
  {
    collection: "activities",
    template:   "{{title}} — {{date}}",
    sort_field: "date",
    archive_field: "status",
    listFields: [
      "title", "date", "location", "registration_enabled",
      "status", "sort",
    ],
    listSort: ["date"],
  },
  {
    collection: "articles",
    template:   "{{title}}",
    sort_field: "-published_at",
    archive_field: "status",
    listFields: [
      "title", "category_ref", "category", "status",
      "featured", "published_at",
    ],
    listSort: ["-published_at"],
  },
  {
    collection: "videos",
    template:   "{{title}}",
    sort_field: "-published_at",
    archive_field: "status",
    listFields: [
      "title", "category_ref", "status",
      "featured", "show_on_homepage", "published_at",
    ],
    listSort: ["-published_at"],
  },
  {
    collection: "tv_announcements",
    template:   "{{title}} ({{type}})",
    sort_field: "sort",
    archive_field: "status",
    listFields: [
      "title", "type", "status", "active",
      "show_on_tv", "display_from", "display_until", "sort",
    ],
    listSort: ["sort", "-created_at"],
  },
  {
    collection: "donation_campaigns",
    template:   "{{title}}",
    sort_field: "sort",
    archive_field: "status",
    listFields: [
      "title", "status", "featured", "goal_amount_eur",
      "use_stripe_payment_link", "sort",
    ],
    listSort: ["sort"],
  },
];

export async function setupAdminListLayouts(client) {
  console.log("\n📋 Stap 26 · Admin-lijst layouts (Directus presets + meta)");

  // 1. Welke velden bestaan in welke collecties? Eén keer ophalen.
  const fieldsByCollection = await loadAllFieldsByCollection(client, LAYOUTS);

  let metaUpdated = 0, presetsCreated = 0, presetsUpdated = 0, skipped = 0;

  for (const layout of LAYOUTS) {
    const exists = fieldsByCollection.has(layout.collection);
    if (!exists) {
      console.log(`  · ${layout.collection}: collectie bestaat niet — overgeslagen`);
      skipped++;
      continue;
    }

    const available = fieldsByCollection.get(layout.collection);

    // 2. Update collection meta (display_template, sort_field, archive_field)
    try {
      const metaChange = {};
      const curr = await client.get(`/collections/${layout.collection}`);
      const m = curr?.data?.meta || {};

      if (layout.template && m.display_template !== layout.template) {
        metaChange.display_template = layout.template;
      }
      // sort_field zonder leidende `-` (alleen veld-naam volgens Directus)
      const sortFieldBare = layout.sort_field?.replace(/^-/, "");
      if (sortFieldBare && available.has(sortFieldBare) && m.sort_field !== sortFieldBare) {
        metaChange.sort_field = sortFieldBare;
      }
      if (layout.archive_field && available.has(layout.archive_field) && m.archive_field !== layout.archive_field) {
        metaChange.archive_field = layout.archive_field;
      }

      if (Object.keys(metaChange).length > 0) {
        await client.patch(`/collections/${layout.collection}`, { meta: metaChange });
        console.log(`  ↻ ${layout.collection}: meta bijgewerkt (${Object.keys(metaChange).join(", ")})`);
        metaUpdated++;
      }
    } catch (err) {
      console.warn(`  ⚠️  ${layout.collection}: meta-update mislukt:`, err.message);
    }

    // 3. Filter list-velden op wat echt bestaat (idempotent + veilig)
    const filteredFields = layout.listFields.filter((f) => available.has(f));
    if (filteredFields.length < layout.listFields.length) {
      const missing = layout.listFields.filter((f) => !available.has(f));
      console.log(`  · ${layout.collection}: lijst-velden overgeslagen (bestaan niet): ${missing.join(", ")}`);
    }
    if (filteredFields.length === 0) {
      console.log(`  · ${layout.collection}: geen list-velden beschikbaar — preset overgeslagen`);
      skipped++;
      continue;
    }

    // 4. Vind of maak globale preset (role=null, user=null)
    try {
      const search = await client.get(
        `/presets` +
        `?filter[collection][_eq]=${encodeURIComponent(layout.collection)}` +
        `&filter[role][_null]=true` +
        `&filter[user][_null]=true` +
        `&limit=1`
      );
      const existing = search?.data?.[0];

      const payload = {
        collection:     layout.collection,
        role:           null,
        user:           null,
        layout:         "tabular",
        layout_query:   { tabular: { sort: layout.listSort.filter((s) => available.has(s.replace(/^-/, ""))) } },
        layout_options: { tabular: { fields: filteredFields } },
      };

      if (existing) {
        // Alleen patchen wanneer er werkelijk iets verandert.
        const sameLayout = existing.layout === payload.layout;
        const sameOpts   = JSON.stringify(existing.layout_options) === JSON.stringify(payload.layout_options);
        const sameQuery  = JSON.stringify(existing.layout_query)   === JSON.stringify(payload.layout_query);

        if (sameLayout && sameOpts && sameQuery) {
          // niets te doen
        } else {
          await client.patch(`/presets/${existing.id}`, payload);
          console.log(`  ↻ ${layout.collection}: preset bijgewerkt`);
          presetsUpdated++;
        }
      } else {
        await client.post("/presets", payload);
        console.log(`  ✓ ${layout.collection}: preset aangemaakt`);
        presetsCreated++;
      }
    } catch (err) {
      console.warn(`  ⚠️  ${layout.collection}: preset-update mislukt:`, err.message);
    }
  }

  console.log(
    `✓ Stap 26 voltooid · meta-updates ${metaUpdated} · ` +
    `presets ${presetsCreated} nieuw, ${presetsUpdated} bijgewerkt · ` +
    `${skipped} overgeslagen`
  );
}

async function loadAllFieldsByCollection(client, layouts) {
  const out = new Map();
  for (const layout of layouts) {
    try {
      const resp = await client.get(`/fields/${layout.collection}?limit=-1`);
      const fields = (resp?.data || []).map((f) => f.field);
      out.set(layout.collection, new Set(fields));
    } catch (err) {
      // 403/404 = collectie bestaat niet → niet in de map
      console.log(`  · ${layout.collection}: kan velden niet ophalen (${err.message.split("\n")[0]})`);
    }
  }
  return out;
}
