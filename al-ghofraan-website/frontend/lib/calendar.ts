// lib/calendar.ts
//
// Helper voor "Toevoegen aan Google Agenda" deeplinks. Google's
// publieke calendar-render URL accepteert query-params voor één
// event, opent direct in browser/app:
//
//   https://calendar.google.com/calendar/render?action=TEMPLATE
//     &text=...
//     &dates=YYYYMMDDTHHmmssZ/YYYYMMDDTHHmmssZ
//     &details=...
//     &location=...
//
// Deze helper hoort puur de URL te bouwen — fetching of mutaties
// gebeuren elders. Geen dep.

export interface GoogleCalendarEvent {
  title:        string;
  start:        string;  // ISO
  end:          string;  // ISO
  description?: string;
  location?:    string;
}

function toGoogleUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date for Google Calendar URL: ${iso}`);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function stripHtml(input: string): string {
  return input
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

export function buildGoogleCalendarUrl(event: GoogleCalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text:   event.title,
    dates:  `${toGoogleUtc(event.start)}/${toGoogleUtc(event.end)}`,
  });
  if (event.description) {
    // Google accepteert HTML in details maar plain text is veiliger
    // (geen XSS, geen broken render in mobile-apps).
    params.set("details", stripHtml(event.description));
  }
  if (event.location) {
    params.set("location", event.location);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
