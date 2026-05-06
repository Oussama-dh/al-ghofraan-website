// components/registration/RegistrationForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { RegistrationType } from "@/types/directus";

interface RegistrationFormProps {
  /** Type bron — bepaalt naar welke collectie geschreven wordt */
  type:        RegistrationType;
  /** Slug van de bron (activity of education_program) */
  sourceSlug:  string;
  /** Titel van de bron — wordt meegegeven voor weergave in admin */
  sourceTitle: string;
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
  gender:  "" | "m" | "f" | "other" | "unspecified";
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

export default function RegistrationForm({
  type,
  sourceSlug,
  sourceTitle,
  heading = "Inschrijven",
  intro,
  className,
}: RegistrationFormProps) {
  const [form,    setForm]    = useState<FormState>(initialState);
  const [status,  setStatus]  = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    // Lichte client-side validatie — echte validatie zit in de API
    if (!form.name.trim() || !form.email.trim() || !form.consent) {
      setStatus("error");
      setMessage("Vul alstublieft uw naam, e-mailadres in en accepteer het privacy-akkoord.");
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
          phone:   form.phone.trim() || undefined,
          age:     form.age ? Number(form.age) : undefined,
          gender:  form.gender || undefined,
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
      setForm(initialState);
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
    "focus-visible:border-slate-mosque transition-colors";

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
      <p className="font-body text-sm text-taupe-dark mb-6">
        {intro || (
          <>
            U schrijft zich in voor: <strong>{sourceTitle}</strong>
          </>
        )}
      </p>

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

        <div>
          <label htmlFor="reg-gender" className={labelClass}>
            Geslacht
          </label>
          <select
            id="reg-gender"
            className={inputClass}
            value={form.gender}
            onChange={(e) => update("gender", e.target.value as FormState["gender"])}
          >
            <option value="">— Niet opgeven —</option>
            <option value="m">Man</option>
            <option value="f">Vrouw</option>
            <option value="other">Anders</option>
          </select>
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
              Ik ga akkoord dat mijn gegevens worden verwerkt voor deze inschrijving
              door de DawahCommissie van moskee Al-Ghofraan.
              <span className="text-red-600" aria-hidden> *</span>
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
