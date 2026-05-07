// components/registration/RegistrationForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Gender, RegistrationType, TargetGender } from "@/types/directus";

interface RegistrationFormProps {
  /** Type bron — bepaalt naar welke collectie geschreven wordt */
  type:        RegistrationType;
  /** Slug van de bron (activity of education_program) */
  sourceSlug:  string;
  /** Titel van de bron — wordt meegegeven voor weergave in admin */
  sourceTitle: string;
  /**
   * Doelgroep van de bron op geslacht:
   *  - "male"   → alleen mannen mogen inschrijven
   *  - "female" → alleen vrouwen mogen inschrijven
   *  - "mixed"  (of leeg) → mannen en vrouwen
   */
  targetGender?: TargetGender | null;
  /** Optionele eigen titel boven het formulier */
  heading?:    string;
  /** Optionele inleidende tekst */
  intro?:      string;
  className?:  string;
}

interface FormState {
  name:    string;
  email:   string;
  phone:   string;
  age:     string;
  gender:  "" | Gender;
  notes:   string;
  consent: boolean;
}

const initialState: FormState = {
  name:    "",
  email:   "",
  phone:   "",
  age:     "",
  gender:  "",
  notes:   "",
  consent: false,
};

/**
 * Bepaal welke gender-opties getoond worden + initial value op basis van targetGender.
 *  - male      → alleen "Man",   pre-selected
 *  - female    → alleen "Vrouw", pre-selected
 *  - mixed/leeg → beide opties, leeg
 */
function resolveGenderConfig(target: TargetGender | null | undefined): {
  options:      Array<{ value: Gender; label: string }>;
  initialValue: "" | Gender;
  notice:       string | null;
  locked:       boolean;
} {
  if (target === "male") {
    return {
      options:      [{ value: "male", label: "Man" }],
      initialValue: "male",
      notice:       "Deze inschrijving is alleen voor mannen.",
      locked:       true,
    };
  }
  if (target === "female") {
    return {
      options:      [{ value: "female", label: "Vrouw" }],
      initialValue: "female",
      notice:       "Deze inschrijving is alleen voor vrouwen.",
      locked:       true,
    };
  }
  return {
    options: [
      { value: "male",   label: "Man"   },
      { value: "female", label: "Vrouw" },
    ],
    initialValue: "",
    notice:       null,
    locked:       false,
  };
}

