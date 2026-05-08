// app/videos/page.tsx

import type { Metadata } from "next";
import Link              from "next/link";
import Container         from "@/components/ui/Container";
import SectionTitle      from "@/components/ui/SectionTitle";
import {
  getVideos,
  getVideoCategories,
  getPageContent,
  getSiteSettings,
  getEffectiveVideoCategorySlug,
  getEffectiveVideoCategoryName,
} from "@/lib/directus";
import { buildYouTubeEmbedUrl, cn }  from "@/lib/utils";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;

const FALLBACK = {
  title:    "Video's",
  arabic:   "فيديوهات",
  subtitle: "Lezingen, opnames en momentopnames van onze activiteiten",
};

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("videos"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title || page?.title || FALLBACK.title,
    description:
      page?.seo_description ||
      settings?.default_seo_description ||
      "Video's van de DawahCommissie van moskee Al-Ghofraan.",
  };
}

interface VideosPageProps {
  searchParams?: { category?: string };
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
  const [all, page, categories] = await Promise.all([
    getVideos(),
    getPageContent("videos"),
    getVideoCategories(),
  ]);

  // Filter video's met ongeldige YouTube-URL eruit zodat we geen
  // kapotte iframes renderen.
  const valid = all
    .map((v) => ({ video: v, embedUrl: buildYouTubeEmbedUrl(v.youtube_url) }))
    .filter((entry) => entry.embedUrl !== null);

  // Bepaal welke categorieën daadwerkelijk video's hebben (anders verbergen).
  // Volgorde: gebruik de Directus-volgorde van `categories` (al gesorteerd op sort).
  const usedSlugs = new Set<string>();
  for (const { video } of valid) {
    const slug = getEffectiveVideoCategorySlug(video);
    if (slug) usedSlugs.add(slug);
  }
  const availableCategories = categories.filter((c) => usedSlugs.has(c.slug));

  // Active filter — slug match. Onbekend → alle videos.
  const requested = (searchParams?.category ?? "").trim().toLowerCase();
  const activeCategory =
    requested ? availableCategories.find((c) => c.slug.toLowerCase() === requested) ?? null : null;

  // Toon geselecteerde categorie of alle (in alle gevallen blijft de array
  // dezelfde shape: {video, embedUrl}).
  const visible = activeCategory
    ? valid.filter(({ video }) => getEffectiveVideoCategorySlug(video) === activeCategory.slug)
    : valid;

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title={page?.title || FALLBACK.title}
            arabic={page?.arabic_title || FALLBACK.arabic}
            subtitle={page?.subtitle || FALLBACK.subtitle}
            light
          />
        </Container>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
          </svg>
        </div>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          {/* Categorie-filter — alleen tonen als er meer dan één relevante categorie is */}
          {availableCategories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              <FilterPill href="/videos" active={activeCategory === null}>
                Alle
              </FilterPill>
              {availableCategories.map((cat) => (
                <FilterPill
                  key={cat.slug}
                  href={`/videos?category=${encodeURIComponent(cat.slug)}`}
                  active={activeCategory?.slug === cat.slug}
                >
                  {cat.name}
                </FilterPill>
              ))}
            </div>
          )}

          {visible.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="font-display text-2xl text-ink mb-2">
                {activeCategory ? "Geen video's in deze categorie" : "Nog geen video's"}
              </h3>
              <p className="font-body text-taupe-dark">
                {activeCategory
                  ? "Probeer een andere categorie of bekijk alle video's."
                  : "Er zijn momenteel geen video's beschikbaar."}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile: horizontale scroll-snap. Desktop: gewone grid. */}
              {/* sm:hidden = mobile only; sm:grid = vanaf small. */}
              <div
                className={cn(
                  "sm:hidden",
                  "flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-4 px-4",
                  // Verbergen scrollbar zonder dat scrollen breekt:
                  "scrollbar-thin",
                )}
                role="region"
                aria-label="Video's, veeg horizontaal om door te bladeren"
              >
                {visible.map(({ video, embedUrl }) => (
                  <article
                    key={video.id}
                    className="snap-start shrink-0 w-[85%] flex flex-col bg-white rounded-2xl overflow-hidden border border-sand-200 shadow-sm"
                  >
                    <VideoCard video={video} embedUrl={embedUrl!} />
                  </article>
                ))}
              </div>

              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map(({ video, embedUrl }) => (
                  <article
                    key={video.id}
                    className="flex flex-col bg-white rounded-2xl overflow-hidden border border-sand-200 shadow-sm"
                  >
                    <VideoCard video={video} embedUrl={embedUrl!} />
                  </article>
                ))}
              </div>

              {/* Mobile hint — subtiel */}
              <p className="font-body text-xs text-taupe text-center mt-2 sm:hidden">
                Veeg horizontaal voor meer video's.
              </p>
            </>
          )}
        </Container>
      </section>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function FilterPill({
  href,
  active,
  children,
}: {
  href:     string;
  active:   boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-body border transition-colors",
        active
          ? "bg-slate-mosque text-white border-slate-mosque"
          : "bg-white text-taupe-dark border-sand-200 hover:border-slate-mosque hover:text-slate-mosque",
      )}
    >
      {children}
    </Link>
  );
}

function VideoCard({
  video,
  embedUrl,
}: {
  video:    Awaited<ReturnType<typeof getVideos>>[number];
  embedUrl: string;
}) {
  const catName = getEffectiveVideoCategoryName(video);
  return (
    <>
      <div className="relative aspect-video bg-ink">
        <iframe
          src={embedUrl}
          title={video.title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 w-full h-full"
        />
      </div>

      <div className="flex flex-col flex-1 p-5">
        {catName && (
          <span className="font-body text-xs uppercase tracking-wider text-taupe mb-1">
            {catName}
          </span>
        )}
        <h3 className="font-display text-xl text-ink">
          {video.title}
        </h3>
        {video.description && (
          <p className="font-body text-taupe-dark text-sm leading-relaxed mt-2 flex-1 line-clamp-3">
            {video.description}
          </p>
        )}
        {video.featured && (
          <span className="mt-3 self-start bg-taupe text-white text-xs font-body font-medium px-3 py-1 rounded-full">
            ★ Uitgelicht
          </span>
        )}
      </div>
    </>
  );
}
