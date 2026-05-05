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

// ─── UTIL ───────────────────────────────────────────────────

export function is404(err) {
  return /→\s*4(0[34]|0[01])\b/.test(err?.message || "")
      || (err?.errors?.[0]?.extensions?.code === "RECORD_NOT_UNIQUE")
      || (err?.errors?.[0]?.message || "").includes("doesn't exist");
}