export default function RegistrationForm({
  type,
  sourceSlug,
  sourceTitle,
  targetGender,
  heading = "Inschrijven",
  intro,
  className,
}: RegistrationFormProps) {
  const genderConfig = resolveGenderConfig(targetGender);

  const [form,    setForm]    = useState<FormState>({
    ...initialState,
    gender: genderConfig.initialValue,
  });
  const [status,  setStatus]  = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    // Lichte client-side validatie — echte validatie zit in de API
    if (!form.name.trim() || !form.email.trim()) {
      setStatus("error");
      setMessage("Vul alstublieft uw naam en e-mailadres in.");
      return;
    }
    if (!form.gender) {
      setStatus("error");
      setMessage("Geslacht is verplicht.");
      return;
    }
    if (!form.consent) {
      setStatus("error");
      setMessage("U moet akkoord gaan met de verwerking van uw gegevens.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const resp = await fetch("/api/inschrijven", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type,
          source_slug: sourceSlug,
          name:    form.name.trim(),
          email:   form.email.trim(),
          gender:  form.gender,
          phone:   form.phone.trim() || undefined,
          age:     form.age ? Number(form.age) : undefined,
          notes:   form.notes.trim() || undefined,
          consent: form.consent,
        }),
      });

      const data = await resp.json().catch(() => ({} as Record<string, unknown>));

      if (!resp.ok) {
        setStatus("error");
        setMessage(
          (data as { error?: string }).error ||
          "Er ging iets mis. Probeer het later opnieuw."
        );
        return;
      }

      setStatus("success");
      setMessage("Bedankt voor uw inschrijving! We nemen zo snel mogelijk contact met u op.");
      setForm({ ...initialState, gender: genderConfig.initialValue });
    } catch {
      setStatus("error");
      setMessage("Er ging iets mis met de verbinding. Probeer het later opnieuw.");
    }
  }

  // Succes-state: vervang formulier door bevestiging
  if (status === "success") {
    return (
      <div
        className={cn(
          "p-6 bg-slate-mosque/10 border border-slate-mosque/20 rounded-2xl text-center",
          className
        )}
      >
        <h3 className="font-display text-xl text-ink mb-2">Inschrijving ontvangen</h3>
        <p className="font-body text-taupe-dark text-sm">{message}</p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-sand-200 bg-white px-4 py-2.5 " +
    "font-body text-base text-ink placeholder:text-taupe/60 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-mosque " +
    "focus-visible:border-slate-mosque transition-colors " +
    "disabled:bg-sand-100 disabled:cursor-not-allowed";

  const labelClass = "block font-body text-sm font-medium text-ink mb-1.5";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "p-6 sm:p-8 bg-white border border-sand-200 rounded-2xl shadow-sm",
        className
      )}
      noValidate
    >
      <h3 className="font-display text-xl sm:text-2xl text-ink mb-1">{heading}</h3>
      <p className="font-body text-sm text-taupe-dark mb-4">
        {intro || (
          <>
            U schrijft zich in voor: <strong>{sourceTitle}</strong>
          </>
        )}
      </p>

      {/* Doelgroep-banner — alleen voor male/female only */}
      {genderConfig.notice && (
        <div
          className="mb-6 p-3 rounded-lg bg-taupe/10 border border-taupe/20 font-body text-sm text-ink"
          role="note"
        >
          {genderConfig.notice}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="reg-name" className={labelClass}>
            Naam <span className="text-red-600" aria-hidden>*</span>
          </label>
          <input
            id="reg-name"
            type="text"
            required
            autoComplete="name"
            className={inputClass}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="reg-email" className={labelClass}>
            E-mailadres <span className="text-red-600" aria-hidden>*</span>
          </label>
          <input
            id="reg-email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="reg-phone" className={labelClass}>
            Telefoon
          </label>
          <input
            id="reg-phone"
            type="tel"
            autoComplete="tel"
            className={inputClass}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="reg-gender" className={labelClass}>
            Geslacht <span className="text-red-600" aria-hidden>*</span>
          </label>
          <select
            id="reg-gender"
            required
            disabled={genderConfig.locked}
            className={inputClass}
            value={form.gender}
            onChange={(e) => update("gender", e.target.value as FormState["gender"])}
          >
            {!genderConfig.locked && <option value="">— Maak een keuze —</option>}
            {genderConfig.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reg-age" className={labelClass}>
            Leeftijd
          </label>
          <input
            id="reg-age"
            type="number"
            min={1}
            max={120}
            inputMode="numeric"
            className={inputClass}
            value={form.age}
            onChange={(e) => update("age", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="reg-notes" className={labelClass}>
            Opmerkingen
          </label>
          <textarea
            id="reg-notes"
            rows={4}
            className={cn(inputClass, "resize-y")}
            placeholder="Vragen, dieetwensen, etc. (optioneel)"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required
              className="mt-1 w-4 h-4 rounded border-sand-200 text-slate-mosque focus:ring-slate-mosque"
              checked={form.consent}
              onChange={(e) => update("consent", e.target.checked)}
            />
            <span className="font-body text-sm text-taupe-dark leading-relaxed">
              Ik ga akkoord met de{" "}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-mosque underline hover:text-slate-dark"
              >
                privacyverklaring
              </a>
              .<span className="text-red-600" aria-hidden> *</span>
            </span>
          </label>
        </div>
      </div>

      {status === "error" && message && (
        <div
          className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-body text-sm"
          role="alert"
        >
          {message}
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <Button
          type="submit"
          variant="primary"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Bezig met versturen…" : "Inschrijving versturen"}
        </Button>
        <p className="font-body text-xs text-taupe-dark/80">
          Velden met <span className="text-red-600">*</span> zijn verplicht.
        </p>
      </div>
    </form>
  );
}
