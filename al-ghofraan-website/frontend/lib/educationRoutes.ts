// lib/educationRoutes.ts
//
// Hifdh programma is een GEWOON onderwijsprogramma in `education_programs`
// (slug `hifdhprogramma`) en wordt dus door /onderwijs/[slug] gerenderd met
// dezelfde blokken als alle andere programma's (docent, doelgroep, planning,
// locatie, beschrijving, flyer, inschrijven-flow). Alleen het formulier zelf
// is Hifdh-specifiek (meerdere kinderen, niveaus, betaling) — zie
// components/registration/QuranRegistrationForm.tsx.

import type { EducationAudience } from "@/types/directus";

export const HIFDH_PROGRAM_SLUG = "hifdhprogramma";
export const HIFDH_PROGRAM_TITLE = "Hifdh programma";
export const HIFDH_PROGRAM_CTA = "Hifdh oel-Qoraan";

export function isHifdhProgram(slug: string | null | undefined): boolean {
  return slug === HIFDH_PROGRAM_SLUG;
}

/**
 * Doelgroep van een programma (education_programs.audience, seed-stap 72):
 * "children" → Hifdh-formulier, "adults" → volwassenenformulier. Leeg telt als
 * volwassenen, behalve Hifdh (vangnet zolang stap 72 nog niet gedraaid is).
 */
export function programAudience(program: {
  slug?: string | null;
  audience?: EducationAudience | null;
}): EducationAudience {
  if (program.audience === "children" || program.audience === "adults") return program.audience;
  return isHifdhProgram(program.slug) ? "children" : "adults";
}

/** Letters-vraag vóór het kinderformulier; zonder waarde alleen bij Hifdh. */
export function requiresLettersCheck(program: {
  slug?: string | null;
  require_letters_check?: boolean | null;
}): boolean {
  if (typeof program.require_letters_check === "boolean") return program.require_letters_check;
  return isHifdhProgram(program.slug);
}

/** Actielabel op de programmakaart op /onderwijs (standaard: "Bekijk programma"). */
const PROGRAM_CARD_CTA: Record<string, string> = {
  [HIFDH_PROGRAM_SLUG]: HIFDH_PROGRAM_CTA,
};

export function getProgramCardCta(slug: string): string | null {
  return PROGRAM_CARD_CTA[slug] ?? null;
}

/** Oude route /onderwijs/inschrijven is een permanente redirect (next.config.mjs). */
export const REDIRECTED_EDUCATION_SLUGS: readonly string[] = ["inschrijven"];

/** Slugs die niet als /onderwijs/[slug]-detailpagina in de sitemap horen. */
export function isReservedEducationSlug(slug: string): boolean {
  return REDIRECTED_EDUCATION_SLUGS.includes(slug);
}
