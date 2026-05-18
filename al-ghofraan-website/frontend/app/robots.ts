// app/robots.ts

import type { MetadataRoute } from "next";
import { getSiteUrl }         from "@/lib/utils";

/**
 * Robots policy:
 *   - Crawlers mogen alles, behalve:
 *     * /gebedstijden/tv — intern TV-display, geen indexerings-waarde
 *     * /api             — backend endpoints, geen SEO-waarde
 *   - Sitemap-URL gebruikt NEXT_PUBLIC_SITE_URL (productie: al-ghofraan.nl)
 */
export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow:     "/",
        disallow:  ["/gebedstijden/tv", "/api"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
