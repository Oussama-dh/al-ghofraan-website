// scripts/seed/steps/02-permissions.mjs
// Directus 11 — gebruikt het policies-model.
//
// Permissies hangen niet meer rechtstreeks aan een rol, maar aan een
// "Access Policy". Voor publieke (unauthenticated) toegang gebruikt
// Directus 11 een speciale policy die meegeleverd wordt.
//
// Bij twijfel of falen → de fallback in PUBLIC_PERMISSIONS_FALLBACK.md
// legt stap-voor-stap uit hoe het via de UI in te stellen.

const COLLECTIONS = [
  { collection: "activities",        filter: { status:    { _eq: "published" } } },
  { collection: "prayer_time_files", filter: { active:    { _eq: true       } } },
  { collection: "site_settings",     filter: null },
  { collection: "navigation_items",  filter: { active:    { _eq: true       } } },
  { collection: "page_content",      filter: { status:    { _eq: "published" } } },
  { collection: "faq_items",         filter: { published: { _eq: true       } } },
  { collection: "directus_files",    filter: null },
];

export async function setupPermissions(client) {
  console.log("\n🔐 Stap 2 · Public read-permissies (Directus 11 policies)");

  // ─── 1. Vind de Public-policy ────────────────────────────
  const publicPolicy = await findPublicPolicy(client);

  if (!publicPolicy) {
    console.warn("");
    console.warn("⚠️  Public-policy niet automatisch gevonden.");
    console.warn("    De handmatige fallback staat in:");
    console.warn("    frontend/scripts/seed/PUBLIC_PERMISSIONS_FALLBACK.md");
    console.warn("    Het script gaat door zodat de andere stappen kunnen draaien.");
    console.warn("");
    return;
  }

  console.log(`  · Public policy gevonden: ${publicPolicy.id} (${publicPolicy.name || "Public"})`);

  // ─── 2. Bestaande permissies van deze policy ophalen ────
  let existingPerms;
  try {
    const resp = await client.get(
      `/permissions?filter[policy][_eq]=${publicPolicy.id}&limit=-1`
    );
    existingPerms = resp?.data || [];
  } catch (err) {
    console.warn("");
    console.warn("⚠️  Kon bestaande permissies niet ophalen:", err.message);
    console.warn("    Mogelijk is je admin-token niet geautoriseerd voor de directus_permissions collectie.");
    console.warn("    Zie de handmatige fallback in:");
    console.warn("    frontend/scripts/seed/PUBLIC_PERMISSIONS_FALLBACK.md");
    console.warn("");
    return;
  }

  const existingMap = new Map();
  for (const perm of existingPerms) {
    existingMap.set(`${perm.collection}:${perm.action}`, perm);
  }

  // ─── 3. Upsert read-permissie per collectie ─────────────
  let success = 0;
  let failed  = 0;

  for (const { collection, filter } of COLLECTIONS) {
    const key = `${collection}:read`;

    const payload = {
      policy:      publicPolicy.id,
      collection,
      action:      "read",
      permissions: filter,
      validation:  null,
      presets:     null,
      fields:      ["*"],
    };

    try {
      if (existingMap.has(key)) {
        const perm = existingMap.get(key);
        await client.patch(`/permissions/${perm.id}`, payload);
        console.log(`  ↻ ${collection}: read-permissie geüpdatet`);
      } else {
        await client.post("/permissions", payload);
        console.log(`  ✓ ${collection}: read-permissie aangemaakt`);
      }
      success++;
    } catch (err) {
      console.warn(`  ⚠️  ${collection}: ${err.message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.warn("");
    console.warn(`⚠️  ${failed} van ${COLLECTIONS.length} permissies konden niet automatisch worden gezet.`);
    console.warn("    Volg de handmatige fallback in:");
    console.warn("    frontend/scripts/seed/PUBLIC_PERMISSIONS_FALLBACK.md");
  } else {
    console.log(`✓ Stap 2 voltooid (${success} permissies)`);
  }
}

// ─────────────────────────────────────────────────────────────
// Helper: vind de Public-policy
// ─────────────────────────────────────────────────────────────
//
// In Directus 11 is er een meegeleverde "Public" policy. We vinden
// hem in deze volgorde:
//   1. Filter op naam "Public" (de standaard)
//   2. Lees uit /policies/me — geeft de policies van de huidige user;
//      de Public-policy heeft geen rol of een speciaal kenmerk
//   3. Lijst alle policies en zoek de eerste waar geen rol aan hangt
async function findPublicPolicy(client) {
  // Poging 1 — directe naam-match
  try {
    const resp = await client.get(
      `/policies?filter[name][_eq]=Public&limit=1`
    );
    if (resp?.data?.[0]) return resp.data[0];
  } catch {
    /* probeer de volgende strategie */
  }

  // Poging 2 — alle policies en zoek heuristisch
  try {
    const resp = await client.get(`/policies?limit=-1`);
    const policies = resp?.data || [];

    // Zoek op naam (case-insensitive)
    const byName = policies.find(
      (p) => (p.name || "").toLowerCase() === "public"
    );
    if (byName) return byName;

    // Zoek op icon "public" (Directus' default heeft dit icon)
    const byIcon = policies.find((p) => p.icon === "public");
    if (byIcon) return byIcon;
  } catch (err) {
    console.warn("  · /policies endpoint niet bereikbaar:", err.message);
  }

  return null;
}
