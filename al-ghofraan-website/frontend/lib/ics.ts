// lib/ics.ts
//
// Pure helper voor het bouwen van een minimaal-werkend iCalendar
// (.ics) bestand voor één activiteit. Geen dependency — handgeschreven
// RFC5545-compliant string.
//
// Wat de spec eist (minimum):
//   - BEGIN:VCALENDAR ... END:VCALENDAR
//   - VERSION:2.0 + PRODID
//   - één VEVENT met UID, DTSTAMP, DTSTART, DTEND, SUMMARY
//   - CRLF line endings (\r\n) — NIET LF
//   - lange regels gevouwen op 75 octets met leading space op
//     vervolg-regels
//   - speciale tekens in SUMMARY/DESCRIPTION/LOCATION moeten
//     escaped worden: backslash, comma, semicolon, newline
//
// Verschil met google calendar URL:
//   ICS werkt voor Apple Calendar, Outlook, Thunderbird en als
//   import in Google Calendar. Google heeft daarnaast een eigen
//   "Add to Calendar" deeplink (zie lib/calendar.ts) die in één
//   klik werkt in de Google Calendar webapp.

export interface IcsEventInput {
  /** Stabiel uniek ID. Aanbevolen: slug + start_date. */
  uid:          string;
  /** ISO datum/tijd (UTC of met offset). */
  start:        string;
  /** ISO datum/tijd. Verplicht — caller berekent fallback. */
  end:          string;
  /** Korte titel (één regel). */
  title:        string;
  /** Optionele beschrijving — HTML wordt naar plain text gestript. */
  description?: string;
  /** Optionele locatie. */
  location?:    string;
  /** Optionele canonical URL naar de activiteit-pagina. */
  url?:         string;
}

/**
 * Escape special chars per RFC5545 §3.3.11 (TEXT type).
 *   \  → \\
 *   ;  → \;
 *   ,  → \,
 *   newline (LF, CR, CRLF) → \n  (letterlijke "\n" in de string)
 */
function escapeText(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/**
 * Strip HTML tags uit een string. Niet superkrachtig maar voldoende
 * voor de description-velden uit Directus (typisch <p>, <br>, <strong>).
 */
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

/**
 * ISO datum/tijd → ICS format YYYYMMDDTHHmmssZ (UTC) of
 * YYYYMMDDTHHmmss (floating). We retourneren altijd UTC voor
 * voorspelbaarheid: clients converteren zelf naar lokale tijd.
 */
function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date for ICS: ${iso}`);
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

/**
 * Fold lange regels op 75 octets per RFC5545 §3.1. Lange regels die
 * niet gefold worden faalt in oudere Outlook-clients.
 * Voor onze use-case (korte velden) zelden nodig, maar netjes.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let i = 0;
  while (i < line.length) {
    const slice = line.slice(i, i + (chunks.length === 0 ? 75 : 74));
    chunks.push(slice);
    i += slice.length;
  }
  // Vervolgregels krijgen leading space
  return chunks.join("\r\n ");
}

export function buildIcsContent(event: IcsEventInput): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//Al-Ghofraan//Agenda 1.0//NL");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${escapeText(event.uid)}`);
  lines.push(`DTSTAMP:${toIcsUtc(new Date().toISOString())}`);
  lines.push(`DTSTART:${toIcsUtc(event.start)}`);
  lines.push(`DTEND:${toIcsUtc(event.end)}`);
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(stripHtml(event.description))}`);
  }
  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }
  if (event.url) {
    lines.push(`URL:${event.url}`);
  }
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
