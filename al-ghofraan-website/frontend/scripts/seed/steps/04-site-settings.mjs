// scripts/seed/steps/04-site-settings.mjs
// Vult site_settings met defaults — alleen velden die NU nog leeg zijn.
// Bestaande handmatige waarden blijven behouden. Volledig idempotent.

const DEFAULTS = {
  site_name:                "Al-Ghofraan",
  contact_email:            "el-masoudi@hotmail.com",
  footer_text:              "De DawahCommissie van moskee Al-Ghofraan organiseert lezingen, activiteiten en programma's voor de moslimgemeenschap.",
  default_seo_title:        "DawahCommissie Al-Ghofraan",
  default_seo_description:  "Lezingen, activiteiten en programma's voor de moslimgemeenschap.",
};

const BOOLEAN_DEFAULTS = {
  footer_enabled: true,
};

const JSON_DEFAULTS = {
  social_links: {
    facebook:  "",
    instagram: "",
    youtube:   "",
    whatsapp:  "",
  },
};

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

export async function seedSiteSettings(client) {
  console.log("\n⚙️  Stap 4 · Site-instellingen");

  let current = {};
  try {
    const resp = await client.get("/items/site_settings");
    current = resp?.data || {};
  } catch {
    // singleton bestaat nog niet — eerste schrijfactie maakt 'm aan
  }

  const payload = {};

  for (const [key, val] of Object.entries(DEFAULTS)) {
    if (isEmpty(current[key])) payload[key] = val;
  }
  for (const [key, val] of Object.entries(BOOLEAN_DEFAULTS)) {
    if (current[key] === null || current[key] === undefined) payload[key] = val;
  }
  for (const [key, val] of Object.entries(JSON_DEFAULTS)) {
    const cur = current[key];
    if (!cur || (typeof cur === "object" && Object.keys(cur).length === 0)) {
      payload[key] = val;
    }
  }

  if (Object.keys(payload).length === 0) {
    console.log("  · alle velden hebben al een waarde, niets om te vullen");
  } else {
    await client.patch("/items/site_settings", payload);
    console.log(`  ✓ ${Object.keys(payload).length} velden ingevuld: ${Object.keys(payload).join(", ")}`);
  }

  console.log("✓ Stap 4 voltooid");
}
