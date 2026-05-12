// scripts/seed/lib/helpers.mjs
// Idempotente helpers voor collecties, velden en items.

// ─── COLLECTIES ─────────────────────────────────────────────

export async function ensureCollection(client, collection) {
  try {
    await client.get(`/collections/${collection.collection}`);
    console.log(`  · collectie "${collection.collection}" bestaat al`);
    return false;
  } catch (e) {
    if (!is404(e)) throw e;
  }

  await client.post("/collections", collection);
  console.log(`  ✓ collectie "${collection.collection}" aangemaakt`);
  return true;
}

// ─── VELDEN ─────────────────────────────────────────────────

export async function ensureField(client, collection, field) {
  try {
    await client.get(`/fields/${collection}/${field.field}`);
    return false;
  } catch (e) {
    if (!is404(e)) throw e;
  }

  await client.post(`/fields/${collection}`, field);
  console.log(`  + veld "${collection}.${field.field}"`);
  return true;
}

/**
 * Idempotent patcher voor `meta.options` op een bestaand veld.
 *
 * Anders dan `ensureField` (die nieuwe velden CREATE't) raakt deze helper
 * een bestaand veld aan om `meta.options` bij te werken zonder de
 * schemadefinitie of de inhoud van het veld te wijzigen. Gebruikt voor
 * dingen zoals de TinyMCE toolbar op rich-text velden.
 *
 * Veiligheidskenmerken:
 * - Skipt netjes als het veld niet bestaat (warning, geen crash).
 * - Skipt als `expectedInterface` is meegegeven en het veld een ander
 *   interface heeft (zo raken we nooit per ongeluk een veld van een
 *   ander type aan).
 * - `toolbar` wordt gemerged: bestaande entries blijven in hun volgorde
 *   staan; alleen ontbrekende entries uit `toolbarAdditions` worden
 *   achteraan toegevoegd. Er wordt nooit een toolbar-entry verwijderd.
 * - Andere `options`-sleutels worden via Object-spread gemerged: bestaande
 *   waarden blijven staan, nieuwe alleen toegevoegd als de sleutel
 *   nog niet bestaat (in `extraOptions`).
 * - PATCH wordt alleen verstuurd als er daadwerkelijk iets verandert.
 *
 * @param {object}   client
 * @param {string}   collection
 * @param {string}   fieldName
 * @param {object}   patch
 * @param {string[]} [patch.toolbarAdditions]  toolbar-entries om toe te voegen (merge)
 * @param {object}   [patch.extraOptions]      andere options-sleutels (alleen als nog niet aanwezig)
 * @param {string}   [patch.expectedInterface] verwacht interface, bv. "input-rich-text-html"
 */
export async function ensureFieldOptions(client, collection, fieldName, patch = {}) {
  const { toolbarAdditions = [], extraOptions = {}, expectedInterface } = patch;

  // 1. Veld ophalen
  let field;
  try {
    const res = await client.get(`/fields/${collection}/${fieldName}`);
    field = res?.data;
  } catch (e) {
    if (is404(e)) {
      console.log(`  ⚠ veld "${collection}.${fieldName}" bestaat niet — overgeslagen`);
      return false;
    }
    throw e;
  }

  if (!field || !field.meta) {
    console.log(`  ⚠ veld "${collection}.${fieldName}" heeft geen meta — overgeslagen`);
    return false;
  }

  // 2. Interface controleren (veiligheidsnet)
  if (expectedInterface && field.meta.interface !== expectedInterface) {
    console.log(
      `  ⚠ veld "${collection}.${fieldName}" heeft interface "${field.meta.interface}" ` +
      `(verwacht "${expectedInterface}") — overgeslagen`
    );
    return false;
  }

  // 3. Bestaande options lezen
  const currentOptions = field.meta.options || {};
  const newOptions = { ...currentOptions };
  let changed = false;

  // 4. Toolbar mergen (unieke union, behoud bestaande volgorde)
  if (toolbarAdditions.length > 0) {
    const currentToolbar = Array.isArray(currentOptions.toolbar) ? currentOptions.toolbar : [];
    const merged = currentToolbar.slice();
    for (const key of toolbarAdditions) {
      if (!merged.includes(key)) {
        merged.push(key);
        changed = true;
      }
    }
    if (changed) {
      newOptions.toolbar = merged;
    }
  }

  // 5. Andere options-sleutels alleen toevoegen als ze ontbreken
  for (const [k, v] of Object.entries(extraOptions)) {
    if (!(k in currentOptions)) {
      newOptions[k] = v;
      changed = true;
    }
  }

  // 6. Geen wijziging → niets versturen
  if (!changed) {
    console.log(`  · veld "${collection}.${fieldName}" ongewijzigd`);
    return false;
  }

  // 7. PATCH alleen meta.options (rest van het veld blijft intact)
  await client.patch(`/fields/${collection}/${fieldName}`, {
    meta: { options: newOptions },
  });
  console.log(`  ↻ veld "${collection}.${fieldName}" options bijgewerkt`);
  return true;
}

