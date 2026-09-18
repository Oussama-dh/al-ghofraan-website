// lib/educationRoutes.ts
//
// Vaste onderwijsroutes (onder /onderwijs) die een eigen pagina hebben en
// daarom WINNEN van de dynamische /onderwijs/[slug]. Een programma in
// `education_programs` met dezelfde slug wordt op /onderwijs als gewone
// kaart getoond; de kaart linkt vanzelf naar de vaste route, en krijgt
// hier zijn eigen actielabel.

export interface FixedEducationRoute {
  /** Actielabel op de programmakaart op /onderwijs. */
  ctaLabel: string;
}

export const HIFDH_PROGRAM_SLUG = "hifdhprogramma";
export const HIFDH_PROGRAM_TITLE = "Hifdh programma";
export const HIFDH_PROGRAM_PATH = `/onderwijs/${HIFDH_PROGRAM_SLUG}`;

export const FIXED_EDUCATION_ROUTES: Record<string, FixedEducationRoute> = {
  [HIFDH_PROGRAM_SLUG]: { ctaLabel: "Inschrijven Hifdh programma" },
};

/** Oude vaste routes die nu een permanente redirect zijn (zie next.config.mjs). */
export const REDIRECTED_EDUCATION_SLUGS: readonly string[] = ["inschrijven"];

export function getFixedEducationRoute(slug: string): FixedEducationRoute | null {
  return FIXED_EDUCATION_ROUTES[slug] ?? null;
}

/** Slugs die nooit als /onderwijs/[slug]-detailpagina in de sitemap horen. */
export function isReservedEducationSlug(slug: string): boolean {
  return slug in FIXED_EDUCATION_ROUTES || REDIRECTED_EDUCATION_SLUGS.includes(slug);
}
