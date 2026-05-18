// app/agenda/[slug]/page.tsx

import type { Metadata }  from "next";
import { notFound }       from "next/navigation";
import Container          from "@/components/ui/Container";
import Button             from "@/components/ui/Button";
import { Icon }           from "@/lib/icons";
import { User }           from "lucide-react";
import RegistrationForm   from "@/components/registration/RegistrationForm";
import {
  getActivityBySlug,
  getActivityRegistrationCount,
  getAssetUrl,
  getIconSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import { formatDate, getSiteUrl } from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const activity = await getActivityBySlug(params.slug);
  if (!activity) return { title: "Activiteit niet gevonden" };

  const description = activity.description?.replace(/<[^>]+>/g, "").slice(0, 160);
  // Activity-image als og:image. getAssetUrl retourneert "" als veld
  // leeg is — in dat geval valt og:image terug op de site-brede
  // default uit site_settings.og_image (root layout).
  const imageUrl = getAssetUrl(activity.image as never);

  return {
    title:       activity.title,
    description,
    ...(imageUrl && {
      openGraph: {
        images: [{ url: imageUrl }],
      },
    }),
  };
}

export default async function ActivityDetailPage({ params }: Props) {
  const [activity, iconMap] = await Promise.all([
    getActivityBySlug(params.slug),
    getIconSettings(),
  ]);

  if (!activity) notFound();

  const dateIcon     = resolveIconKey(iconMap, ICON_KEYS.activityDate);
  const locationIcon = resolveIconKey(iconMap, ICON_KEYS.activityLocation);

  const imageUrl = getAssetUrl(activity.image as never);

  // ─── Delivery 19 — Capaciteit-check ──────────────────────────────
  // Bepaalt of het inschrijfformulier getoond mag worden en welke
  // boodschap er eventueel boven staat.
  //
  //   maxRegistrations: integer of null. Null = onbeperkt.
  //   currentCount    : null als de count-call faalt of geen token; in
  //                     dat geval fail-open op de UI (formulier wel tonen)
  //                     en laat de server-side check in route.ts beslissen.
  //   isFull          : true wanneer count gelukt is en >= max.
  //   showLimit       : alleen relevant wanneer max gevuld is.
  //
  // Geen telling (en geen extra Directus-call) wanneer max niet is gezet.
  const maxRegistrations =
    typeof activity.max_registrations === "number" && activity.max_registrations > 0
      ? activity.max_registrations
      : null;
  const showLimit = activity.show_registration_limit === true;

  const currentCount: number | null = maxRegistrations !== null
    ? await getActivityRegistrationCount(activity.id)
    : null;

  const isFull =
    maxRegistrations !== null &&
    currentCount !== null &&
    currentCount >= maxRegistrations;

  // "Nog X plekken beschikbaar" — alleen wanneer admin het tonen aanzet,
  // max gevuld is, count gelukt is en er nog plek over is.
  const spotsLeftLabel: string | null =
    showLimit && maxRegistrations !== null && currentCount !== null && !isFull
      ? `Nog ${Math.max(0, maxRegistrations - currentCount)} plekken beschikbaar`
      : null;

  // ─── Delivery 20 — Minimumleeftijd + docent ──────────────────────
  // minimum_age wordt zichtbaar als pill bij het formulier wanneer gevuld
  // (positief getal). Documenteert ook waarom leeftijd verplicht is in
  // het formulier zelf.
  const minimumAge =
    typeof activity.minimum_age === "number" && activity.minimum_age > 0
      ? activity.minimum_age
      : null;
  const minimumAgeLabel: string | null =
    minimumAge !== null ? `Minimumleeftijd: ${minimumAge} jaar` : null;

  // Docent: alleen tonen wanneer admin de toggle aanzet ÉN het veld is
  // gevuld. Lege string of whitespace → niet tonen.
  const teacherName =
    activity.show_teacher === true &&
    typeof activity.teacher === "string" &&
    activity.teacher.trim().length > 0
      ? activity.teacher.trim()
      : null;

  // RegistrationForm-prop: leeftijd verplicht wanneer require_age aanstaat
  // OF er een minimumleeftijd is. Zonder leeftijd kan de minimum-check
  // niet uitgevoerd worden; daarom wordt aanwezigheid daar al afgedwongen.
  const ageRequiredForForm =
    activity.require_age === true || minimumAge !== null;

  // ─── JSON-LD Event schema (delivery 26) ──────────────────────────
  // Voor Google's Rich Results en zoekresultaat-cards. Alleen renderen
  // als de verplichte velden (name, start_date) aanwezig zijn — bij
  // ontbreken liever géén schema dan een invalide schema.
  //
  // location.name is bewust een fallback naar "Moskee El Mouahidin"
  // wanneer activity.location leeg is — schema.org Event vereist
  // location. Voor concretere data (street/city) zou de Activity in
  // Directus zelf gestructureerd moeten zijn; daar is dit veld nu
  // een vrije string voor.
  const jsonLd =
    activity.title && activity.start_date
      ? {
          "@context":  "https://schema.org",
          "@type":     "Event",
          name:        activity.title,
          ...(activity.description && {
            description: activity.description
              .replace(/<[^>]+>/g, "")
              .slice(0, 500)
              .trim(),
          }),
          startDate: activity.start_date,
          ...(activity.end_date && { endDate: activity.end_date }),
          eventStatus:         "https://schema.org/EventScheduled",
          eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
          location: {
            "@type": "Place",
            name:    activity.location?.trim() || "Moskee El Mouahidin",
          },
          ...(imageUrl && { image: [imageUrl] }),
          url: `${getSiteUrl()}/agenda/${activity.slug}`,
          organizer: {
            "@type": "Organization",
            name:    "Al-Ghofraan — da'wahcommissie van Moskee El Mouahidin",
            url:     getSiteUrl(),
          },
        }
      : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // JSON.stringify produceert geen </script> sequences, dus
          // veilig om direct in script-content te zetten. We escapen
          // toch < voor uiterste zekerheid (defense in depth).
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <section className="relative bg-slate-mosque text-white py-16 overflow-hidden">
        {imageUrl && (
          <div className="absolute inset-0 opacity-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={activity.title} className="w-full h-full object-cover" />
          </div>
        )}
        <Container className="relative z-10">
          <Button href="/agenda" variant="ghost" size="sm"
            className="text-sand/70 hover:text-white mb-6 -ml-1">
            ← Terug naar agenda
          </Button>
          <div className="max-w-2xl">
            {activity.featured && (
              <span className="inline-block bg-taupe text-white text-xs font-body px-3 py-1 rounded-full mb-4">
                Uitgelicht
              </span>
            )}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-4 leading-tight">
              {activity.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-sand/80 text-sm font-body">
              <span className="flex items-center gap-2">
                <Icon name={dateIcon} className="w-4 h-4" />
                {formatDate(activity.start_date, "EEEE d MMMM yyyy")}
              </span>
              {activity.end_date && (
                <span className="flex items-center gap-2">
                  t/m {formatDate(activity.end_date, "d MMMM yyyy")}
                </span>
              )}
              {activity.location && (
                <span className="flex items-center gap-2">
                  <Icon name={locationIcon} className="w-4 h-4" />
                  {activity.location}
                </span>
              )}
              {/* Delivery 20 — Docent. Alleen tonen wanneer show_teacher=true
                  en teacher gevuld. Lucide User-icoon direct (geen Icon-
                  abstractie nodig — die is voor admin-instelbare iconen
                  en docent heeft die instelbaarheid niet). */}
              {teacherName && (
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {teacherName}
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
            // Flyer-presentatie: object-contain + aspect-ratio met max-h zorgt dat
            // verticale flyers/posters volledig zichtbaar blijven zonder de pagina
            // op te blazen op grote schermen (delivery 12).
            <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] max-h-[70vh] rounded-2xl overflow-hidden mb-8 shadow-md bg-sand-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={activity.title} className="absolute inset-0 w-full h-full object-contain" />
            </div>
          )}

          <div
            className="rich-text max-w-none"
            dangerouslySetInnerHTML={{ __html: activity.description || "" }}
          />

          {activity.registration_enabled && (
            <div className="mt-10">
              {isFull ? (
                // ── Vol-melding (geen formulier) ────────────────────
                <div
                  role="status"
                  className="rounded-2xl border border-sand-200 bg-white p-6 lg:p-8 text-center"
                >
                  <h2 className="font-display text-xl text-ink mb-2">
                    Deze activiteit zit vol
                  </h2>
                  <p className="font-body text-sm text-taupe-dark max-w-md mx-auto">
                    Inschrijven is niet meer mogelijk. Houd onze website in
                    de gaten voor nieuwe activiteiten.
                  </p>
                </div>
              ) : (
                <>
                  {/* Pills boven het formulier — meerdere mogelijk, naast
                      elkaar (capaciteit + minimumleeftijd). */}
                  {(spotsLeftLabel || minimumAgeLabel) && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {spotsLeftLabel && (
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-mosque/10 text-slate-mosque px-3 py-1 text-xs font-medium">
                          <span aria-hidden>●</span>
                          {spotsLeftLabel}
                        </div>
                      )}
                      {minimumAgeLabel && (
                        <div className="inline-flex items-center gap-2 rounded-full bg-taupe/15 text-taupe-dark px-3 py-1 text-xs font-medium">
                          <span aria-hidden>●</span>
                          {minimumAgeLabel}
                        </div>
                      )}
                    </div>
                  )}
                  <RegistrationForm
                    type="activity"
                    sourceSlug={activity.slug}
                    sourceTitle={activity.title}
                    targetGender={activity.target_gender ?? null}
                    requireAge={ageRequiredForForm}
                    contentTexts={{
                      intro_title:     activity.registration_intro_title,
                      intro_text:      activity.registration_intro_text,
                      button_text:     activity.registration_button_text,
                      success_message: activity.registration_success_message,
                      extra_note:      activity.registration_extra_note,
                    }}
                  />
                </>
              )}
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-sand-200">
            <Button href="/agenda" variant="outline">
              ← Terug naar alle activiteiten
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
