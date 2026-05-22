// app/sitemap.ts
//
// Dynamische sitemap (delivery 26, uitgebreid in seo-analytics).
// Combineert:
//   1. Vaste publieke routes (homepage, agenda, gebedstijden, ...)
//      incl. /agenda/overzicht (maandkalender-view)
//   2. Alle published CMS-pagina's uit page_content (incl. /onze-moskee)
//   3. Alle published activity-detailpagina's (ook verleden — Google
//      blijft archief-pagina's serveren voor specifieke zoekopdrachten)
//   4. Alle published article-detailpagina's (/artikelen/[slug])
//   5. Alle published onderwijs-detailpagina's (/onderwijs/[slug])
//   6. Alleen open vacature-detailpagina's (deadline NULL of >= vandaag)
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
  getAllArticleSlugs,
  getAllEducationProgramSlugs,
} from "@/lib/directus";

/**
 * Revalidate elk uur (ISR).
 *
 * Reden: de sitemap aggregeert published content uit Directus. Zonder
 * revalidate zou Next.js de route static bouwen en pas bij volgende
 * `npm run build` de nieuwe artikelen/onderwijsprogramma's opnemen.
 *
 * Met `revalidate = 3600` serveert Next.js de gecachete sitemap
 * razendsnel uit zijn cache, en regenereert hem op de achtergrond
 * zodra hij ouder dan een uur is bij de volgende request. Een
 * artikel dat NU wordt gepubliceerd in Directus, verschijnt dus
 * binnen maximaal 60 minuten in /sitemap.xml — géén frontend-rebuild,
 * géén container-restart nodig.
 *
 * 3600 s = redelijke balans: vaak genoeg voor verse content, niet
 * zo vaak dat Directus onnodig wordt belast (SEO-crawlers vragen
 * sitemap.xml zelden meer dan 1x/uur).
 *
 * Trade-off: in de build-output wordt /sitemap.xml gelabeld als
 * "Static" (○) i.p.v. "Dynamic" (ƒ). Dat is geen bug — Next.js
 * markeert ISR-routes ook als ○ omdat de eerste render bij build
 * gegenereerd wordt en daarna in de cache leeft. De revalidate-
 * regel hieronder is echter wel actief; cache-misses leiden tot
 * een verse Directus-fetch.
 */
export const revalidate = 3600;

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
    "/agenda/overzicht",
    "/gebedstijden",
    "/gebedstijden/overzicht",
    "/doneren",
    "/contact",
    "/privacy",
    "/videos",
    "/vacatures",
  ];

  // Parallel ophalen van alle dynamische slugs.
  const [
    pageSlugs,
    activitySlugs,
    vacancySlugs,
    articleSlugs,
    educationSlugs,
  ] = await Promise.all([
    getAllPageContentSlugs(),
    getActivitySlugsForSitemap(),
    getOpenVacancySlugsForSitemap(),
    getAllArticleSlugs(),
    getAllEducationProgramSlugs(),
  ]);

  // page_content slugs die NIET overlappen met een vaste app-route.
  // (Een page_content-record met slug 'agenda' zou via [slug]/page.tsx
  // toch nooit gerenderd worden vanwege isReservedSlug — daarom niet
  // in sitemap).
  const cmsPagePaths = pageSlugs
    .filter((slug) => !isReservedSlug(slug))
    .map((slug) => `/${slug}`);

  const activityPaths  = activitySlugs.map((e) => `/agenda/${e.slug}`);
  const vacancyPaths   = vacancySlugs.map((e) => `/vacatures/${e.slug}`);
  const articlePaths   = articleSlugs.map((slug) => `/artikelen/${slug}`);
  const educationPaths = educationSlugs.map((slug) => `/onderwijs/${slug}`);

  const allPaths = [
    ...staticPaths,
    ...cmsPagePaths,
    ...activityPaths,
    ...vacancyPaths,
    ...articlePaths,
    ...educationPaths,
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
