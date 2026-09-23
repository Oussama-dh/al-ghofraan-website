"use client";

// components/registration/AdultRegistrationForm.tsx
//
// Inschrijfformulier volwassenenonderwijs (education_programs.audience =
// "adults"): voornaam, achternaam, telefoon, e-mail en leeftijd. Zelfde
// kaart, beheerbare teksten en foutafhandeling als QuranRegistrationForm
// (zie formStyles.ts); posts naar /api/onderwijs/volwassenen.
//
// Validatie: dezelfde functie als de server (lib/adultRegistration.ts).
// Fouten verschijnen na de eerste verzendpoging en verdwijnen live zodra
// ze zijn opgelost. Bij een mislukte verzending blijft de invoer staan.

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/analytics";
import {
  errorBannerClass,
  formCardClass,
  inputClass,
  inputErrorClass,
  labelClass,
  successCardClass,
} from "./formStyles";
import {
  ADULT_AGE_MAX,
  ADULT_AGE_MIN,
  ADULT_CONSENT_TEXT,
  validateAdultRegistration,
} from "@/lib/adultRegistration";
import { LIMITS, ageRangeText, type FieldErrors } from "@/lib/quranRegistration";

interface AdultRegistrationFormProps {
  /** Slug van het onderwijsprogramma (gaat mee naar de API en analytics). */
  sourceSlug: string;
  /** Titel van het programma — getoond in de standaard-introtekst. */
  sourceTitle: string;
  anchorId?: string;
  /** Minimum/maximum leeftijd in hele jaren (uit Directus); leeg = geen grens. */
  minAge?: number | null;
  maxAge?: number | null;
  /** Beheerbare teksten uit education_programs; leeg → standaardtekst. */
  contentTexts?: {
    intro_title?: string | null;
    intro_text?: string | null;
    button_text?: string | null;
    success_message?: string | null;
    extra_note?: string | null;
  } | null;
  className?: string;
}

interface FormState {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  age: string;
  consent: boolean;
  /** Honeypot — mensen laten dit leeg. */
  website: string;
}

const INITIAL: FormState = {
  first_name: "", last_name: "", phone: "", email: "", age: "", consent: false, website: "",
};

const FIELD_ORDER = ["first_name", "last_name", "phone", "email", "age", "consent"] as const;

function Required() {
  return <span className="text-red-600" aria-hidden> *</span>;
}

function ErrorText({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} className="mt-1.5 font-body text-sm text-red-700">
      {message}
    </p>
  );
}

function TextField({
  id, label, error, hint, inputProps,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        <Required />
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required
        {...inputProps}
        className={cn(inputClass, error && inputErrorClass)}
      />
      {hint && <p id={`${id}-hint`} className="mt-1 font-body text-xs text-taupe-dark/70">{hint}</p>}
      <ErrorText id={id} message={error} />
    </div>
  );
}

