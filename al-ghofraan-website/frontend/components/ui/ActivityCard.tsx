// components/ui/ActivityCard.tsx

import Link   from "next/link";
import Image  from "next/image";
import type { Activity } from "@/types/directus";
import { formatDate, formatDateShort } from "@/lib/utils";
import { getAssetUrl }                  from "@/lib/directus";
import { cn }                           from "@/lib/utils";

interface ActivityCardProps {
  activity:   Activity;
  featured?:  boolean;
  className?: string;
}

export default function ActivityCard({
  activity,
  featured  = false,
  className,
}: ActivityCardProps) {
  const imageId =
    typeof activity.image === "string"
      ? activity.image
      : activity.image?.id;

  const startDate    = formatDate(activity.start_date, "d MMMM yyyy");
  const startDateShort = formatDateShort(activity.start_date);
  const dayNum       = formatDate(activity.start_date, "d");
  const monthAbbr    = formatDate(activity.start_date, "MMM");

  return (
    <Link
      href={`/agenda/${activity.slug}`}
      className={cn(
        "group flex flex-col bg-white rounded-2xl overflow-hidden",
        "border border-sand-200 hover:border-taupe/50",
        "shadow-sm hover:shadow-md transition-all duration-300",
        featured && "md:flex-row",
        className
      )}
    >
      {/* Afbeelding */}
      <div
        className={cn(
          "relative bg-sand overflow-hidden",
          featured ? "md:w-2/5 h-52 md:h-auto" : "h-48"
        )}
      >
        {imageId ? (
          <Image
            src={getAssetUrl(imageId)}
            alt={activity.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          /* Fallback: islamitisch patroon als placeholder */
          <div className="absolute inset-0 pattern-overlay bg-sand flex items-center justify-center">
            <svg
              width="48"
              height="48"
              viewBox="0 0 48 48"
              fill="none"
              className="text-taupe/40"
            >
              <path
                d="M24 4l5.09 10.26L40 16.18l-8 7.8 1.89 11-9.89-5.2-9.89 5.2L16 24 8 16.18l10.91-1.92L24 4z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {/* Datumsticker */}
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
        <div className="flex items-center gap-2 text-taupe text-sm font-body mb-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{startDate}</span>
          {activity.location && (
            <>
              <span>·</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span className="truncate">{activity.location}</span>
            </>
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="ml-1 group-hover:translate-x-1 transition-transform"
          >
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </div>
      </div>
    </Link>
  );
}
