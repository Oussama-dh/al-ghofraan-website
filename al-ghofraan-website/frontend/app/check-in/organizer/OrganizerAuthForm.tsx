"use client";

// app/check-in/organizer/OrganizerAuthForm.tsx
//
// Client component voor handmatige invoer van de organisatorcode.
// Doet POST /api/check-in/organizer { code }. Bij 200 zet de server
// een HttpOnly cookie en retourneert de gekozen sessieduur.
//
// Na succes refresht de pagina (router.refresh) zodat de server-
// component de cookie ziet en het "al geautoriseerd" blok rendert.

import { useState }     from "react";
import { useRouter }    from "next/navigation";

interface OrganizerAuthFormProps {
  /** Sessieduur in uren — getoond in de bevestigingsmelding. */
  sessionHours: number;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error";        message: string }
  | { kind: "authorized";   hours: number };

export default function OrganizerAuthForm({ sessionHours }: OrganizerAuthFormProps) {
  const router = useRouter();

  const [code,  setCode]  = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "submitting") return;
    setState({ kind: "submitting" });

    try {
      const res = await fetch("/api/check-in/organizer", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        body:        JSON.stringify({ code }),
        credentials: "same-origin",
      });

      let data: {
        ok?:             boolean;
        error?:          string;
        duration_hours?: number;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        // Niet-JSON antwoord (zou niet moeten), val terug op generieke fout.
      }

      if (!res.ok || !data.ok) {
        setState({
          kind: "error",
          message: data.error || "Er ging iets mis. Probeer het opnieuw.",
        });
        return;
      }

      setState({
        kind:  "authorized",
        hours: data.duration_hours ?? sessionHours,
      });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Netwerkfout";
      setState({
        kind: "error",
        message: `Kan niet activeren: ${msg}`,
      });
    }
  }

  if (state.kind === "authorized") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-body text-sm text-green-900">
        <p className="font-medium">
          ✓ Dit apparaat is {state.hours} uur lang geautoriseerd voor check-in.
        </p>
        <p className="text-xs mt-1 opacity-80">
          U kunt nu deelnemers inchecken via hun QR-code.
        </p>
      </div>
    );
  }

  const isSubmitting = state.kind === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label
          htmlFor="organizer-code"
          className="block font-body text-sm text-taupe-dark mb-1"
        >
          Organisatorcode
        </label>
        <input
          id="organizer-code"
          type="password"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={isSubmitting}
          className="w-full rounded-lg border border-sand-300 bg-white px-3 py-2 font-body text-base text-ink focus:outline-none focus:ring-2 focus:ring-slate-mosque/40 focus:border-slate-mosque disabled:opacity-60"
          required
        />
      </div>

      {state.kind === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 font-body text-sm text-red-800"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting || code.length === 0}
        className="w-full rounded-lg bg-slate-mosque text-white font-display text-base py-3 hover:bg-slate-mosque/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Bezig…" : "Organisator activeren"}
      </button>
    </form>
  );
}
