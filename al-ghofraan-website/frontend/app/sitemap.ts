// app/sitemap.ts
//
// Dynamische sitemap (delivery 26). Combineert:
//   1. Vaste publieke routes (homepage, agenda, gebedstijden, ...)
//   2. Alle published CMS-pagina's uit page_content (incl. /onze-moskee)
//   3. Alle published activity-detailpagina's (ook verleden — Google
//      blijft archief-pagina's serveren voor specifieke zoekopdrachten)
//   4. Alleen open vacature-detailpagina's (deadline NULL of >= vandaag)
//
// Fail-soft: alle Directus-fetches lopen door safe()-wrappers die []
// retourneren bij offline CMS of build-time fouten. De vaste routes
// blijven dan altijd in de sitemap.
//
// Uitgesloten: /gebedstijden/tv (geen indexerings-waarde), /api,
// draft/archived content. Zie ook app/robots.ts.

import type { MetadataRoute } from "next";
import { getSiteUrl }         from "@/lib/utils";
import { isReservedSlug }     from "@/lib/reservedSlugs";
import {
  getAllPageContentSlugs,
  getActivitySlugsForSitemap,
  getOpenVacancySlugsForSitemap,
} from "@/lib/directus";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now  = new Date();

  // Vaste publieke routes met expliciete app-page.tsx files.
  // Alleen GET-routes opnemen, geen sub-routes als /agenda/[slug]
  // (die komen via de dynamische fetches hieronder).
  const staticPaths = [
    "/",
    "/dawahcommissie",
    "/onderwijs",
    "/artikelen",
    "/agenda",
    "/gebedstijden",
    "/gebedstijden/overzicht",
    "/doneren",
    "/contact",
    "/privacy",
    "/videos",
    "/vacatures",
  ];

  // Parallel ophalen van alle dynamische slugs.
  const [pageSlugs, activitySlugs, vacancySlugs] = await Promise.all([
    getAllPageContentSlugs(),
    getActivitySlugsForSitemap(),
    getOpenVacancySlugsForSitemap(),
  ]);

  // page_content slugs die NIET overlappen met een vaste app-route.
  // (Een page_content-record met slug 'agenda' zou via [slug]/page.tsx
  // toch nooit gerenderd worden vanwege isReservedSlug — daarom niet
  // in sitemap).
  const cmsPagePaths = pageSlugs
    .filter((slug) => !isReservedSlug(slug))
    .map((slug) => `/${slug}`);

  const activityPaths = activitySlugs.map((e) => `/agenda/${e.slug}`);
  const vacancyPaths  = vacancySlugs.map((e) => `/vacatures/${e.slug}`);

  const allPaths = [
    ...staticPaths,
    ...cmsPagePaths,
    ...activityPaths,
    ...vacancyPaths,
  ];

  // De-duplicate (defensief — staticPaths/cmsPagePaths zouden niet
  // mogen overlappen na de reserved-filter, maar voor de zekerheid).
  const uniquePaths = Array.from(new Set(allPaths));

  return uniquePaths.map((path) => ({
    url:             `${base}${path}`,
    lastModified:    now,
    changeFrequency: "weekly",
    priority:        path === "/" ? 1 : 0.7,
  }));
}
