// scripts/seed/steps/08-icon-settings.mjs
// Vult de icon_settings collectie en patcht voorbeelddata met iconen.
// Idempotent — bestaande items worden geüpdatet, andere data blijft intact.

import { upsertItem } from "../lib/helpers.mjs";

const ICON_SETTINGS = [
  {
    key:         "activity_date_icon",
    icon:        "calendar",
    label:       "Datum (activiteit)",
    description: "Icoon naast de datum op activity-cards en de detailpagina.",
  },
  {
    key:         "activity_location_icon",
    icon:        "map-pin",
    label:       "Locatie (activiteit)",
    description: "Icoon naast de locatie van een activiteit.",
  },
  {
    key:         "prayer_times_icon",
    icon:        "clock",
    label:       "Gebedstijden",
    description: "Hoofdicoon voor de gebedstijden-banner en -pagina.",
  },
  {
    key:         "donation_icon",
    icon:        "hand-heart",
    label:       "Doneren",
    description: "Icoon voor de donatieplaceholder en CTA's.",
  },
  {
    key:         "contact_email_icon",
    icon:        "mail",
    label:       "Contact: e-mail",
    description: "Icoon naast het e-mailadres in de footer.",
  },
  {
    key:         "contact_phone_icon",
    icon:        "phone",
    label:       "Contact: telefoon",
    description: "Icoon naast het telefoonnummer in de footer.",
  },
  {
    key:         "contact_address_icon",
    icon:        "map-pin",
    label:       "Contact: adres",
    description: "Icoon naast het adres in de footer.",
  },
  {
    key:         "faq_icon",
    icon:        "message-circle",
    label:       "FAQ",
    description: "Standaardicoon voor FAQ-items zonder eigen icoon.",
  },
  {
    key:         "page_section_default_icon",
    icon:        "info",
    label:       "Pagina-sectie (standaard)",
    description: "Fallback-icoon voor page_content-blokken zonder eigen icoon.",
  },
];

const PAGE_ICONS = {
  home:           "sparkles",
  dawahcommissie: "book-open",
  doneren:        "hand-heart",
};

export async function seedIconSettings(client) {
  console.log("\n🎨 Stap 8 · icon_settings + iconen op voorbeelddata");

  // ─── Vul icon_settings ────────────────────────────────────
  for (const setting of ICON_SETTINGS) {
    await upsertItem(client, "icon_settings", "key", setting.key, setting);
  }

  // ─── Patch bestaande page_content met een icoon ───────────
  // We gebruiken een aparte upsert: zoek op slug en update alleen 'icon'.
  for (const [slug, icon] of Object.entries(PAGE_ICONS)) {
    try {
      const resp = await client.get(
        `/items/page_content?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1&fields=id,icon`
      );
      const item = resp?.data?.[0];
      if (item) {
        // Alleen patchen als nog geen icoon, of als bestaand icoon afwijkt — overschrijven is OK
        // Maar we behouden eventueel handmatig gezette waarden niet:
        // → veiliger: sla over als er al een icoon staat
        if (item.icon && item.icon.trim().length > 0) {
          console.log(`  · page_content/${slug}: behoudt bestaand icoon "${item.icon}"`);
        } else {
          await client.patch(`/items/page_content/${item.id}`, { icon });
          console.log(`  ✓ page_content/${slug}: icoon "${icon}" toegevoegd`);
        }
      } else {
        console.log(`  · page_content/${slug}: niet gevonden, overgeslagen`);
      }
    } catch (err) {
      console.warn(`  ⚠️  page_content/${slug}: ${err.message}`);
    }
  }

  // ─── Patch FAQ-items met een icoon ────────────────────────
  // Standaard "help-circle" voor alle FAQ-items zonder eigen icoon
  try {
    const resp = await client.get(
      `/items/faq_items?limit=-1&fields=id,question,icon`
    );
    const items = resp?.data || [];
    for (const item of items) {
      if (item.icon && item.icon.trim().length > 0) continue;
      await client.patch(`/items/faq_items/${item.id}`, { icon: "help-circle" });
      console.log(`  ✓ faq_items/${item.id}: icoon "help-circle" toegevoegd`);
    }
  } catch (err) {
    console.warn(`  ⚠️  faq_items patch: ${err.message}`);
  }

  console.log("✓ Stap 8 voltooid");
}
