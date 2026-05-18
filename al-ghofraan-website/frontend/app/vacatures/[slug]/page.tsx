// app/vacatures/[slug]/page.tsx
//
// Detail-pagina voor een individuele vacature.
//
// Delivery 18 (origineel): basale hero + dl-grid + rich-text + CTA.
// Delivery 19 (rewrite): professionele indeling met sectie-anchors en
// uitgebreide meta-cards. Geen extra routes — alle secties zitten op
// dezelfde pagina en worden via in-page anchors (`#...`) bereikt.
//
// Indeling (top → bottom):
//   1. Hero (donker, slate-mosque) — titel + summary + terug-link
//   2. Pill-navigatie — anchor-links naar de drie secties (sticky)
//   3. Sectie "Functieomschrijving" — rich-text body
//   4. Sectie "Arbeidsvoorwaarden" — meta-cards grid
//                                    (locatie, uren, salaris, contractduur, deadline)
//                                    Alleen gevulde velden tonen.
//   5. Sectie "Solliciteren" — CTA-blok (apply_url | /contact) + contact_email
//
// Patroon-keuzes:
//   - Geen `next/image` (Directus assets quirk) — gebruik `<img>` + getAssetUrl.
//   - Geen nieuwe Tailwind kleuren — alleen bestaande palette
//     (sand, slate-mosque, taupe, ink).
//   - Geen `prose` / @tailwindcss/typography — body gebruikt `.rich-text`.
//   - Filtering: getVacancyBySlug retourneert alleen status=published;
//     drafts/archived → notFound().

import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import Container         from "@/components/ui/Container";
import Button            from "@/components/ui/Button";
import {
  MapPin,
  Clock,
  Coins,
  CalendarRange,
  CalendarClock,
  ExternalLink,
  Mail,
  Briefcase,
  ListChecks,
  Send,
} from "lucide-react";
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

  // Vacancy hero_image als og:image. Bij leeg veld valt og:image
  // terug op de site-brede default uit site_settings.og_image.
  const imageUrl = getAssetUrl(vacancy.hero_image as never);

  return {
    title,
    description,
    ...(imageUrl && {
      openGraph: {
        images: [{ url: imageUrl }],
      },
    }),
  };
}

