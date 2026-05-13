// app/vacatures/[slug]/page.tsx
//
// Detail-pagina voor een individuele vacature (delivery 18).
//
// Filtering: getVacancyBySlug retourneert alleen records met
// status=published. Drafts en archived → notFound().
//
// Patronen hergebruikt:
//   - Hero met optionele image: gelijke structuur als /artikelen/[slug]
//     (delivery 12 image-overlay opacity-20 mechaniek).
//   - Rich-text body via .rich-text class (delivery 13).
//   - Defensieve veld-extractie: voorkomt 500's bij rare admin-input.

import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import Container         from "@/components/ui/Container";
import Button            from "@/components/ui/Button";
import { MapPin, Clock, CalendarClock, ExternalLink, Mail } from "lucide-react";
import {
  getVacancyBySlug,
  getAllVacancySlugs,
  getAssetUrl,
  getSiteSettings,
} from "@/lib/directus";
import { formatDate }    from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export const dynamic       = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate    = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllVacancySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [vacancy, settings] = await Promise.all([
    getVacancyBySlug(params.slug),
    getSiteSettings(),
  ]);
  if (!vacancy) return { title: "Vacature niet gevonden" };

  const title =
    (typeof vacancy.title === "string" && vacancy.title) || "Vacature";
  const description =
    (typeof vacancy.summary === "string" && vacancy.summary) ||
    (typeof settings?.default_seo_description === "string" && settings.default_seo_description) ||
    undefined;

  return { title, description };
}

export default async function VacatureDetailPage({ params }: Props) {
  const vacancy = await getVacancyBySlug(params.slug);
  if (!vacancy) notFound();

  // ─── Defensieve veld-extractie ────────────────────────────────────
  const imageId =
    typeof vacancy.hero_image === "string"
      ? vacancy.hero_image
      : (vacancy.hero_image && typeof vacancy.hero_image === "object" && "id" in vacancy.hero_image
          ? vacancy.hero_image.id
          : null);
  const imageUrl = imageId ? getAssetUrl(imageId) : "";

  const bodyHtml = typeof vacancy.body === "string" ? vacancy.body : "";

  // CTA-link: extern (apply_url) heeft voorrang; anders /contact als
  // fallback zodat de pagina altijd een actie heeft.
  const hasApplyUrl   = typeof vacancy.apply_url === "string" && vacancy.apply_url.length > 0;
  const hasContactEmail = typeof vacancy.contact_email === "string" && vacancy.contact_email.length > 0;
  const ctaHref       = hasApplyUrl ? vacancy.apply_url! : "/contact";
  const ctaIsExternal = hasApplyUrl;

  const showMeta = !!vacancy.location || !!vacancy.hours || !!vacancy.deadline;

  return (
    <>
      <section className="relative bg-slate-mosque text-white py-16 overflow-hidden">
        {imageUrl && (
          <div className="absolute inset-0 opacity-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={vacancy.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <Container className="relative z-10">
          <Button
            href="/vacatures"
            variant="ghost"
            size="sm"
            className="text-sand/70 hover:text-white mb-6 -ml-1"
          >
            ← Terug naar vacatures
          </Button>
          <h1 className="font-display text-3xl md:text-4xl lg:text-5xl text-white leading-tight text-balance mb-4 max-w-3xl">
            {vacancy.title}
          </h1>
          {vacancy.summary && (
            <p className="font-body text-base md:text-lg text-sand/85 leading-relaxed max-w-2xl">
              {vacancy.summary}
            </p>
          )}
        </Container>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container narrow>
          {/* Meta-grid: alleen tonen als er iets te tonen valt. */}
          {showMeta && (
            <dl className="grid gap-4 sm:grid-cols-3 mb-10 rounded-2xl border border-sand-200 bg-white p-6">
              {vacancy.location && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-taupe mb-1">
                    <MapPin className="w-3.5 h-3.5" />
                    Locatie
                  </dt>
                  <dd className="font-body text-sm text-ink">{vacancy.location}</dd>
                </div>
              )}
              {vacancy.hours && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-taupe mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    Uren
                  </dt>
                  <dd className="font-body text-sm text-ink">{vacancy.hours}</dd>
                </div>
              )}
              {vacancy.deadline && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-taupe mb-1">
                    <CalendarClock className="w-3.5 h-3.5" />
                    Deadline
                  </dt>
                  <dd className="font-body text-sm text-ink">{formatDate(vacancy.deadline)}</dd>
                </div>
              )}
            </dl>
          )}

          {bodyHtml && (
            <div
              className="rich-text max-w-none"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}

          {/* CTA-blok onderaan. Toont contact-email als extra optie alleen
              als die in Directus is ingevuld; de hoofdknop blijft de
              apply_url of (bij ontbreken) /contact. */}
          <div className="mt-12 rounded-2xl border border-slate-mosque/15 bg-white p-6 lg:p-8 text-center">
            <h2 className="font-display text-xl text-ink mb-2">
              Interesse in deze vacature?
            </h2>
            <p className="font-body text-sm text-taupe-dark mb-5 max-w-xl mx-auto">
              {hasApplyUrl
                ? "Klik op de knop hieronder om te reageren via het externe formulier."
                : "Neem contact met ons op om je interesse kenbaar te maken."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {ctaIsExternal ? (
                <a
                  href={ctaHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-mosque px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-dark transition-colors"
                >
                  Reageer op deze vacature
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <Button href={ctaHref} size="md">
                  Neem contact op
                </Button>
              )}

              {hasContactEmail && (
                <a
                  href={`mailto:${vacancy.contact_email}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-mosque/30 px-5 py-2.5 text-sm font-medium text-slate-mosque hover:bg-slate-mosque/5 transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {vacancy.contact_email}
                </a>
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
