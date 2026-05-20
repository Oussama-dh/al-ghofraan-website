// scripts/seed/steps/25-roles-policies.mjs
//
// Maakt rollen + policies aan voor afdelingsbeheerders. Directus 11
// gebruikt policies om permissions te bundelen; rollen krijgen daarna
// één of meerdere policies toegewezen.
//
// HARDE GARANTIES:
// - Bestaande Admin-rol blijft volledig ongewijzigd.
// - Public-policy/role blijft ongewijzigd.
// - Bestaande users worden NOOIT aan een nieuwe rol gekoppeld.
// - Geen DELETE-actie op rollen, policies of permissions.
// - Gewone beheerders krijgen geen delete-actie op data-collecties.
//   Status-velden (draft/archived) zorgen voor het "verwijder-gevoel"
//   zonder echte data-verlies.
// - Onbekende bestaande policies blijven onaangeraakt.
// - Tweede run = no-op (alle ensure-functies controleren eerst).
//
// Schema (Directus 11):
//   /roles                         (id, name, description, icon)
//   /policies                      (id, name, description, icon, app_access, admin_access)
//   /permissions                   (id, policy, collection, action, fields, permissions, validation)
//   /access                        (id, role, policy, sort)   ← Directus 11 koppelt rol↔policy via /access
//
// We gebruiken één policy per rol (rolnaam-policy). Sommige projecten
// hebben meerdere policies per rol; we kiezen voor 1:1 omdat:
//   1. de set permissions per afdeling overzichtelijk in één lijst staat
//   2. de admin per rol direct ziet wat de policy doet (zelfde naam)
//   3. uitbreiden blijft simpel (extra collectie → één policy bewerken)

// ─── Rol-definities ───────────────────────────────────────────
//
// `manage` = full CRU MINUS delete (create, read, update; bewust géén
//            delete — beheerder kan via status archiveren).
// `read`   = alleen read.
// `filteredAccess` = optionele permissies met een Directus-filter,
//                    bv. registrations met type=education.

const ROLE_DEFS = [
  {
    role: {
      name:        "Content beheerder",
      description: "Pagina's, artikelen, videos, activiteiten, FAQ, navigatie, secties.",
      icon:        "edit_note",
    },
    manage: [
      "page_content", "articles", "article_categories",
      "videos", "video_categories",
      "activities", "faq_items",
      "page_sections", "page_section_items",
      "navigation_items",
      // Delivery daily-hadith — content-beheerder mag ahadieth beheren.
      "daily_hadiths",
    ],
    read: [
      "site_settings", "directus_files",
    ],
  },
  {
    role: {
      name:        "Onderwijs beheerder",
      description: "Onderwijsprogramma's + onderwijsinschrijvingen (filter type=education).",
      icon:        "school",
    },
    manage: [
      "education_programs",
    ],
    read: [
      "site_settings", "directus_files",
    ],
    // Filtered manage: kan inschrijvingen lezen + updaten, maar alleen
    // die met type=education. Geen create/delete (nieuwe inschrijvingen
    // komen via formulier; verwijderen is admin-only).
    filteredAccess: [
      {
        collection: "registrations",
        actions:    ["read", "update"],
        filter:     { type: { _eq: "education" } },
      },
    ],
  },
  {
    role: {
      name:        "Activiteiten beheerder",
      description: "Activiteiten + activiteit-inschrijvingen (filter type=activity).",
      icon:        "event",
    },
    manage: [
      "activities",
    ],
    read: [
      "site_settings", "directus_files",
    ],
    filteredAccess: [
      {
        collection: "registrations",
        actions:    ["read", "update"],
        filter:     { type: { _eq: "activity" } },
      },
    ],
  },
  {
    role: {
      name:        "Contact beheerder",
      description: "Contactberichten en contact-onderwerpen.",
      icon:        "mail",
    },
    manage: [
      "contact_messages",
      "contact_subjects",
    ],
    read: [
      "site_settings", "directus_files",
    ],
  },
  {
    role: {
      name:        "Donatie beheerder",
      description: "Donaties (read-only) en donatiecampagnes.",
      icon:        "volunteer_activism",
    },
    manage: [
      "donation_campaigns",
    ],
    read: [
      "donations",   // bewust read-only: financiële records worden niet handmatig gemuteerd.
      "site_settings",
      "directus_files",
    ],
  },
  {
    role: {
      name:        "TV beheerder",
      description: "TV-aankondigingen (mededelingen, ahadieth, reminders).",
      icon:        "live_tv",
    },
    manage: [
      "tv_announcements",
    ],
    read: [
      "site_settings", "prayer_time_files", "directus_files",
    ],
  },
  {
    role: {
      name:        "Gebedstijden beheerder",
      description: "Gebedstijden-bestanden en handmatige Hijri-overrides.",
      icon:        "schedule",
    },
    manage: [
      "prayer_time_files",
      "hijri_date_overrides",
    ],
    read: [
      "site_settings", "directus_files",
    ],
  },
];

