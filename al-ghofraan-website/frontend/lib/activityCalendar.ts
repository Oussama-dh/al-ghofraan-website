// lib/activityCalendar.ts
//
// Eén centrale plek voor de "effective end date" van een activiteit:
// als end_date in Directus ontbreekt, valt deze terug op start_date
// + 2 uur. Beide de ICS-route en de Google Calendar button gebruiken
// dezelfde fallback zodat een geïmporteerd .ics-bestand dezelfde
// eindtijd toont als de Google Calendar link.

import type { Activity }              from "@/types/directus";
import { buildGoogleCalendarUrl }     from "@/lib/calendar";

/** Fallback-duur in milliseconds wanneer activity.end_date leeg is. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000; // 2 uur

export function resolveActivityEnd(activity: Pick<Activity, "start_date" | "end_date">): string {
  if (activity.end_date) {
    const d = new Date(activity.end_date);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const start = new Date(activity.start_date);
  if (Number.isNaN(start.getTime())) {
    // Defensief — geeft caller iets bruikbaars terug
    return activity.start_date;
  }
  return new Date(start.getTime() + DEFAULT_DURATION_MS).toISOString();
}

/**
 * Bouw Google Calendar URL voor een activiteit met de juiste
 * fallback voor eindtijd. Plain text description wordt door
 * buildGoogleCalendarUrl zelf gestript.
 */
export function buildGoogleCalendarUrlForActivity(
  activity: Pick<Activity, "title" | "start_date" | "end_date" | "location" | "description">,
): string {
  return buildGoogleCalendarUrl({
    title:       activity.title,
    start:       activity.start_date,
    end:         resolveActivityEnd(activity),
    description: activity.description || undefined,
    location:    activity.location || undefined,
  });
}
