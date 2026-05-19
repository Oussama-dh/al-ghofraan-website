// app/agenda/overzicht/page.tsx
//
// Volledige agenda als maandkalender (delivery recurring-ux).
//
// 7-koloms maandgrid (Ma–Zo) met:
//   - één entry per occurrence (recurring) of activity (eenmalig) op de
//     juiste dag, gesorteerd op tijd
//   - max 3 entries per cel; meer → "+N meer" link naar dag-anchor onder
//     de kalender met de volledige lijst voor die dag
//   - klikbare entries → naar /agenda/<slug> (detailpagina van het
//     hoofdrecord; bezoeker ziet daar de eerstvolgende / kan kiezen)
//   - "Vandaag" cel subtiel gemarkeerd
//   - dagen vóór/na de maand grijs en niet-klikbaar
//   - navigatie: vorige/volgende maand via ?month=YYYY-MM
//
// Server-component → cache-vriendelijk, occurrence-generatie server-side.
// Geen libraries. Pure date-math + Tailwind grid.

import type { Metadata }  from "next";
import Link              from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import PageHero          from "@/components/sections/PageHero";
import Container          from "@/components/ui/Container";
import {
  getActivities,
  getSiteSettings,
} from "@/lib/directus";
import type { Activity }  from "@/types/directus";
import {
  isRecurringActivity,
  generateActivityOccurrences,
  type ActivityOccurrence,
} from "@/lib/recurrence";

export const dynamic = "force-dynamic";

const FALLBACK = {
  title:    "Volledige agenda",
  arabic:   "جدول الأنشطة",
  subtitle: "Alle aankomende activiteiten en terugkerende lezingen op één pagina",
};

const MONTH_NL = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

// Maandag = 0, … Zondag = 6 (Nederlandse week-start).
const WEEKDAY_HEADERS_NL = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title:       FALLBACK.title,
    description:
      settings?.default_seo_description ||
      "Volledig overzicht van alle aankomende activiteiten en terugkerende lezingen van de DawahCommissie.",
  };
}

// ─── Helpers ───────────────────────────────────────────────

/**
 * Parse ?month=YYYY-MM. Bij ongeldig of leeg: huidige maand.
 * Strikte validatie voorkomt bv. ?month=2026-13 of injectie-pogingen.
 */
function resolveMonth(raw: string | string[] | undefined): { year: number; month: number } {
  const fallback = () => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  };
  if (typeof raw !== "string") return fallback();
  const m = raw.match(/^(\d{4})-(\d{2})$/);
  if (!m) return fallback();
  const year  = Number(m[1]);
  const month = Number(m[2]) - 1; // 0-indexed
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return fallback();
  if (month < 0 || month > 11) return fallback();
  return { year, month };
}

function formatMonthLabel({ year, month }: { year: number; month: number }): string {
  return `${MONTH_NL[month]} ${year}`.replace(/^./, (c) => c.toUpperCase());
}

function monthQueryParam(year: number, month: number): string {
  const mm = String(month + 1).padStart(2, "0");
  return `${year}-${mm}`;
}

