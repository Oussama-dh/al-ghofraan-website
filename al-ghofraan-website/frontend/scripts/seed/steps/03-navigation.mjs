// scripts/seed/steps/03-navigation.mjs

import { upsertItem } from "../lib/helpers.mjs";

export async function seedNavigation(client) {
  console.log("\n🧭 Stap 3 · Menu-items");

  const items = [
    { label: "Home",          href: "/",               sort: 10, highlight: false, external: false, active: true },
    { label: "Over ons",      href: "/dawahcommissie", sort: 20, highlight: false, external: false, active: true },
    { label: "Agenda",        href: "/agenda",         sort: 30, highlight: false, external: false, active: true },
    { label: "Gebedstijden",  href: "/gebedstijden",   sort: 40, highlight: false, external: false, active: true },
    { label: "Doneren",       href: "/doneren",        sort: 50, highlight: true,  external: false, active: true },
  ];

  for (const item of items) {
    await upsertItem(client, "navigation_items", "label", item.label, item);
  }

  console.log("✓ Stap 3 voltooid");
}