// ─── ITEMS (upsert via natural key) ─────────────────────────

/**
 * Upsert: zoekt een item op via filterField/filterValue en update of inserteert.
 *
 * @param {object}  client
 * @param {string}  collection
 * @param {string}  filterField  veld waarop wordt gezocht (bv. "slug" of "label")
 * @param {string}  filterValue  waarde
 * @param {object}  data         volledige payload (filterField wordt automatisch toegevoegd)
 */
export async function upsertItem(client, collection, filterField, filterValue, data) {
  const search = await client.get(
    `/items/${collection}?filter[${filterField}][_eq]=${encodeURIComponent(filterValue)}&limit=1`
  );

  const existing = search?.data?.[0];

  if (existing) {
    await client.patch(`/items/${collection}/${existing.id}`, data);
    console.log(`  ↻ ${collection}: "${filterValue}" geüpdatet`);
    return existing.id;
  } else {
    const created = await client.post(`/items/${collection}`, {
      [filterField]: filterValue,
      ...data,
    });
    console.log(`  ✓ ${collection}: "${filterValue}" aangemaakt`);
    return created?.data?.id;
  }
}

/** Singleton-collecties (1 rij): leest bestaande, schrijft een PATCH. */
export async function upsertSingleton(client, collection, data) {
  // Voor singletons gebruikt Directus de speciale endpoint
  // GET /items/{collection} retourneert het object (geen array)
  const existing = await client.get(`/items/${collection}`);

  if (existing?.data?.id) {
    await client.patch(`/items/${collection}`, data);
    console.log(`  ↻ singleton "${collection}" geüpdatet`);
    return existing.data.id;
  } else {
    const created = await client.patch(`/items/${collection}`, data);
    console.log(`  ✓ singleton "${collection}" aangemaakt`);
    return created?.data?.id;
  }
}

/**
 * Soft-create: maakt een item alleen aan als er nog géén item is met
 * deze filterField/filterValue combinatie. Bestaat het al, dan blijft
 * álle handmatige content (incl. status) intact. Alleen voor seed-data
 * die de admin daarna zelf mag beheren — geen schema/permissies.
 *
 * @param {object}  client
 * @param {string}  collection
 * @param {string}  filterField  veld waarop wordt gezocht (bv. "slug")
 * @param {string}  filterValue  waarde
 * @param {object}  data         volledige payload (filterField wordt automatisch toegevoegd)
 */
export async function softCreateItem(client, collection, filterField, filterValue, data) {
  const search = await client.get(
    `/items/${collection}?filter[${filterField}][_eq]=${encodeURIComponent(filterValue)}&limit=1`
  );

  const existing = search?.data?.[0];

  if (existing) {
    console.log(`  · ${collection}: "${filterValue}" bestaat al — niet overschreven`);
    return existing.id;
  }

  const created = await client.post(`/items/${collection}`, {
    [filterField]: filterValue,
    ...data,
  });
  console.log(`  ✓ ${collection}: "${filterValue}" aangemaakt`);
  return created?.data?.id;
}

// ─── UTIL ───────────────────────────────────────────────────

export function is404(err) {
  return /→\s*4(0[34]|0[01])\b/.test(err?.message || "")
      || (err?.errors?.[0]?.extensions?.code === "RECORD_NOT_UNIQUE")
      || (err?.errors?.[0]?.message || "").includes("doesn't exist");
}
