// app/artikelen/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import Container         from "@/components/ui/Container";
import Button            from "@/components/ui/Button";
import { Icon }          from "@/lib/icons";
import {
  getArticleBySlug,
  getAllArticleSlugs,
  getAssetUrl,
  getSiteSettings,
  getEffectiveCategoryName,
} from "@/lib/directus";
import { formatDate }    from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export const dynamic       = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate    = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getAllArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [article, settings] = await Promise.all([
    getArticleBySlug(params.slug),
    getSiteSettings(),
  ]);
  if (!article) return { title: "Artikel niet gevonden" };

  // Defensief: alleen strings teruggeven aan Next.js Metadata.
  const title =
    (typeof article.seo_title === "string" && article.seo_title) ||
    (typeof article.title     === "string" && article.title)     ||
    "Artikel";
  const description =
    (typeof article.seo_description === "string" && article.seo_description) ||
    (typeof article.excerpt          === "string" && article.excerpt)          ||
    (typeof settings?.default_seo_description === "string" && settings.default_seo_description) ||
    undefined;

  return { title, description };
}

export default async function ArtikelDetailPage({ params }: Props) {
  const article = await getArticleBySlug(params.slug);
  if (!article) notFound();

  // ─── Defensieve velden-extractie ──────────────────────────────────
  // Een 500 op deze pagina is meestal een gevolg van een veld dat in
  // Directus een ander type heeft dan TS verwacht (bv. `tags` als integer
  // omdat een admin "2024" intypte, of `image` als object zonder id).
  // Daarom hieronder elke veldtoegang door een try/catch + type-guard.
  const imageId =
    typeof article.image === "string"
      ? article.image
      : (article.image && typeof article.image === "object" && "id" in article.image
          ? article.image.id
          : null);
  const imageUrl = imageId ? getAssetUrl(imageId) : "";

  // Tags veilig naar string[] — werkt of `tags` nu string is, null, of iets anders.
  const tags: string[] =
    typeof article.tags === "string" && article.tags.length > 0
      ? article.tags.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  // Categorie: prefereer category_ref.name; valt terug op de oude string.
  const categoryLabel = getEffectiveCategoryName(article);

  // Body: alleen renderen als het een string is. Geen objecten/null/numbers.
  const bodyHtml = typeof article.body === "string" ? article.body : "";

  return (
    <>
      <section className="relative bg-slate-mosque text-white py-16 overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        {imageUrl && (
          <div className="absolute inset-0 opacity-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={article.title} className="w-full h-full object-cover" />
          </div>
        )}
        <Container className="relative z-10">
          <Button
            href="/artikelen"
            variant="ghost"
            size="sm"
            className="text-sand/70 hover:text-white mb-6 -ml-1"
          >
            ← Terug naar artikelen
          </Button>
          <div className="max-w-2xl">
            {categoryLabel && (
              <span className="inline-block bg-taupe text-white text-xs font-body px-3 py-1 rounded-full mb-4">
                {categoryLabel}
              </span>
            )}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-4 leading-tight">
              {article.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-sand/80 text-sm font-body">
              {typeof article.author_name === "string" && article.author_name && (
                <span className="flex items-center gap-2">
                  <Icon name="user" className="w-4 h-4" />
                  {article.author_name}
                </span>
              )}
              {typeof article.published_at === "string" && article.published_at && (
                <span className="flex items-center gap-2">
                  <Icon name="calendar" className="w-4 h-4" />
                  {formatDate(article.published_at, "d MMMM yyyy")}
                </span>
              )}
            </div>
          </div>
        </Container>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
          </svg>
        </div>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container narrow>
          {imageUrl && (
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden mb-8 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          )}

          {typeof article.excerpt === "string" && article.excerpt && (
            <p className="font-body text-lg text-taupe-dark leading-relaxed mb-8 italic border-l-4 border-slate-mosque/30 pl-4">
              {article.excerpt}
            </p>
          )}

          {bodyHtml && (
            <div
              className="prose prose-lg max-w-none font-body text-ink leading-relaxed prose-headings:font-display prose-headings:text-ink prose-a:text-slate-mosque"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}

          {tags.length > 0 && (
            <div className="mt-10 pt-6 border-t border-sand-200 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="font-body text-xs px-3 py-1 rounded-full bg-white border border-sand-200 text-taupe-dark"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-sand-200">
            <Button href="/artikelen" variant="outline">
              ← Terug naar alle artikelen
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
