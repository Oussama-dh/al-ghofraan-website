// scripts/seed/lib/env.mjs
// Leest environment variables uit het hoofd-.env (één map omhoog vanaf frontend/).

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname }         from "node:path";
import { fileURLToPath }            from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseDotenv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val   = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export function loadEnv() {
  // Probeer in volgorde:
  //   1. proces-env (CI/scripts)
  //   2. ../../.env  (vanaf frontend/scripts/seed/lib → root)
  //   3. ../../../.env (extra fallback)
  const candidates = [
    resolve(__dirname, "../../../../.env"),
    resolve(__dirname, "../../../.env"),
    resolve(__dirname, "../../.env"),
    resolve(process.cwd(), "../.env"),
    resolve(process.cwd(), ".env"),
  ];

  let fileEnv = {};
  for (const path of candidates) {
    if (existsSync(path)) {
      fileEnv = parseDotenv(readFileSync(path, "utf-8"));
      console.log(`📄 .env geladen uit: ${path}`);
      break;
    }
  }

  const merged = { ...fileEnv, ...process.env };

  const env = {
    DIRECTUS_URL:
      merged.DIRECTUS_PUBLIC_URL ||
      merged.NEXT_PUBLIC_DIRECTUS_URL ||
      merged.DIRECTUS_URL ||
      "http://localhost:8055",
    DIRECTUS_ADMIN_EMAIL:    merged.DIRECTUS_ADMIN_EMAIL    || "admin@al-ghofraan.com",
    DIRECTUS_ADMIN_PASSWORD: merged.DIRECTUS_ADMIN_PASSWORD || "Admin1234!",
  };

  if (!env.DIRECTUS_ADMIN_EMAIL || !env.DIRECTUS_ADMIN_PASSWORD) {
    throw new Error(
      "DIRECTUS_ADMIN_EMAIL en DIRECTUS_ADMIN_PASSWORD moeten in .env staan"
    );
  }

  return env;
}
