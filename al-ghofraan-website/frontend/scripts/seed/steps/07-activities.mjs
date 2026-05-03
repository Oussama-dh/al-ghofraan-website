// scripts/seed/steps/07-activities.mjs

import { upsertItem } from "../lib/helpers.mjs";

function daysFromNow(days, hour = 13, minute = 30) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export async function seedActivities(client) {
  console.log("\n📅 Stap 7 · Voorbeeldactiviteiten");

  const activities = [
    {
      slug:        "vrijdagslezing-tawakkul",
      title:       "Vrijdagslezing — Tawakkul (vertrouwen op Allah)",
      description:
        "<p>In deze wekelijkse lezing bespreken we het concept <em>Tawakkul</em>: " +
        "vertrouwen op Allah. Hoe combineer je het nemen van praktische stappen met " +
        "oprecht vertrouwen op de Schepper? Een lezing voor jong en oud, " +
        "met ruimte voor vragen na afloop.</p>" +
        "<p>De lezing is in het Nederlands.</p>",
      start_date:           daysFromNow(7,  13, 30),
      end_date:             daysFromNow(7,  14, 30),
      location:             "Moskee Al-Ghofraan, Hoofdzaal",
      status:               "published",
      featured:             true,
      registration_enabled: false,
    },

    {
      slug:        "open-dag-moskee",
      title:       "Open dag — Moskee Al-Ghofraan",
      description:
        "<p>Iedereen is welkom! Tijdens onze open dag krijgt u een rondleiding " +
        "door de moskee, kunt u kennismaken met onze gemeenschap, en is er ruimte " +
        "voor al uw vragen over de islam.</p>" +
        "<p>Programma:</p>" +
        "<ul>" +
        "<li>10:00 — Ontvangst met thee en koffie</li>" +
        "<li>10:30 — Rondleiding</li>" +
        "<li>11:30 — Lezing &amp; vragenronde</li>" +
        "<li>12:30 — Gezamenlijke maaltijd</li>" +
        "</ul>",
      start_date:           daysFromNow(21, 10, 0),
      end_date:             daysFromNow(21, 14, 0),
      location:             "Moskee Al-Ghofraan",
      status:               "published",
      featured:             false,
      registration_enabled: false,
    },
  ];

  for (const activity of activities) {
    await upsertItem(client, "activities", "slug", activity.slug, activity);
  }

  console.log("✓ Stap 7 voltooid");
}
