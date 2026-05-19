"use client";

// app/check-in/[token]/CheckInForm.tsx
//
// Client component voor de organisator-handeling. Eén POST naar
// /api/check-in/[token]. Twee modes op basis van alreadyAuthorized:
//
//   - alreadyAuthorized = true  → toon alleen knop "Check-in bevestigen".
//                                  Body is leeg; server gebruikt cookie.
//   - alreadyAuthorized = false → toon code-input + knop. Body bevat
//                                  organizerCode; server zet cookie bij succes.
//
// Server kan terugvallen op require_code=true in een 401-response:
// dat betekent "code was wel ingevuld maar fout" of "cookie verlopen
// tussen render en submit". In dat geval togglet de UI naar code-input.
//
// Na succes: toont status zonder full page reload. router.refresh()
// laat de server-component de bijgewerkte registratie ophalen, zodat
// het statuslabel + tijd ook bovenin de pagina vernieuwen.

import { useState }     from "react";
import { useRouter }    from "next/navigation";

interface CheckInFormProps {
  token:             string;
  alreadyAuthorized: boolean;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error";   message: string }
  | { kind: "checked-in";        at: string }
  | { kind: "already-checked-in"; at: string };

export default function CheckInForm({
  token,
  alreadyAuthorized,
}: CheckInFormProps) {
  const router = useRouter();

  // We tonen code-input als:
  //  - we geen authorize-cookie hebben, OF
  //  - de server in een eerdere submit zei dat een code alsnog nodig is.
  const [needsCode, setNeedsCode] = useState(!alreadyAuthorized);
  const [code,      setCode]      = useState("");
  const [state,     setState]     = useState<SubmitState>({ kind: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === "submitting") return;
    setState({ kind: "submitting" });

    try {
      const body = needsCode ? { organizerCode: code } : {};
      const res  = await fetch(`/api/check-in/${encodeURIComponent(token)}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
        // SameSite=Lax cookies worden bij same-origin POST meegestuurd.
        credentials: "same-origin",
      });

      // Probeer body altijd te parsen — server stuurt JSON ook bij errors.
      let data: {
        ok?:            boolean;
        status?:        string;
        error?:         string;
        require_code?:  boolean;
        checked_in_at?: string;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        // Niet-JSON antwoord (zou niet moeten gebeuren) — fall through naar fout.
      }

      if (!res.ok) {
        // Server vraagt om code (bv. cookie verlopen of fout).
        if (data.require_code) {
          setNeedsCode(true);
          setState({
            kind: "error",
            message: data.error || "Organisatorcode vereist.",
          });
          return;
        }
        setState({
          kind: "error",
          message: data.error || "Er ging iets mis. Probeer het opnieuw.",
        });
        return;
      }

      if (data.status === "already_checked_in") {
        setState({
          kind: "already-checked-in",
          at:   data.checked_in_at || "",
        });
        router.refresh();
        return;
      }
      if (data.status === "checked_in") {
        setState({
          kind: "checked-in",
          at:   data.checked_in_at || "",
        });
        // Forceer cookie te zijn binnengekomen vóór een mogelijke
        // tweede submit — refresh haalt server-state opnieuw op.
        router.refresh();
        return;
      }

      // Vangnet
      setState({
        kind: "error",
        message: "Onverwacht antwoord van de server.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Netwerkfout";
      setState({
        kind: "error",
        message: `Kan check-in niet uitvoeren: ${msg}`,
      });
    }
  }

  // ─── Render — succesblokken ──────────────────────────────
  if (state.kind === "checked-in") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-body text-sm text-green-900">
        <p className="font-medium">✓ Deelnemer ingecheckt.</p>
        {state.at && (
          <p className="text-xs mt-1 opacity-80">
            Tijd: {formatLocalDateTime(state.at)}
          </p>
        )}
      </div>
    );
  }

  if (state.kind === "already-checked-in") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 font-body text-sm text-amber-900">
        <p className="font-medium">⚠ Deelnemer was al ingecheckt.</p>
        {state.at && (
          <p className="text-xs mt-1 opacity-80">
            Oorspronkelijk ingecheckt op {formatLocalDateTime(state.at)}.
          </p>
        )}
      </div>
    );
  }

  // ─── Render — formulier ──────────────────────────────────
  const isSubmitting = state.kind === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {needsCode && (
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
      )}

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
        disabled={isSubmitting || (needsCode && code.length === 0)}
        className="w-full rounded-lg bg-slate-mosque text-white font-display text-base py-3 hover:bg-slate-mosque/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Bezig met inchecken…" : "Check-in bevestigen"}
      </button>

      {needsCode && (
        <p className="font-body text-xs text-taupe-dark/70 text-center">
          <a
            href="/check-in/organizer"
            className="underline hover:text-slate-mosque"
          >
            Organisator activeren →
          </a>
          <span className="block mt-1">
            Activeer dit apparaat één keer om bij volgende QR-scans geen code meer in te hoeven vullen.
          </span>
        </p>
      )}

      {!needsCode && (
        <p className="font-body text-xs text-taupe-dark/70 text-center">
          U bent geautoriseerd op dit apparaat. Code niet nodig.
        </p>
      )}
    </form>
  );
}

function formatLocalDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("nl-NL", {
      day:    "numeric",
      month:  "long",
      year:   "numeric",
      hour:   "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
