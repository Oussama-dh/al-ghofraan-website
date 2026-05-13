// app/artikelen/page.tsx

import type { Metadata } from "next";
import Link              from "next/link";
import Container         from "@/components/ui/Container";
import PageHero          from "@/components/sections/PageHero";
import { Icon }          from "@/lib/icons";
import {
  getArticles,
  getPageContent,
  getSiteSettings,
  getAssetUrl,
  getEffectiveCategoryName,
  getEffectiveCategorySlug,
} from "@/lib/directus";
import { formatDate, cn } from "@/lib/utils";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;

const FALLBACK = {
  title:    "Artikelen",
  arabic:   "مقالات",
  subtitle: "Nieuws, lezingen en reflecties van de DawahCommissie",
};

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("artikelen"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title || page?.title || FALLBACK.title,
    description:
      page?.seo_description ||
      settings?.default_seo_description ||
      "Artikelen, nieuws en reflecties van de DawahCommissie.",
  };
}

interface ArtikelenPageProps {
  searchParams?: { category?: string };
}

export default async function ArtikelenPage({ searchParams }: ArtikelenPageProps) {
  const [articles, page] = await Promise.all([
    getArticles(),
    getPageContent("artikelen"),
  ]);

  // Bouw categorie-lijst dynamisch uit aanwezige published artikelen.
  // We gebruiken de "effectieve" naam: liever category_ref.name (gestructureerd
  // via Directus collectie), anders fallback op de oude `category`-string.
  // Categorie zonder gepubliceerd artikel verschijnt automatisch niet in het filter.
  //
  // Map: slug → name. Slug wordt gebruikt in de URL (?category=foo); name in UI.
  const categoryMap = new Map<string, string>();
  for (const a of articles) {
    const name = getEffectiveCategoryName(a);
    const slug = getEffectiveCategorySlug(a);
    if (name && slug && !categoryMap.has(slug)) {
      categoryMap.set(slug, name);
    }
  }
  const categories = Array.from(categoryMap.entries())
    .map(([slug, name]) => ({ slug, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "nl"));

  // Active filter — case-insensitive slug-match. Onbekende slug → alle artikelen.
  const requested = (searchParams?.category ?? "").trim().toLowerCase();
  const activeCategory =
    requested ? categories.find((c) => c.slug.toLowerCase() === requested) ?? null : null;

  const visible = activeCategory
    ? articles.filter((a) => getEffectiveCategorySlug(a) === activeCategory.slug)
    : articles;

  return (
    <>
      <PageHero
        title={page?.title || FALLBACK.title}
        arabic={page?.arabic_title || FALLBACK.arabic}
        subtitle={page?.subtitle || FALLBACK.subtitle}
        backgroundImage={page?.hero_background_image}
      />

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          {/* Categorie-filter — alleen tonen als er categorieën zijn */}
          {categories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <FilterPill href="/artikelen" active={activeCategory === null}>
                Alle
              </FilterPill>
              {categories.map((cat) => (
                <FilterPill
                  key={cat.slug}
                  href={`/artikelen?category=${encodeURIComponent(cat.slug)}`}
                  active={activeCategory?.slug === cat.slug}
                >
                  {cat.name}
                </FilterPill>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">📰</div>
              <h3 className="font-display text-2xl text-ink mb-2">Nog geen artikelen</h3>
              <p className="font-body text-taupe-dark">
                Er zijn momenteel geen artikelen beschikbaar.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((article) => {
                const imageId  = typeof article.image === "string" ? article.image : article.image?.id;
                const imageUrl = imageId ? getAssetUrl(imageId) : null;
                const tags     = article.tags
                  ? article.tags.split(",").map((t) => t.trim()).filter(Boolean)
                  : [];

                return (
                  <Link
                    key={article.id}
                    href={`/artikelen/${article.slug}`}
                    className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-sand-200 hover:border-taupe/50 shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    <div className="relative h-48 bg-sand overflow-hidden">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={article.title}
                          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 pattern-overlay flex items-center justify-center">
                          <Icon name="book-open" className="w-12 h-12 text-taupe/40" strokeWidth={1.5} />
                        </div>
                      )}
                      {article.featured && (
                        <span className="absolute top-3 right-3 bg-taupe text-white text-xs font-body font-medium px-3 py-1 rounded-full shadow-sm">
                          ★ Uitgelicht
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col flex-1 p-5">
                      {(() => {
                        const catName = getEffectiveCategoryName(article);
                        return catName ? (
                          <span className="font-body text-xs uppercase tracking-wider text-taupe mb-1">
                            {catName}
                          </span>
                        ) : null;
                      })()}
                      <h3 className="font-display text-xl text-ink group-hover:text-slate-mosque transition-colors">
                        {article.title}
                      </h3>

                      {article.excerpt && (
                        <p className="font-body text-taupe-dark text-sm leading-relaxed mt-2 flex-1 line-clamp-3">
                          {article.excerpt}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-taupe text-sm font-body">
                        {article.author_name && (
                          <span className="flex items-center gap-1.5">
                            <Icon name="user" className="w-4 h-4" />
                            {article.author_name}
                          </span>
                        )}
                        {article.published_at && (
                          <span className="flex items-center gap-1.5">
                            <Icon name="calendar" className="w-4 h-4" />
                            {formatDate(article.published_at, "d MMM yyyy")}
                          </span>
                        )}
                      </div>

                      {tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="font-body text-xs px-2 py-0.5 rounded-full bg-sand-100 text-taupe-dark">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-4 flex items-center text-slate-mosque text-sm font-medium font-body">
                        <span>Lees verder</span>
                        <Icon name="arrow-right" className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-body text-sm px-4 py-1.5 rounded-full border transition-colors",
        active
          ? "bg-slate-mosque text-white border-slate-mosque"
          : "bg-white text-taupe-dark border-sand-200 hover:border-taupe/50"
      )}
    >
      {children}
    </Link>
  );
}
