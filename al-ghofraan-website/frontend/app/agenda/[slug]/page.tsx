// app/agenda/[slug]/page.tsx

import type { Metadata }  from "next";
import { notFound }       from "next/navigation";
import Container          from "@/components/ui/Container";
import Button             from "@/components/ui/Button";
import { Icon }           from "@/lib/icons";
import { User }           from "lucide-react";
import RegistrationForm   from "@/components/registration/RegistrationForm";
import AddToCalendarButton from "@/components/activity/AddToCalendarButton";
import TrackOnMount       from "@/components/analytics/TrackOnMount";
import {
  getActivityBySlug,
  getActivityRegistrationCount,
  getAssetUrl,
  getIconSettings,
  resolveIconKey,
  ICON_KEYS,
} from "@/lib/directus";
import { formatDate, getSiteUrl } from "@/lib/utils";
import { buildGoogleCalendarUrlForActivity } from "@/lib/activityCalendar";
import {
  isRecurringActivity,
  generateActivityOccurrences,
  describeRecurrence,
} from "@/lib/recurrence";
import ActivityOccurrenceSection from "@/components/activity/ActivityOccurrenceSection";
import { isRegistrationClosed, resolveRegistrationClose } from "@/lib/server/registrationClose";

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

  // Delivery 58 — automatische sluiting van inschrijving.
  // Voor recurring zonder expliciet veld is dit altijd false.
  // Voor eenmalige activiteiten: fallback naar start_date.
  // Bij `isFull` wint die melding boven `isClosed` (vol = definitief).
  const isClosed = isRegistrationClosed(activity);
  const closeContext = resolveRegistrationClose(activity);

  // Subtekst onder "Inschrijving is gesloten" — uitleg waarom.
  // Voor `fallback_start_date` is "activiteit is begonnen of voorbij"
  // duidelijker dan een datumtijd; bezoeker weet zelf dat de activiteit
  // al begonnen is.
  const closedSubMessage: string =
    closeContext.source === "fallback_start_date"
      ? "Deze activiteit is al begonnen of voorbij."
      : "Inschrijven voor deze activiteit is gesloten.";

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

  // ─── Delivery recurring — occurrences voor terugkerende activiteiten ──
  //
  // Voor terugkerende activiteiten genereren we hier server-side de
  // toekomstige occurrences en geven die door aan een client-component
  // die occurrence-keuze + agenda-export + inschrijfformulier afhandelt.
  //
  // Capaciteit-check voor recurring: maxRegistrations geldt PER OCCURRENCE.
  // De UI toont voor recurring GEEN "Nog X plekken"-label (zou een fetch
  // per occurrence vereisen). De server-side check in /api/inschrijven
  // valideert wel de capaciteit voor de gekozen occurrence bij submit.
  const recurring        = isRecurringActivity(activity);
  const occurrences      = recurring
    ? generateActivityOccurrences(activity, { from: new Date() })
    : [];
  const recurrenceLabel  = recurring ? describeRecurrence(activity) : "";
  // Delivery recurring-ux — picker is alleen relevant voor recurring.
  // Default behavior is "verbergen" (picker = false) zodat bestaande
  // activiteiten geen visuele wijziging tonen na deploy.
  const showOccurrencePicker = recurring && activity.show_occurrence_picker === true;
  // Eerstvolgende occurrence — gebruikt door beide recurring-takken:
  //   showPicker=true  → als default-selectie in de picker
  //   showPicker=false → de occurrence die de pagina presenteert + die
  //                       de server uiteindelijk vastpint bij inschrijving
  const firstOccurrence  = recurring && occurrences.length > 0 ? occurrences[0] : null;

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
      {/* GA4 event — activity_view bij elke load van de activity-detail.
          Privacy: alleen activity_slug, geen titel of beschrijving. */}
      <TrackOnMount event="activity_view" params={{ activity_slug: activity.slug }} />
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
                {recurring && occurrences.length > 0
                  ? `Eerstvolgend: ${occurrences[0].label}`
                  : formatDate(activity.start_date, "EEEE d MMMM yyyy")}
              </span>
              {!recurring && activity.end_date && (
                <span className="flex items-center gap-2">
                  t/m {formatDate(activity.end_date, "d MMMM yyyy")}
                </span>
              )}
              {recurring && recurrenceLabel && (
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 text-white px-2.5 py-0.5 text-xs font-medium border border-white/20">
                  {recurrenceLabel}
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
            <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] max-h-[70vh] mb-8">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={activity.title} className="absolute inset-0 w-full h-full object-contain" />
            </div>
          )}

          <div
            className="rich-text max-w-none"
            dangerouslySetInnerHTML={{ __html: activity.description || "" }}
          />

          {recurring && showOccurrencePicker ? (
            // ── Delivery recurring — terugkerende flow MET picker ─
            //
            // Eén client-component handelt occurrence-keuze, dynamische
            // agenda-knop en inschrijfformulier af. We berekenen
            // `showForm` server-side (registration_enabled + niet vol op
            // hoofdrecord-niveau). Per-occurrence capaciteit wordt
            // server-side gecontroleerd bij submit.
            <div className="mt-6">
              <ActivityOccurrenceSection
                activity={{
                  title:       activity.title,
                  slug:        activity.slug,
                  description: activity.description,
                  location:    activity.location,
                }}
                occurrences={occurrences}
                showForm={Boolean(activity.registration_enabled) && !isClosed}
                formProps={{
                  sourceSlug:   activity.slug,
                  sourceTitle:  activity.title,
                  targetGender: (activity.target_gender ?? null) as string | null,
                  requireAge:   ageRequiredForForm,
                  contentTexts: {
                    intro_title:     activity.registration_intro_title,
                    intro_text:      activity.registration_intro_text,
                    button_text:     activity.registration_button_text,
                    success_message: activity.registration_success_message,
                    extra_note:      activity.registration_extra_note,
                  },
                }}
              />
              {/* Delivery 58 — als de beheerder expliciet
                  `registration_closes_at` heeft gezet voor recurring en
                  dat moment is bereikt, toon een gesloten-melding. */}
              {activity.registration_enabled && isClosed && (
                <div
                  role="status"
                  className="mt-6 rounded-2xl border border-sand-200 bg-white p-6 lg:p-8 text-center"
                >
                  <h2 className="font-display text-xl text-ink mb-2">
                    Inschrijving is gesloten
                  </h2>
                  <p className="font-body text-sm text-taupe-dark max-w-md mx-auto">
                    {closedSubMessage}
                  </p>
                </div>
              )}
            </div>
          ) : recurring && !showOccurrencePicker ? (
            // ── Delivery recurring-ux — terugkerende flow ZONDER picker ─
            //
            // Bezoeker ziet geen "Kies een datum"-blok. De eerstvolgende
            // occurrence wordt voor agenda-export en inschrijving gebruikt.
            // Server pickt ook server-side de eerstvolgende bij submit
            // (bron-van-waarheid; client-payload heeft geen occurrence).
            //
            // Edge case: geen toekomstige occurrences meer (serie afgelopen)
            // → toon een nette melding ipv vol/leeg formulier. Inschrijving
            // wordt onmogelijk gemaakt door agendaknop weg te laten.
            !firstOccurrence ? (
              <div className="mt-6 rounded-2xl border border-sand-200 bg-white p-6 lg:p-8 text-center">
                <h2 className="font-display text-xl text-ink mb-2">
                  Geen aankomende data gepland
                </h2>
                <p className="font-body text-sm text-taupe-dark max-w-md mx-auto">
                  De serie van deze terugkerende activiteit is afgelopen of er
                  zijn nog geen toekomstige momenten ingepland.
                </p>
              </div>
            ) : (
              <>
                {/* Agenda-toevoegen knop — voor de eerstvolgende occurrence.
                    icsHref met query params; Google URL via synthetische
                    activity-shape met occurrence-datums. */}
                <div className="mt-6">
                  <AddToCalendarButton
                    slug={activity.slug}
                    googleCalendarUrl={buildGoogleCalendarUrlForActivity({
                      title:       activity.title,
                      start_date:  firstOccurrence.start,
                      end_date:    firstOccurrence.end,
                      location:    activity.location,
                      description: activity.description,
                    })}
                    icsHref={
                      `/api/agenda/${encodeURIComponent(activity.slug)}/ics` +
                      `?start=${encodeURIComponent(firstOccurrence.start)}` +
                      `&end=${encodeURIComponent(firstOccurrence.end)}`
                    }
                  />
                </div>

                {activity.registration_enabled && (
                  <div className="mt-10">
                    {isFull ? (
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
                    ) : isClosed ? (
                      // Delivery 58 — registration_closes_at of fallback bereikt
                      <div
                        role="status"
                        className="rounded-2xl border border-sand-200 bg-white p-6 lg:p-8 text-center"
                      >
                        <h2 className="font-display text-xl text-ink mb-2">
                          Inschrijving is gesloten
                        </h2>
                        <p className="font-body text-sm text-taupe-dark max-w-md mx-auto">
                          {closedSubMessage}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Informatieve banner — maakt zichtbaar voor welke
                            datum de inschrijving geldt, ook al ziet bezoeker
                            geen keuzeblok. */}
                        <div className="mb-4 rounded-xl bg-slate-mosque/5 border border-slate-mosque/20 p-3 text-sm text-slate-mosque font-body">
                          Uw inschrijving geldt voor de eerstvolgende datum:{" "}
                          <strong>{firstOccurrence.label}</strong>.
                        </div>

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
                          /* Geen occurrence prop — server pickt de eerstvolgende
                             bij submit. Client kan geen datum spoofen. */
                        />
                      </>
                    )}
                  </div>
                )}
              </>
            )
          ) : (
            <>
              {/* Agenda-toevoegen knop — boven het inschrijfformulier zodat
                  bezoekers ook zonder inschrijving de datum kunnen wegzetten. */}
              <div className="mt-6">
                <AddToCalendarButton
                  slug={activity.slug}
                  googleCalendarUrl={buildGoogleCalendarUrlForActivity(activity)}
                />
              </div>

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
                  ) : isClosed ? (
                    // Delivery 58 — registration_closes_at of fallback bereikt
                    <div
                      role="status"
                      className="rounded-2xl border border-sand-200 bg-white p-6 lg:p-8 text-center"
                    >
                      <h2 className="font-display text-xl text-ink mb-2">
                        Inschrijving is gesloten
                      </h2>
                      <p className="font-body text-sm text-taupe-dark max-w-md mx-auto">
                        {closedSubMessage}
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
            </>
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