// ─── Hoofd-entry ──────────────────────────────────────────────

export async function setupRolesAndPolicies(client) {
  console.log("\n🛡️  Stap 25 · Rollen + policies (afdelingsbeheerders)");

  // Welke collecties bestaan eigenlijk? Onbekende collecties slaan we
  // veilig over zodat een seed-run niet faalt op nog niet bestaande
  // collecties.
  const existingCollections = await listExistingCollections(client);

  let rolesCreated = 0;
  let rolesExisting = 0;
  let policiesCreated = 0;
  let policiesExisting = 0;
  let permsCreatedOrUpdated = 0;
  let permsSkipped = 0;

  for (const def of ROLE_DEFS) {
    // 1. Rol ensure (gebaseerd op naam)
    const role = await ensureRole(client, def.role);
    if (role.created) rolesCreated++; else rolesExisting++;

    // 2. Policy ensure (zelfde naam als rol)
    const policyName = def.role.name;
    const policy = await ensurePolicy(client, {
      name:         policyName,
      description:  def.role.description,
      icon:         def.role.icon,
      app_access:   true,    // kan inloggen op admin-UI
      admin_access: false,
    });
    if (policy.created) policiesCreated++; else policiesExisting++;

    // 3. Koppel policy aan rol (via /access)
    await ensureAccess(client, role.id, policy.id);

    // 4. Permissions op de policy
    for (const collection of def.manage || []) {
      if (!existingCollections.has(collection)) {
        console.log(`  · ${policyName} → ${collection}: collectie bestaat niet, overgeslagen`);
        permsSkipped += 3;
        continue;
      }
      for (const action of ["create", "read", "update"]) {
        const changed = await ensurePermission(client, {
          policy:      policy.id,
          collection,
          action,
          fields:      ["*"],
          permissions: null,   // ongelimiteerd — voor manage-collecties
          validation:  null,
        });
        if (changed) permsCreatedOrUpdated++;
      }
      // BEWUST GEEN delete-action voor manage-collecties.
    }

    for (const collection of def.read || []) {
      if (!existingCollections.has(collection)) {
        console.log(`  · ${policyName} → ${collection}: collectie bestaat niet, overgeslagen`);
        permsSkipped++;
        continue;
      }
      const changed = await ensurePermission(client, {
        policy:      policy.id,
        collection,
        action:      "read",
        fields:      ["*"],
        permissions: null,
        validation:  null,
      });
      if (changed) permsCreatedOrUpdated++;
    }

    for (const fa of def.filteredAccess || []) {
      if (!existingCollections.has(fa.collection)) {
        console.log(`  · ${policyName} → ${fa.collection}: collectie bestaat niet, overgeslagen`);
        permsSkipped += fa.actions.length;
        continue;
      }
      for (const action of fa.actions) {
        const changed = await ensurePermission(client, {
          policy:      policy.id,
          collection:  fa.collection,
          action,
          fields:      ["*"],
          permissions: fa.filter,
          validation:  null,
        });
        if (changed) permsCreatedOrUpdated++;
      }
    }
  }

  console.log(
    `✓ Stap 25 voltooid · ` +
    `rollen ${rolesCreated} nieuw, ${rolesExisting} bestond al · ` +
    `policies ${policiesCreated} nieuw, ${policiesExisting} bestond al · ` +
    `permissions ${permsCreatedOrUpdated} aangemaakt/bijgewerkt, ${permsSkipped} overgeslagen`
  );
}

// ─── Helpers ───────────────────────────────────────────────────

async function listExistingCollections(client) {
  try {
    const resp = await client.get("/collections?limit=-1");
    const set = new Set();
    for (const c of resp?.data || []) {
      if (c?.collection) set.add(c.collection);
    }
    // Directus systeem-collecties zijn ook valide
    set.add("directus_files");
    set.add("directus_users");
    return set;
  } catch (err) {
    console.warn("  ⚠️  Kon collecties niet ophalen:", err.message);
    return new Set();
  }
}

