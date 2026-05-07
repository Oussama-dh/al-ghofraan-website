// scripts/seed/steps/03-navigation.mjs

import { upsertItem } from "../lib/helpers.mjs";

export async function seedNavigation(client) {
  console.log("\n🧭 Stap 3 · Menu-items");

  // Header-items (de meeste). Doneren is een CTA met highlight.
  // Footer toont we standaard ook in de footer dankzij location: "both".
  const items = [
    { label: "Home",          href: "/",               sort: 10, highlight: false, external: false, active: true, location: "both"   },
    { label: "Over ons",      href: "/dawahcommissie", sort: 20, highlight: false, external: false, active: true, location: "both"   },
    { label: "Agenda",        href: "/agenda",         sort: 30, highlight: false, external: false, active: true, location: "both"   },
    { label: "Onderwijs",     href: "/onderwijs",      sort: 35, highlight: false, external: false, active: true, location: "header" },
    { label: "Artikelen",     href: "/artikelen",      sort: 38, highlight: false, external: false, active: true, location: "both"   },
    { label: "Video's",       href: "/videos",         sort: 39, highlight: false, external: false, active: true, location: "both"   },
    { label: "Gebedstijden",  href: "/gebedstijden",   sort: 40, highlight: false, external: false, active: true, location: "both"   },
    { label: "Contact",       href: "/contact",        sort: 45, highlight: false, external: false, active: true, location: "both"   },
    { label: "Doneren",       href: "/doneren",        sort: 50, highlight: true,  external: false, active: true, location: "both"   },
  ];

  // Voor bestaande items: alleen location toevoegen als die nog leeg is.
  for (const item of items) {
    try {
      const resp = await client.get(
        `/items/navigation_items?filter[label][_eq]=${encodeURIComponent(item.label)}&limit=1&fields=id,location`
      );
      const existing = resp?.data?.[0];

      if (existing) {
        // alleen location aanvullen als 'ie nog leeg is — alle andere velden ongemoeid
        if (!existing.location) {
          await client.patch(`/items/navigation_items/${existing.id}`, { location: item.location });
          console.log(`  ↻ ${item.label}: location ingesteld op "${item.location}"`);
        } else {
          console.log(`  · ${item.label}: bestaand item ongewijzigd`);
        }
      } else {
        await upsertItem(client, "navigation_items", "label", item.label, item);
      }
    } catch (err) {
      console.warn(`  ⚠️  ${item.label}: ${err.message}`);
    }
  }

  console.log("✓ Stap 3 voltooid");
}
