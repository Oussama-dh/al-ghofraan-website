"use client";

// components/activity/ActivityOccurrenceSection.tsx
//
// Client-side wrapper voor TERUGKERENDE activiteiten op de detailpagina.
// Combineert:
//   1. Occurrence-picker (dropdown of card-strip)
//   2. AddToCalendarButton met dynamische occurrence-datums
//   3. RegistrationForm met occurrence-prop
//
// Niet-recurring activiteiten gebruiken deze wrapper NIET — die blijven
// `RegistrationForm` direct vanuit de server-component aanroepen.
//
// Server-component-flow:
//   <ActivityOccurrenceSection
//      activity={...} occurrences={...} formProps={...} />
//
// `occurrences` worden door de server gegenereerd via
// `generateActivityOccurrences()` en als props doorgegeven — zo blijft
// de generatie deterministisch (server-time) en heeft de client geen
// recurrence-logica zelf nodig.

import { useState, useMemo } from "react";
import { CalendarRange }     from "lucide-react";
import RegistrationForm      from "@/components/registration/RegistrationForm";
import AddToCalendarButton   from "@/components/activity/AddToCalendarButton";
import { buildGoogleCalendarUrl } from "@/lib/calendar";

interface OccurrenceData {
  start: string;
  end:   string;
  label: string;
  index: number;
}

interface FormPropsSubset {
  sourceSlug:   string;
  sourceTitle:  string;
  targetGender: string | null;
  requireAge:   boolean;
  contentTexts: {
    intro_title?: string | null;
    intro_text?: string | null;
    button_text?: string | null;
    success_message?: string | null;
    extra_note?: string | null;
  };
}

interface ActivityForCalendar {
  title:        string;
  slug:         string;
  description?: string | null;
  location?:    string | null;
}

interface Props {
  activity:    ActivityForCalendar;
  occurrences: OccurrenceData[];
  /** Toon registratieformulier? (false = registration_enabled is uit of vol). */
  showForm:    boolean;
  formProps:   FormPropsSubset;
}

export default function ActivityOccurrenceSection({
  activity,
  occurrences,
  showForm,
  formProps,
}: Props) {
  // Default keuze: eerstvolgende occurrence (index 0 in de gegenereerde array).
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Hooks moeten ONVOORWAARDELIJK uitgevoerd worden — daarom altijd
  // berekenen, ook bij occurrences.length === 0. We vangen die edge-case
  // af na de hook-aanroepen.
  const fallbackOcc: OccurrenceData = { start: "", end: "", label: "", index: 0 };
  const selected = occurrences[selectedIdx] ?? occurrences[0] ?? fallbackOcc;

  const googleCalendarUrl = useMemo(
    () =>
      buildGoogleCalendarUrl({
        title:       activity.title,
        start:       selected.start,
        end:         selected.end,
        description: activity.description || undefined,
        location:    activity.location || undefined,
      }),
    [activity.title, activity.description, activity.location, selected.start, selected.end],
  );

  const icsHref = useMemo(() => {
    const params = new URLSearchParams({
      start: selected.start,
      end:   selected.end,
    });
    return `/api/agenda/${encodeURIComponent(activity.slug)}/ics?${params.toString()}`;
  }, [activity.slug, selected.start, selected.end]);

  // Defensief — als er onverwacht geen occurrences zijn (recurring-serie afgelopen?),
  // renderen we een neutrale melding ipv te crashen op de occurrence-selector.
  if (occurrences.length === 0) {
    return (
      <div className="rounded-2xl border border-sand-200 bg-white p-6 lg:p-8 text-center">
        <h2 className="font-display text-xl text-ink mb-2">
          Geen aankomende data gepland
        </h2>
        <p className="font-body text-sm text-taupe-dark max-w-md mx-auto">
          De serie van deze terugkerende activiteit is afgelopen of er zijn nog geen
          toekomstige momenten ingepland.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* ─── Occurrence-keuze ────────────────────────────── */}
      <div className="mb-6 rounded-2xl border border-sand-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange size={18} strokeWidth={2} className="text-slate-mosque" />
          <h3 className="font-display text-lg text-ink">
            Kies een datum
          </h3>
        </div>
        <p className="font-body text-sm text-taupe-dark mb-4">
          Dit is een terugkerende activiteit. Kies voor welke datum u zich wilt
          inschrijven of een agenda-uitnodiging wilt downloaden.
        </p>
        <label className="block">
          <span className="sr-only">Selecteer datum</span>
          <select
            value={selectedIdx}
            onChange={(e) => setSelectedIdx(Number(e.target.value))}
            className="w-full rounded-xl border border-sand-300 bg-white px-4 py-3 font-body text-ink focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-slate-mosque"
          >
            {occurrences.map((occ, i) => (
              <option key={`${occ.start}-${occ.index}`} value={i}>
                {occ.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ─── Agenda-toevoegen (geselecteerde occurrence) ─── */}
      <div className="mb-6">
        <AddToCalendarButton
          slug={activity.slug}
          googleCalendarUrl={googleCalendarUrl}
          icsHref={icsHref}
        />
      </div>

      {/* ─── Inschrijfformulier met occurrence-prop ───────── */}
      {showForm && (
        <RegistrationForm
          type="activity"
          sourceSlug={formProps.sourceSlug}
          sourceTitle={formProps.sourceTitle}
          targetGender={formProps.targetGender as never}
          requireAge={formProps.requireAge}
          contentTexts={formProps.contentTexts}
          occurrence={{
            start: selected.start,
            end:   selected.end,
            label: selected.label,
          }}
        />
      )}
    </>
  );
}
