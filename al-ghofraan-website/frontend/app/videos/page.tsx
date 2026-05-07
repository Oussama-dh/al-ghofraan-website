// app/videos/page.tsx

import type { Metadata } from "next";
import Container         from "@/components/ui/Container";
import SectionTitle      from "@/components/ui/SectionTitle";
import { getVideos, getSiteSettings } from "@/lib/directus";
import { buildYouTubeEmbedUrl }       from "@/lib/utils";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title:       "Video's",
    description:
      settings?.default_seo_description ||
      "Video's van de DawahCommissie van moskee Al-Ghofraan.",
  };
}

export default async function VideosPage() {
  const all = await getVideos();

  // Filter video's met ongeldige YouTube-URL eruit zodat we geen
  // kapotte iframes renderen.
  const videos = all
    .map((v) => ({ video: v, embedUrl: buildYouTubeEmbedUrl(v.youtube_url) }))
    .filter((entry) => entry.embedUrl !== null);

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title="Video's"
            arabic="فيديوهات"
            subtitle="Lezingen, opnames en momentopnames van onze activiteiten"
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
          {videos.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="font-display text-2xl text-ink mb-2">Nog geen video's</h3>
              <p className="font-body text-taupe-dark">
                Er zijn momenteel geen video's beschikbaar.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map(({ video, embedUrl }) => (
                <article
                  key={video.id}
                  className="flex flex-col bg-white rounded-2xl overflow-hidden border border-sand-200 shadow-sm"
                >
                  <div className="relative aspect-video bg-ink">
                    <iframe
                      src={embedUrl!}
                      title={video.title}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>

                  <div className="flex flex-col flex-1 p-5">
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
                </article>
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