function shiftMonth({ year, month }: { year: number; month: number }, delta: number): { year: number; month: number } {
  // Defensief via Date-object zodat overflow correct werkt (december +1 → januari).
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

/**
 * Weekdag-index met maandag=0. Native getDay() heeft zondag=0; we
 * schuiven (day + 6) % 7 om maandag-eerste te krijgen.
 */
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/**
 * YYYY-MM-DD key voor een Date (lokale tijd). Gebruikt om events per
 * dag te bucketeren.
 */
function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/**
 * "HH:MM" tijd-label uit een ISO-string. Gebruikt in kalender-cellen.
 */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// ─── Event type (één per cel-entry) ────────────────────────

interface CalendarEvent {
  activity: Activity;
  occurrence: ActivityOccurrence;
}

interface DayCell {
  date: Date;
  /** True als deze dag in de actieve maand valt; anders grijs (vorige/volgende maand). */
  inMonth: boolean;
  /** True als deze dag de echte "vandaag" is. */
  isToday: boolean;
  /** Events op deze dag, gesorteerd op tijd (start). */
  events: CalendarEvent[];
  /** YYYY-MM-DD voor anchor-links. */
  dayKey: string;
}

interface Props {
  searchParams?: { month?: string | string[] };
}

export default async function AgendaOverzichtPage({ searchParams }: Props) {
  const { year, month } = resolveMonth(searchParams?.month);
  const activeMonth = { year, month };
  const today = new Date();
  const todayKey = dayKey(today);

  // ─── Range bepalen voor occurrence-generatie ──────────────
  //
  // We renderen kalender-dagen van vorige-maand-start (om de eerste week
  // op te vullen) tot volgende-maand-einde van de zichtbare grid. We
  // genereren occurrences over een ruimer venster zodat we recurring
  // activities die in deze maand vallen ook oppikken — daarna filteren
  // op de zichtbare dagen.
  const monthStart = new Date(year, month, 1);
  // Generatievenster: 1 maand vóór monthStart tot 1 maand na monthEnd
  // (genoeg om grid-cellen te vullen + buffer).
  const genFrom = new Date(year, month - 1, 1);
  const genTo   = new Date(year, month + 2, 0);

  // ─── Activities ophalen + events opbouwen ─────────────────
  const activities = (await getActivities()) as Activity[];

  const eventsByDay = new Map<string, CalendarEvent[]>();

  for (const activity of activities) {
    if (isRecurringActivity(activity)) {
      // Recurring: genereer alle occurrences vanaf genFrom (incl. verleden
      // recente maanden zodat kalendernavigatie naar verleden ook werkt).
      const occs = generateActivityOccurrences(activity, { from: genFrom, limit: 200 });
      for (const occ of occs) {
        const d = new Date(occ.start);
        if (d < genFrom || d > genTo) continue;
        const k = dayKey(d);
        const arr = eventsByDay.get(k) ?? [];
        arr.push({ activity, occurrence: occ });
        eventsByDay.set(k, arr);
      }
    } else {
      // Eenmalig: gebruik start_date direct.
      const d = new Date(activity.start_date);
      if (Number.isNaN(d.getTime())) continue;
      if (d < genFrom || d > genTo) continue;
      const k = dayKey(d);
      const arr = eventsByDay.get(k) ?? [];
      arr.push({
        activity,
        occurrence: {
          start: activity.start_date,
          end:   activity.end_date || activity.start_date,
          label: "",
          index: 0,
        },
      });
      eventsByDay.set(k, arr);
    }
  }

  // Sorteer per dag op tijd.
  for (const arr of Array.from(eventsByDay.values())) {
    arr.sort((a: CalendarEvent, b: CalendarEvent) => a.occurrence.start.localeCompare(b.occurrence.start));
  }

  // ─── Grid bouwen ──────────────────────────────────────────
  // Eerste zichtbare dag = maandag van de week waarin maand-1e valt.
  const firstWeekdayIdx = mondayIndex(monthStart);
  const gridStart = new Date(year, month, 1 - firstWeekdayIdx);

  // 6 weken × 7 dagen = 42 cellen. Sommige maanden passen in 5 rijen,
  // maar 6 rijen voorkomt layout-shift tussen maanden. Lege rij wordt
  // gewoon weggelaten als de hele rij buiten de maand valt.
  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const k = dayKey(d);
    cells.push({
      date:    d,
      inMonth: d.getMonth() === month && d.getFullYear() === year,
      isToday: k === todayKey,
      events:  eventsByDay.get(k) ?? [],
      dayKey:  k,
    });
  }

  // Knip evt. lege laatste rij weg (alleen als ALLE 7 cellen in die rij
  // niet-in-maand zijn).
  const trimmed: DayCell[] = [];
  for (let row = 0; row < 6; row++) {
    const rowCells = cells.slice(row * 7, row * 7 + 7);
    const hasMonthDays = rowCells.some((c) => c.inMonth);
    if (hasMonthDays) trimmed.push(...rowCells);
  }
  const visibleCells = trimmed.length > 0 ? trimmed : cells.slice(0, 35);

  // Dagen met >3 events worden onderaan de pagina uitgewerkt.
  const dayOverflowList = Array.from(eventsByDay.entries())
    .filter(([k, arr]) => arr.length > 3 && k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}-`))
    .map(([k, arr]) => ({ dayKey: k, events: arr }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

  const prevMonth = shiftMonth(activeMonth, -1);
  const nextMonth = shiftMonth(activeMonth, 1);
  const totalEventsInMonth = visibleCells.reduce(
    (acc, c) => acc + (c.inMonth ? c.events.length : 0),
    0,
  );

  return (
    <>
      <PageHero
        title={FALLBACK.title}
        arabic={FALLBACK.arabic}
        subtitle={FALLBACK.subtitle}
      />

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          <div className="mb-6">
            <Link
              href="/agenda"
              className="inline-flex items-center gap-2 font-body text-sm text-taupe hover:text-slate-mosque transition-colors"
            >
              <ArrowLeft size={16} strokeWidth={2} />
              Terug naar agenda
            </Link>
          </div>

          {/* ─── Maand-navigatie ─────────────────────────────── */}
          <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-display text-2xl sm:text-3xl text-ink">
              {formatMonthLabel(activeMonth)}
            </h2>
            <div className="flex items-center gap-2">
              <Link
                href={`/agenda/overzicht?month=${monthQueryParam(prevMonth.year, prevMonth.month)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-white px-3 py-1.5 font-body text-sm text-ink hover:border-slate-mosque hover:text-slate-mosque transition-colors"
                aria-label={`Vorige maand: ${formatMonthLabel(prevMonth)}`}
              >
                <ChevronLeft size={16} strokeWidth={2} />
                Vorige
              </Link>
              <Link
                href="/agenda/overzicht"
                className="inline-flex items-center rounded-full border border-sand-300 bg-white px-3 py-1.5 font-body text-sm text-ink hover:border-slate-mosque hover:text-slate-mosque transition-colors"
              >
                Vandaag
              </Link>
              <Link
                href={`/agenda/overzicht?month=${monthQueryParam(nextMonth.year, nextMonth.month)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 bg-white px-3 py-1.5 font-body text-sm text-ink hover:border-slate-mosque hover:text-slate-mosque transition-colors"
                aria-label={`Volgende maand: ${formatMonthLabel(nextMonth)}`}
              >
                Volgende
                <ChevronRight size={16} strokeWidth={2} />
              </Link>
            </div>
          </div>

          {/* ─── Kalender-grid ───────────────────────────────── */}
          <div className="rounded-2xl border border-sand-200 bg-white overflow-hidden">
            {/* Headers Ma..Zo */}
            <div className="grid grid-cols-7 border-b border-sand-200 bg-sand-50">
              {WEEKDAY_HEADERS_NL.map((wd) => (
                <div
                  key={wd}
                  className="px-1 sm:px-2 py-2 text-center font-body text-xs sm:text-sm font-medium text-taupe-dark"
                >
                  {wd}
                </div>
              ))}
            </div>
            {/* Cellen */}
            <div className="grid grid-cols-7">
              {visibleCells.map((cell, idx) => {
                const visibleEvents = cell.events.slice(0, 3);
                const hiddenCount   = Math.max(0, cell.events.length - 3);
                return (
                  <div
                    key={idx}
                    className={
                      "min-h-[5.5rem] sm:min-h-[7rem] border-b border-r border-sand-100 p-1 sm:p-1.5 flex flex-col gap-1 " +
                      (cell.inMonth ? "bg-white" : "bg-sand-50/50") +
                      (cell.isToday ? " ring-2 ring-inset ring-slate-mosque/60" : "")
                    }
                  >
                    <div className={
                      "text-xs sm:text-sm font-body font-medium " +
                      (cell.inMonth
                        ? (cell.isToday ? "text-slate-mosque" : "text-ink")
                        : "text-taupe/40")
                    }>
                      {cell.date.getDate()}
                    </div>
                    {/* Events */}
                    {cell.inMonth && visibleEvents.map((ev, i) => (
                      <Link
                        key={`${ev.activity.id}-${ev.occurrence.start}-${i}`}
                        href={`/agenda/${ev.activity.slug}`}
                        className="block rounded bg-slate-mosque/10 hover:bg-slate-mosque/20 px-1 py-0.5 text-[10px] sm:text-xs text-slate-mosque font-body truncate transition-colors"
                        title={`${ev.activity.title} — ${timeLabel(ev.occurrence.start)}`}
                      >
                        <span className="font-medium">{timeLabel(ev.occurrence.start)}</span>{" "}
                        <span className="hidden sm:inline">{ev.activity.title}</span>
                        <span className="sm:hidden">{ev.activity.title.slice(0, 12)}{ev.activity.title.length > 12 ? "…" : ""}</span>
                      </Link>
                    ))}
                    {cell.inMonth && hiddenCount > 0 && (
                      <Link
                        href={`#dag-${cell.dayKey}`}
                        className="block text-[10px] sm:text-xs text-taupe-dark hover:text-slate-mosque font-body italic px-1"
                      >
                        + {hiddenCount} meer
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── Lege-maand melding ──────────────────────────── */}
          {totalEventsInMonth === 0 && (
            <div className="mt-6 text-center py-8 rounded-2xl border border-sand-200 bg-white">
              <p className="font-body text-taupe-dark">
                Geen activiteiten gepland in {formatMonthLabel(activeMonth).toLowerCase()}.
              </p>
            </div>
          )}

          {/* ─── Dag-overflow lijsten (>3 events op één dag) ─── */}
          {dayOverflowList.length > 0 && (
            <div className="mt-10 space-y-6">
              <h3 className="font-display text-xl text-ink">
                Dagen met meerdere activiteiten
              </h3>
              {dayOverflowList.map(({ dayKey: dk, events }) => {
                const d = new Date(`${dk}T00:00:00`);
                const dayLabel = `${d.getDate()} ${MONTH_NL[d.getMonth()]} ${d.getFullYear()}`;
                return (
                  <div key={dk} id={`dag-${dk}`} className="rounded-2xl border border-sand-200 bg-white p-5">
                    <h4 className="font-display text-lg text-ink mb-3">{dayLabel}</h4>
                    <ul className="space-y-2">
                      {events.map((ev, i) => (
                        <li key={`${ev.activity.id}-${ev.occurrence.start}-${i}`}>
                          <Link
                            href={`/agenda/${ev.activity.slug}`}
                            className="flex items-start gap-3 rounded-lg hover:bg-sand-50 px-2 py-1.5 transition-colors group"
                          >
                            <span className="font-body text-sm font-medium text-slate-mosque min-w-[3.5rem]">
                              {timeLabel(ev.occurrence.start)}
                            </span>
                            <span className="font-body text-sm text-ink group-hover:text-slate-mosque">
                              {ev.activity.title}
                              {ev.activity.location && (
                                <span className="text-taupe-dark"> — {ev.activity.location}</span>
                              )}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </Container>
      </section>
    </>
  );
}
