// scripts/seed/steps/04-site-settings.mjs

import { upsertSingleton } from "../lib/helpers.mjs";

export async function seedSiteSettings(client) {
  console.log("\n⚙️  Stap 4 · Site-instellingen");

  await upsertSingleton(client, "site_settings", {
    site_name:     "Al-Ghofraan",
    contact_email: "el-masoudi@hotmail.com",
    phone:         "",
    address:       "",
    social_links: {
      facebook:  "",
      instagram: "",
      youtube:   "",
      whatsapp:  "",
    },
  });

  console.log("✓ Stap 4 voltooid");
}