async function ensureRole(client, def) {
  // Zoek op naam (rollen-naam is uniek in Directus)
  try {
    const resp = await client.get(
      `/roles?filter[name][_eq]=${encodeURIComponent(def.name)}&limit=1`
    );
    const existing = resp?.data?.[0];
    if (existing) {
      console.log(`  · rol "${def.name}" bestaat al (${existing.id})`);
      return { id: existing.id, created: false };
    }
  } catch (err) {
    console.warn(`  ⚠️  rol-lookup faalde voor "${def.name}":`, err.message);
  }

  try {
    const resp = await client.post("/roles", {
      name:        def.name,
      description: def.description,
      icon:        def.icon,
    });
    const id = resp?.data?.id;
    console.log(`  ✓ rol "${def.name}" aangemaakt (${id})`);
    return { id, created: true };
  } catch (err) {
    console.warn(`  ⚠️  rol "${def.name}" aanmaken mislukt:`, err.message);
    throw err;
  }
}

async function ensurePolicy(client, def) {
  try {
    const resp = await client.get(
      `/policies?filter[name][_eq]=${encodeURIComponent(def.name)}&limit=1`
    );
    const existing = resp?.data?.[0];
    if (existing) {
      console.log(`  · policy "${def.name}" bestaat al (${existing.id})`);
      return { id: existing.id, created: false };
    }
  } catch (err) {
    console.warn(`  ⚠️  policy-lookup faalde voor "${def.name}":`, err.message);
  }

  try {
    const resp = await client.post("/policies", {
      name:         def.name,
      description:  def.description,
      icon:         def.icon,
      app_access:   def.app_access ?? true,
      admin_access: def.admin_access ?? false,
    });
    const id = resp?.data?.id;
    console.log(`  ✓ policy "${def.name}" aangemaakt (${id})`);
    return { id, created: true };
  } catch (err) {
    console.warn(`  ⚠️  policy "${def.name}" aanmaken mislukt:`, err.message);
    throw err;
  }
}

async function ensureAccess(client, roleId, policyId) {
  try {
    const resp = await client.get(
      `/access?filter[role][_eq]=${roleId}&filter[policy][_eq]=${policyId}&limit=1`
    );
    if (resp?.data?.[0]) return;
  } catch (err) {
    console.warn(`  ⚠️  access-lookup faalde:`, err.message);
  }

  try {
    await client.post("/access", { role: roleId, policy: policyId, sort: 1 });
    console.log(`  ✓ access role=${roleId} ↔ policy=${policyId} gekoppeld`);
  } catch (err) {
    console.warn(`  ⚠️  access-koppeling mislukt (role=${roleId}, policy=${policyId}):`, err.message);
  }
}

/**
 * Maakt of update een permission-record. Een policy×collection×action
 * is uniek per Directus-conventie; we zoeken daarop en doen patch of post.
 *
 * Returnt true als er iets is veranderd, false als er niets te doen viel.
 */
async function ensurePermission(client, p) {
  let existing;
  try {
    const resp = await client.get(
      `/permissions` +
      `?filter[policy][_eq]=${p.policy}` +
      `&filter[collection][_eq]=${encodeURIComponent(p.collection)}` +
      `&filter[action][_eq]=${p.action}` +
      `&limit=1`
    );
    existing = resp?.data?.[0];
  } catch (err) {
    console.warn(`  ⚠️  permission-lookup faalde:`, err.message);
    return false;
  }

  if (existing) {
    const samePerms  = JSON.stringify(existing.permissions || null) === JSON.stringify(p.permissions || null);
    const sameFields = JSON.stringify(existing.fields || ["*"]) === JSON.stringify(p.fields);
    if (samePerms && sameFields) {
      return false;
    }
    try {
      await client.patch(`/permissions/${existing.id}`, {
        fields:      p.fields,
        permissions: p.permissions,
        validation:  p.validation,
      });
      console.log(`  ↻ permission ${p.collection}/${p.action} (policy ${p.policy}) bijgewerkt`);
      return true;
    } catch (err) {
      console.warn(`  ⚠️  permission-update faalde voor ${p.collection}/${p.action}:`, err.message);
      return false;
    }
  }

  try {
    await client.post("/permissions", p);
    console.log(`  ✓ permission ${p.collection}/${p.action} (policy ${p.policy}) aangemaakt`);
    return true;
  } catch (err) {
    console.warn(`  ⚠️  permission-create faalde voor ${p.collection}/${p.action}:`, err.message);
    return false;
  }
}
