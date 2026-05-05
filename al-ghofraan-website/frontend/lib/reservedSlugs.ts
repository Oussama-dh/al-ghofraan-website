// lib/reservedSlugs.ts
// Slugs die overeenkomen met vaste app-routes en daarom NIET via
// app/[slug]/page.tsx mogen worden afgehandeld. Wordt gebruikt door
// generateStaticParams en de runtime guard in [slug]/page.tsx.

export const RESERVED_SLUGS = [
  "agenda",
  "gebedstijden",
  "doneren",
  "dawahcommissie",
  "api",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
];

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug);
}