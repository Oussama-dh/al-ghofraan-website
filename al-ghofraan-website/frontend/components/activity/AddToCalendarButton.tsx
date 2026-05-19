"use client";

// components/activity/AddToCalendarButton.tsx
//
// Knop "Zet in agenda" met een uitklap-popover die twee opties biedt:
//   1. Google Agenda  → opent calendar.google.com deeplink in nieuwe tab
//   2. Apple/Outlook  → download .ics via /api/agenda/[slug]/ics
//
// Beide gebruiken dezelfde activity-data; de Google URL wordt op
// de server berekend (props.googleCalendarUrl) zodat de client geen
// eigen datum-utilities meekrijgt. Het ICS-pad is gewoon een download.
//
// UX:
//   - Outside-click sluit het popover.
//   - Toetsenbord: knop is focusable, popover-items zijn links.
//   - Geen JS-dropdown library — pure useState + ref.

import { useState, useRef, useEffect } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddToCalendarButtonProps {
  slug:              string;
  googleCalendarUrl: string;
  /** Optionele extra className voor de outer button (layout). */
  className?:        string;
  /**
   * Delivery recurring — optionele override voor de ICS-link. Wordt gebruikt
   * door ActivityOccurrenceSection om query params (start/end) mee te geven
   * zodat de ICS-route de gekozen occurrence-datums gebruikt ipv de
   * hoofdrecord-datum. Default: `/api/agenda/<slug>/ics`.
   */
  icsHref?:          string;
}

export default function AddToCalendarButton({
  slug,
  googleCalendarUrl,
  className,
  icsHref,
}: AddToCalendarButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const resolvedIcsHref = icsHref ?? `/api/agenda/${encodeURIComponent(slug)}/ics`;

  return (
    <div ref={wrapperRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-sand-300 bg-white px-4 py-2",
          "font-body text-sm text-ink hover:border-slate-mosque hover:text-slate-mosque transition-colors",
        )}
      >
        <CalendarPlus size={16} strokeWidth={2} />
        <span>Zet in agenda</span>
        <ChevronDown
          size={14}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      <div
        className={cn(
          "absolute left-0 top-full mt-1 min-w-[220px] bg-white rounded-xl border border-sand-200 shadow-lg py-1.5 z-30",
          open ? "block" : "hidden",
        )}
        role="menu"
      >
        <a
          href={googleCalendarUrl}
          target="_blank"
          rel="noopener noreferrer"
          role="menuitem"
          className="block px-4 py-2 font-body text-sm text-ink hover:bg-sand hover:text-slate-mosque transition-colors"
          onClick={() => setOpen(false)}
        >
          Google Agenda
        </a>
        <a
          href={resolvedIcsHref}
          role="menuitem"
          className="block px-4 py-2 font-body text-sm text-ink hover:bg-sand hover:text-slate-mosque transition-colors"
          onClick={() => setOpen(false)}
        >
          Apple / Outlook (.ics)
        </a>
      </div>
    </div>
  );
}
