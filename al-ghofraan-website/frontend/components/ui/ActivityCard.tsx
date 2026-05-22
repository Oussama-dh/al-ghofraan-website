// components/ui/ActivityCard.tsx

import { ArrowRight, Star } from "lucide-react";
import type { Activity } from "@/types/directus";
import { formatDate, formatDateShort, cn } from "@/lib/utils";
import { getAssetUrl } from "@/lib/directus";
import { Icon } from "@/lib/icons";
import TrackedLink from "@/components/analytics/TrackedLink";

interface ActivityCardProps {
  activity:   Activity;
  featured?:  boolean;
  className?: string;
  /** Iconen uit icon_settings — keys: activity_date_icon / activity_location_icon */
  dateIcon?:     string;
  locationIcon?: string;
  /**
   * Delivery recurring — toon een occurrence-datum ipv `activity.start_date`.
   * Wordt gebruikt op de agenda-overzichtspagina waar één terugkerende
   * activiteit als meerdere kaarten verschijnt (één per toekomstige
   * occurrence). Format: ISO timestamp.
   *
   * Default (undefined): gebruik `activity.start_date` (huidig gedrag).
   */
  overrideStart?: string;
  /**
   * Delivery recurring — toon een badge ("Wekelijks", "Maandelijks", ...).
   * Default (leeg/undefined): geen badge.
   */
  recurrenceLabel?: string;
}

export default function ActivityCard({
  activity,
  featured  = false,
  className,
  dateIcon     = "calendar",
  locationIcon = "map-pin",
  overrideStart,
  recurrenceLabel,
}: ActivityCardProps) {
const imageId =
  typeof activity.image === "string" ? activity.image : activity.image?.id;

const imageUrl = imageId ? getAssetUrl(imageId) : null;
  const displayStart = overrideStart || activity.start_date;
  const startDate = formatDate(displayStart, "d MMMM yyyy");
  const dayNum    = formatDate(displayStart, "d");
  const monthAbbr = formatDate(displayStart, "MMM");

  return (
    <TrackedLink
      href={`/agenda/${activity.slug}`}
      event="agenda_click"
      params={{ activity_slug: activity.slug, source: "activity_card" }}
      className={cn(
        "group flex flex-col bg-white rounded-2xl overflow-hidden",
        "border border-sand-200 hover:border-taupe/50",
        "shadow-sm hover:shadow-md transition-all duration-300",
        featured && "md:flex-row",
        className
      )}
    >
      {/* Afbeelding — object-contain zodat verticale flyers/posters volledig zichtbaar
          blijven (delivery 12). bg-sand-100 vult de letterbox-strepen rond afwijkende
          aspect-ratio's met een rustige achtergrondkleur. */}
      <div
        className={cn(
          "relative bg-sand-100 overflow-hidden",
          featured ? "md:w-2/5 h-52 md:h-auto" : "h-48"
        )}
      >
{imageUrl ? (
  // eslint-disable-next-line @next/next/no-img-element
  <img
    src={imageUrl}
    alt={activity.title}
    className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
  />
) : (
          <div className="absolute inset-0 pattern-overlay bg-sand flex items-center justify-center">
            <Star className="w-12 h-12 text-taupe/40" strokeWidth={1.5} />
          </div>
        )}

        <div className="absolute top-3 left-3 bg-slate-mosque text-white rounded-xl px-3 py-2 text-center min-w-[52px] shadow-md">
          <div className="text-xl font-display leading-none">{dayNum}</div>
          <div className="text-xs font-body uppercase tracking-wide opacity-90 mt-0.5">
            {monthAbbr}
          </div>
        </div>

        {activity.featured && (
          <div className="absolute top-3 right-3 bg-taupe text-white text-xs font-body font-medium px-2 py-1 rounded-full">
            Uitgelicht
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-2 text-taupe text-sm font-body mb-2 flex-wrap">
          <Icon name={dateIcon} className="w-4 h-4 shrink-0" strokeWidth={2} />
          <span>{startDate}</span>
          {activity.location && (
            <>
              <span aria-hidden>·</span>
              <Icon name={locationIcon} className="w-4 h-4 shrink-0" strokeWidth={2} />
              <span className="truncate">{activity.location}</span>
            </>
          )}
          {/* Delivery 21 — Compact minimumleeftijd-badge (bv. "18+"). Alleen
              tonen wanneer minimum_age > 0. Past binnen flex-wrap zodat
              mobile layout intact blijft. Kleuren via palet-variabelen
              (taupe) zodat dark mode automatisch correct werkt. */}
          {typeof activity.minimum_age === "number" && activity.minimum_age > 0 && (
            <span
              className="inline-flex items-center rounded-md bg-taupe/15 text-taupe-dark px-1.5 py-0.5 text-xs font-medium border border-taupe/20"
              title={`Minimumleeftijd: ${activity.minimum_age} jaar`}
            >
              {activity.minimum_age}+
            </span>
          )}
          {/* Delivery recurring — badge voor terugkerende activiteiten.
              Geen icoon, alleen tekst om de meta-rij rustig te houden. */}
          {recurrenceLabel && (
            <span
              className="inline-flex items-center rounded-md bg-slate-mosque/10 text-slate-mosque px-1.5 py-0.5 text-xs font-medium border border-slate-mosque/20"
              title="Terugkerende activiteit"
            >
              {recurrenceLabel}
            </span>
          )}
        </div>

        <h3
          className={cn(
            "font-display text-ink group-hover:text-slate-mosque transition-colors",
            featured ? "text-2xl" : "text-xl"
          )}
        >
          {activity.title}
        </h3>

        {activity.description && (
          <p className="font-body text-taupe-dark text-sm leading-relaxed mt-2 flex-1 line-clamp-3">
            {activity.description.replace(/<[^>]+>/g, "")}
          </p>
        )}

        <div className="mt-4 flex items-center text-slate-mosque text-sm font-medium font-body group-hover:gap-2 transition-all">
          <span>Meer informatie</span>
          <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </TrackedLink>
  );
}