export default function AdultRegistrationForm({
  sourceSlug,
  sourceTitle,
  anchorId = "inschrijven",
  minAge = null,
  maxAge = null,
  contentTexts,
  className,
}: AdultRegistrationFormProps) {
  const text = useMemo(() => {
    const t = contentTexts ?? {};
    return {
      introTitle: (t.intro_title || "").trim() || "Inschrijven",
      introText: (t.intro_text || "").trim() || null,
      buttonText: (t.button_text || "").trim() || "Inschrijven",
      successText:
        (t.success_message || "").trim() ||
        `Djazaak Allaahoe khayran. Uw inschrijving voor ${sourceTitle} is succesvol ontvangen. Wij nemen contact met u op.`,
      extraNote: (t.extra_note || "").trim() || null,
    };
  }, [contentTexts, sourceTitle]);

  const [form, setForm] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState("");

  const inFlight = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const limits = useMemo(() => ({ minAge, maxAge }), [minAge, maxAge]);
  const ageRange = ageRangeText(limits);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setServerErrors((e) => {
      if (!(key in e)) return e;
      const rest = { ...e };
      delete rest[key as string];
      return rest;
    });
  }

  const clientErrors = useMemo<FieldErrors>(() => {
    const res = validateAdultRegistration(form, limits);
    return res.ok ? {} : res.errors;
  }, [form, limits]);

  const errors: FieldErrors = attempted ? { ...clientErrors, ...serverErrors } : serverErrors;
  const errorCount = Object.keys(errors).length;

  useEffect(() => {
    if (status === "success") {
      successRef.current?.focus();
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  function focusFirstError(errs: FieldErrors) {
    const first = FIELD_ORDER.find((k) => errs[k]);
    const el = first ? document.getElementById(first) : null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || status === "submitting") return;

    setAttempted(true);
    setBanner("");

    const local = validateAdultRegistration(form, limits);
    if (!local.ok) {
      setBanner("Controleer de gemarkeerde velden en probeer het opnieuw.");
      focusFirstError(local.errors);
      return;
    }

    inFlight.current = true;
    setStatus("submitting");
    setServerErrors({});

    try {
      const resp = await fetch("/api/onderwijs/volwassenen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, program_slug: sourceSlug }),
      });
      const data = (await resp.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: FieldErrors;
      };

      if (!resp.ok) {
        if (resp.status === 400 && data.fieldErrors && Object.keys(data.fieldErrors).length > 0) {
          setServerErrors(data.fieldErrors);
          setBanner(data.error || "Controleer de gemarkeerde velden en probeer het opnieuw.");
          focusFirstError(data.fieldErrors);
        } else {
          setBanner(data.error || "Er ging iets mis. Probeer het later opnieuw.");
          bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        setStatus("idle");
        return;
      }

      setForm(INITIAL);
      setAttempted(false);
      setStatus("success");
      trackEvent("activity_signup_complete", {
        activity_slug: sourceSlug,
        category:      "education",
      });
    } catch {
      setBanner("Er ging iets mis met de verbinding. Controleer uw internetverbinding en probeer het opnieuw. Uw gegevens zijn bewaard op deze pagina.");
      setStatus("idle");
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      inFlight.current = false;
    }
  }

  if (status === "success") {
    return (
      <div
        id={anchorId}
        ref={successRef}
        tabIndex={-1}
        role="status"
        className={cn(successCardClass, "focus:outline-none scroll-mt-24", className)}
      >
        <h3 className="font-display text-xl text-ink mb-2">Inschrijving ontvangen</h3>
        <p className="font-body text-taupe-dark text-sm whitespace-pre-line">{text.successText}</p>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form id={anchorId} onSubmit={handleSubmit} noValidate className={cn(formCardClass, className)}>
      {/* Honeypot: onzichtbaar voor mensen en schermlezers */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website (niet invullen)</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => set("website", e.target.value)}
        />
      </div>

      <h3 className="font-display text-xl sm:text-2xl text-ink mb-1">{text.introTitle}</h3>
      <p className="font-body text-sm text-taupe-dark mb-6 whitespace-pre-line">
        {text.introText || (
          <>
            U schrijft zich in voor: <strong>{sourceTitle}</strong>
          </>
        )}
      </p>

      <div className="space-y-4 mb-6">
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField
            id="first_name" label="Voornaam" error={errors.first_name}
            inputProps={{
              type: "text", autoComplete: "given-name", maxLength: LIMITS.nameMax,
              value: form.first_name, onChange: (e) => set("first_name", e.target.value),
            }}
          />
          <TextField
            id="last_name" label="Achternaam" error={errors.last_name}
            inputProps={{
              type: "text", autoComplete: "family-name", maxLength: LIMITS.nameMax,
              value: form.last_name, onChange: (e) => set("last_name", e.target.value),
            }}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <TextField
            id="phone" label="Telefoonnummer" error={errors.phone}
            hint="Bijvoorbeeld 06 12345678 of +31 6 12345678"
            inputProps={{
              type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 30,
              value: form.phone, onChange: (e) => set("phone", e.target.value),
            }}
          />
          <TextField
            id="email" label="E-mailadres" error={errors.email}
            inputProps={{
              type: "email", inputMode: "email", autoComplete: "email", maxLength: LIMITS.emailMax,
              value: form.email, onChange: (e) => set("email", e.target.value),
            }}
          />
        </div>
        <div className="sm:w-1/2 sm:pr-1.5">
          <TextField
            id="age" label="Leeftijd" error={errors.age}
            hint={ageRange ? `Dit programma is voor deelnemers van ${ageRange}.` : undefined}
            inputProps={{
              type: "number", inputMode: "numeric", min: ADULT_AGE_MIN, max: ADULT_AGE_MAX, step: 1,
              value: form.age, onChange: (e) => set("age", e.target.value),
            }}
          />
        </div>
      </div>

      <div className="space-y-3 mb-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            id="consent"
            name="consent"
            type="checkbox"
            checked={form.consent}
            onChange={(e) => set("consent", e.target.checked)}
            aria-required
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "consent-error" : undefined}
            className="mt-1 h-4 w-4 shrink-0 rounded border-sand-200 text-slate-mosque focus:ring-slate-mosque"
          />
          <span className="font-body text-sm text-taupe-dark leading-relaxed">
            {ADULT_CONSENT_TEXT}
            <Required />
          </span>
        </label>
        <p className="pl-7 font-body text-xs text-taupe-dark/80">
          Lees hoe wij met uw gegevens omgaan in onze{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-mosque underline hover:text-slate-dark"
          >
            privacyverklaring
          </a>
          .
        </p>
        <ErrorText id="consent" message={errors.consent} />
      </div>

      {text.extraNote && (
        <p className="mt-4 font-body text-xs text-taupe-dark/80 leading-relaxed">{text.extraNote}</p>
      )}

      <div ref={bannerRef}>
        {banner && (
          <div className={errorBannerClass} role="alert">
            {banner}
            {errorCount > 1 && attempted && (
              <span className="block mt-1 text-red-700/80">{errorCount} velden vragen uw aandacht.</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <Button type="submit" variant="primary" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Bezig met versturen…" : text.buttonText}
        </Button>
        <p className="font-body text-xs text-taupe-dark/80">
          Velden met <span className="text-red-600">*</span> zijn verplicht.
        </p>
      </div>
    </form>
  );
}
