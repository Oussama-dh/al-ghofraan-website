// app/sitemap.ts

import type { MetadataRoute } from "next";
import { getSiteUrl }         from "@/lib/utils";

/**
 * Statische sitemap met alleen de vaste publieke routes.
 *
 * Bewust GEEN Directus-fetch hier:
 *   - sitemap moet ook bouwen / serven als CMS offline is
 *   - artikelen / onderwijs / dynamische pagina's worden door bots
 *     ontdekt via interne links vanaf de overzichtspagina's
 *   - houdt build snel en deterministisch
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now  = new Date();

  const paths = [
    "/",
    "/dawahcommissie",
    "/onderwijs",
    "/artikelen",
    "/agenda",
    "/gebedstijden",
    "/doneren",
    "/contact",
    "/privacy",
    "/videos",
  ];

  return paths.map((path) => ({
    url:        `${base}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority:   path === "/" ? 1 : 0.7,
  }));
}