// ─── Helper: MetaCard ──────────────────────────────────────────────
// Eén card per gevuld meta-veld in de Arbeidsvoorwaarden-grid.
function MetaCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-5 flex gap-4">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-slate-mosque/10 text-slate-mosque flex items-center justify-center">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider text-taupe mb-1">
          {label}
        </p>
        <p className="font-body text-sm text-ink break-words">{value}</p>
      </div>
    </div>
  );
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

  // CTA-link: extern (apply_url) heeft voorrang; anders /contact als fallback.
  const hasApplyUrl     = typeof vacancy.apply_url === "string" && vacancy.apply_url.length > 0;
  const hasContactEmail = typeof vacancy.contact_email === "string" && vacancy.contact_email.length > 0;
  const ctaHref         = hasApplyUrl ? vacancy.apply_url! : "/contact";
  const ctaIsExternal   = hasApplyUrl;

  // Meta-velden — alleen tonen als gevuld (defensief tegen lege strings).
  const metaItems: Array<{ icon: React.ReactNode; label: string; value: string }> = [];
  if (vacancy.location)
    metaItems.push({ icon: <MapPin className="w-5 h-5" />,        label: "Locatie",       value: vacancy.location });
  if (vacancy.hours)
    metaItems.push({ icon: <Clock className="w-5 h-5" />,         label: "Uren",          value: vacancy.hours });
  if (vacancy.salary)
    metaItems.push({ icon: <Coins className="w-5 h-5" />,         label: "Salaris",       value: vacancy.salary });
  if (vacancy.contract_duration)
    metaItems.push({ icon: <CalendarRange className="w-5 h-5" />, label: "Contractduur",  value: vacancy.contract_duration });
  if (vacancy.deadline)
    metaItems.push({ icon: <CalendarClock className="w-5 h-5" />, label: "Deadline",      value: formatDate(vacancy.deadline) });

  const hasMeta = metaItems.length > 0;
  const hasBody = bodyHtml.length > 0;

  return (
    <>
      {/* ─── 1. Hero ─────────────────────────────────────────── */}
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

      {/* ─── 2. Pill-navigatie ──────────────────────────────────
          Anchor-links naar de drie secties hieronder. Geen JS, geen
          tabs-component — pure semantische links die scrollen naar
          `#functieomschrijving` etc. Werkt zonder hydration. */}
      <section className="bg-sand-50 border-b border-sand-200 sticky top-0 z-20 backdrop-blur-sm bg-sand-50/95">
        <Container>
          <nav className="flex flex-wrap gap-2 py-3" aria-label="Secties op deze pagina">
            {hasBody && (
              <a
                href="#functieomschrijving"
                className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white px-4 py-1.5 text-sm font-medium text-ink hover:border-slate-mosque/40 hover:text-slate-mosque transition-colors"
              >
                <Briefcase className="w-3.5 h-3.5" />
                Functieomschrijving
              </a>
            )}
            {hasMeta && (
              <a
                href="#arbeidsvoorwaarden"
                className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-white px-4 py-1.5 text-sm font-medium text-ink hover:border-slate-mosque/40 hover:text-slate-mosque transition-colors"
              >
                <ListChecks className="w-3.5 h-3.5" />
                Arbeidsvoorwaarden
              </a>
            )}
            <a
              href="#solliciteren"
              className="inline-flex items-center gap-2 rounded-full bg-slate-mosque text-white px-4 py-1.5 text-sm font-medium hover:bg-slate-dark transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Solliciteren
            </a>
          </nav>
        </Container>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container narrow>
          {/* ─── 3. Functieomschrijving ──────────────────────── */}
          {hasBody && (
            <article id="functieomschrijving" className="scroll-mt-24 mb-12 lg:mb-16">
              <header className="mb-5 flex items-center gap-2.5">
                <Briefcase className="w-5 h-5 text-slate-mosque" />
                <h2 className="font-display text-2xl text-ink">
                  Functieomschrijving
                </h2>
              </header>
              <div
                className="rich-text max-w-none"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </article>
          )}

          {/* ─── 4. Arbeidsvoorwaarden ───────────────────────── */}
          {hasMeta && (
            <article id="arbeidsvoorwaarden" className="scroll-mt-24 mb-12 lg:mb-16">
              <header className="mb-5 flex items-center gap-2.5">
                <ListChecks className="w-5 h-5 text-slate-mosque" />
                <h2 className="font-display text-2xl text-ink">
                  Arbeidsvoorwaarden
                </h2>
              </header>
              <div className="grid gap-3 sm:grid-cols-2">
                {metaItems.map((m) => (
                  <MetaCard
                    key={m.label}
                    icon={m.icon}
                    label={m.label}
                    value={m.value}
                  />
                ))}
              </div>
            </article>
          )}

          {/* ─── 5. Solliciteren ─────────────────────────────── */}
          <article id="solliciteren" className="scroll-mt-24">
            <div className="rounded-2xl bg-slate-mosque text-white p-6 lg:p-10 text-center">
              <header className="mb-3 flex items-center justify-center gap-2.5">
                <Send className="w-5 h-5 text-sand/80" />
                <h2 className="font-display text-2xl">
                  Solliciteren
                </h2>
              </header>
              <p className="font-body text-sm md:text-base text-sand/85 mb-6 max-w-xl mx-auto">
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
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-mosque hover:bg-sand-50 transition-colors"
                  >
                    Solliciteer direct
                    <ExternalLink className="w-4 h-4" />
                  </a>
                ) : (
                  <a
                    href={ctaHref}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-slate-mosque hover:bg-sand-50 transition-colors"
                  >
                    Neem contact op
                  </a>
                )}

                {hasContactEmail && (
                  <a
                    href={`mailto:${vacancy.contact_email}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-sand/30 px-6 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {vacancy.contact_email}
                  </a>
                )}
              </div>
            </div>
          </article>
        </Container>
      </section>
    </>
  );
}
