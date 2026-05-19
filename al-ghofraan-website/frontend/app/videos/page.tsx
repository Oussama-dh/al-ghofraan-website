// app/videos/page.tsx

import type { Metadata } from "next";
import Link              from "next/link";
import Container         from "@/components/ui/Container";
import PageHero          from "@/components/sections/PageHero";
import {
  getVideos,
  getVideoCategories,
  getPageContent,
  getSiteSettings,
  getEffectiveVideoCategorySlug,
  getEffectiveVideoCategoryName,
} from "@/lib/directus";
import { cn, extractYouTubeId }  from "@/lib/utils";
import { buildYouTubeThumbnailUrl, buildYouTubeWatchUrl } from "@/lib/youtube";

export const dynamic = "force-dynamic";

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

  // Delivery youtube-import — overzichts-cards tonen thumbnails ipv
  // iframes. We resolven per video:
  //   - videoId  via youtube_video_id (import-script vult dat) of
  //              extractYouTubeId(youtube_url) (handmatig aangemaakte rijen)
  //   - thumb    via thumbnail_url (geseed of geïmporteerd) of
  //              afgeleid van videoId (i.ytimg.com)
  //   - watchUrl youtube_url uit DB, of canonical via buildYouTubeWatchUrl
  // Video's zonder bruikbaar ID worden gefilterd (kapotte data → niet renderen).
  const valid = all
    .map((v) => {
      const videoId  = v.youtube_video_id || extractYouTubeId(v.youtube_url);
      if (!videoId) return null;
      const thumb    = v.thumbnail_url || buildYouTubeThumbnailUrl(videoId);
      const watchUrl = v.youtube_url || buildYouTubeWatchUrl(videoId) || "#";
      return { video: v, videoId, thumb, watchUrl };
    })
    .filter((entry): entry is { video: typeof all[number]; videoId: string; thumb: string | null; watchUrl: string } => entry !== null);

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
  // dezelfde shape: {video, videoId, thumb, watchUrl}).
  const visible = activeCategory
    ? valid.filter(({ video }) => getEffectiveVideoCategorySlug(video) === activeCategory.slug)
    : valid;

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
                {visible.map(({ video, thumb, watchUrl }) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    thumb={thumb}
                    watchUrl={watchUrl}
                    className="snap-start shrink-0 w-[85%]"
                  />
                ))}
              </div>

              <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {visible.map(({ video, thumb, watchUrl }) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    thumb={thumb}
                    watchUrl={watchUrl}
                  />
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
  thumb,
  watchUrl,
  className,
}: {
  video:    Awaited<ReturnType<typeof getVideos>>[number];
  thumb:    string | null;
  watchUrl: string;
  className?: string;
}) {
  const catName = getEffectiveVideoCategoryName(video);
  return (
    // Hele card is een externe link naar YouTube. target=_blank +
    // rel=noopener voorkomt window.opener-toegang. Geen iframe op
    // overzichtspagina — gebruiker krijgt thumbnail, klikt naar YouTube.
    <a
      href={watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex flex-col bg-white rounded-2xl overflow-hidden border border-sand-200 shadow-sm hover:shadow-md transition-shadow",
        className,
      )}
    >
      <div className="relative aspect-video bg-ink overflow-hidden">
        {thumb ? (
          // YouTube thumbnails komen van i.ytimg.com — extern.
          // Bewust <img> ipv next/image (loadt zonder Next image-proxy).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt={video.title}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sand text-4xl">
            ▶
          </div>
        )}
        {/* Play-overlay — subtiele rode YouTube-stijl knop */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
          <span
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110"
            aria-hidden="true"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 text-white ml-1" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-5">
        {catName && (
          <span className="font-body text-xs uppercase tracking-wider text-taupe mb-1">
            {catName}
          </span>
        )}
        <h3 className="font-display text-xl text-ink group-hover:text-slate-mosque transition-colors">
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
    </a>
  );
}
