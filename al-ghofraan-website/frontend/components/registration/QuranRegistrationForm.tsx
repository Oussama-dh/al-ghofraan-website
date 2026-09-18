"use client";

// components/registration/QuranRegistrationForm.tsx
//
// Inschrijfformulier Koranonderwijs (/onderwijs/inschrijven).
// Eén pagina met genummerde secties (cards), in dezelfde stijl als
// RegistrationForm/ContactForm: inputClass/labelClass, rood sterretje
// voor verplicht, <Button variant="primary">, foutkaart met role="alert".
//
// Validatie: dezelfde functie als de server (lib/quranRegistration.ts) —
// de server blijft de autoriteit. Fouten verschijnen inline na de eerste
// verzendpoging en verdwijnen live zodra ze zijn opgelost.
// Bij een mislukte verzending blijft ALLE invoer behouden.

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  CHILD_GENDER_OPTIONS,
  CONSENT_TEXT,
  SPECIAL_CONSIDERATIONS_HINT,
  INVOLVED_GUARDIANS_OPTIONS,
  LEVELS,
  LEVEL_EXPLANATION,
  LIMITS,
  PAYMENT_FREQUENCY_OPTIONS,
  RELATION_OPTIONS,
  minBirthDateIso,
  todayIsoAmsterdam,
  validateQuranRegistration,
  type FieldErrors,
  type Option,
} from "@/lib/quranRegistration";

// ─── State ───────────────────────────────────────────────────

interface FormState {
  child_first_name: string;
  child_last_name: string;
  child_birth_date: string;
  child_gender: string;

  involved_guardians: string;
  involved_guardians_other: string;

  contact_1_name: string;
  contact_1_relation: string;
  contact_1_relation_other: string;
  contact_1_phone: string;
  contact_1_email: string;

  secondary_contact_absent: boolean;
  secondary_contact_name: string;
  secondary_contact_relation: string;
  secondary_contact_relation_other: string;
  secondary_contact_phone: string;
  secondary_contact_email: string;

  reading_level: string;
  reading_notes: string;
  writing_level: string;
  writing_notes: string;

  /** "" = nog niet gekozen */
  special_considerations: "" | "yes" | "no";
  special_considerations_notes: string;

  payment_frequency: string;
  additional_notes: string;
  consent: boolean;

  /** Honeypot — mensen laten dit leeg. */
  website: string;
}

const INITIAL: FormState = {
  child_first_name: "",
  child_last_name: "",
  child_birth_date: "",
  child_gender: "",
  involved_guardians: "",
  involved_guardians_other: "",
  contact_1_name: "",
  contact_1_relation: "",
  contact_1_relation_other: "",
  contact_1_phone: "",
  contact_1_email: "",
  secondary_contact_absent: false,
  secondary_contact_name: "",
  secondary_contact_relation: "",
  secondary_contact_relation_other: "",
  secondary_contact_phone: "",
  secondary_contact_email: "",
  reading_level: "",
  reading_notes: "",
  writing_level: "",
  writing_notes: "",
  special_considerations: "",
  special_considerations_notes: "",
  payment_frequency: "",
  additional_notes: "",
  consent: false,
  website: "",
};

/** Volgorde waarin fouten voorkomen in het formulier (voor focus op eerste fout). */
const FIELD_ORDER = [
  "child_first_name", "child_last_name", "child_birth_date", "child_gender",
  "involved_guardians", "involved_guardians_other",
  "contact_1_name", "contact_1_relation", "contact_1_relation_other",
  "contact_1_phone", "contact_1_email",
  "secondary_contact_name", "secondary_contact_relation", "secondary_contact_relation_other",
  "secondary_contact_phone", "secondary_contact_email",
  "reading_level", "reading_notes", "writing_level", "writing_notes",
  "special_considerations", "special_considerations_notes",
  "payment_frequency", "additional_notes", "consent",
];

function toPayload(s: FormState) {
  return {
    ...s,
    special_considerations:
      s.special_considerations === "yes" ? true : s.special_considerations === "no" ? false : null,
  };
}

// ─── Stijl (zelfde klassen als RegistrationForm) ─────────────

const inputClass =
  "w-full rounded-lg border border-sand-200 bg-white px-4 py-2.5 " +
  "font-body text-base text-ink placeholder:text-taupe/60 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-mosque " +
  "focus-visible:border-slate-mosque transition-colors " +
  "disabled:bg-sand-100 disabled:cursor-not-allowed";
const inputErrorClass = "border-red-400 focus-visible:ring-red-500 focus-visible:border-red-500";
const labelClass = "block font-body text-sm font-medium text-ink mb-1.5";

const SUCCESS_TITLE = "Inschrijving ontvangen";
const SUCCESS_TEXT =
  "Djazaak Allaahoe khayran. De inschrijving is succesvol ontvangen. Wij nemen contact met u op zodra de inschrijving is beoordeeld.";

// ─── Kleine presentatiecomponenten (buiten de hoofdcomponent) ─

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

function Section({
  number,
  title,
  description,
  children,
}: {
  number: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const headingId = `sectie-${number}`;
  return (
    <section
      aria-labelledby={headingId}
      className="p-5 sm:p-8 bg-white border border-sand-200 rounded-2xl shadow-sm"
    >
      <h2 id={headingId} className="font-display text-xl sm:text-2xl text-ink flex items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-mosque text-white font-body text-sm font-semibold"
        >
          {number}
        </span>
        {title}
      </h2>
      {description && (
        <p className="mt-2 font-body text-sm text-taupe-dark">{description}</p>
      )}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

/** Tekst/e-mail/tel/datum-veld met label en inline foutmelding. */
function TextField({
  id, label, required, error, hint, className, inputProps,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && <Required />}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        {...inputProps}
        className={cn(inputClass, error && inputErrorClass)}
      />
      {hint && <p id={`${id}-hint`} className="mt-1 font-body text-xs text-taupe-dark/70">{hint}</p>}
      <ErrorText id={id} message={error} />
    </div>
  );
}

/** Radiogroep als klikbare kaarten (touch-vriendelijk). */
function RadioCards<V extends string>({
  id, legend, required, options, value, onChange, error, hint, columns = 2,
}: {
  id: string;
  legend: string;
  required?: boolean;
  options: readonly Option<V>[];
  value: string;
  onChange: (v: V) => void;
  error?: string;
  hint?: string;
  columns?: 2 | 3 | 4;
}) {
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  const cols =
    columns === 4 ? "sm:grid-cols-4" : columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <fieldset id={id} tabIndex={-1} aria-describedby={describedBy} className="focus:outline-none">
      <legend className={labelClass}>
        {legend}
        {required && <Required />}
      </legend>
      {hint && <p id={`${id}-hint`} className="-mt-1 mb-2 font-body text-sm text-taupe-dark">{hint}</p>}
      <div className={cn("grid grid-cols-1 gap-2", cols)}>
        {options.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input
              type="radio"
              name={id}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex min-h-[44px] items-center rounded-lg border bg-white px-4 py-2.5 font-body text-base text-ink",
                "transition-colors hover:border-slate-mosque/60",
                "peer-checked:border-slate-mosque peer-checked:bg-slate-mosque/10 peer-checked:font-medium",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-slate-mosque",
                error ? "border-red-400" : "border-sand-200",
              )}
            >
              {o.label}
            </span>
          </label>
        ))}
      </div>
      <ErrorText id={id} message={error} />
    </fieldset>
  );
}

/** Schaal 1 t/m 10 als selecteerbare knoppen. */
function LevelPicker({
  id, legend, value, onChange, error,
}: {
  id: string;
  legend: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-describedby={error ? `${id}-error` : undefined}
      className="focus:outline-none"
    >
      <legend className={labelClass}>
        {legend}
        <Required />
      </legend>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {LEVELS.map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name={id}
              value={n}
              checked={value === String(n)}
              onChange={() => onChange(String(n))}
              className="peer sr-only"
            />
            <span
              className={cn(
                "flex h-11 items-center justify-center rounded-lg border bg-white font-body text-base text-ink",
                "transition-colors hover:border-slate-mosque/60",
                "peer-checked:border-slate-mosque peer-checked:bg-slate-mosque peer-checked:text-white peer-checked:font-semibold",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-slate-mosque peer-focus-visible:ring-offset-1",
                error ? "border-red-400" : "border-sand-200",
              )}
            >
              {n}
            </span>
          </label>
        ))}
      </div>
      <p className="mt-2 font-body text-sm text-taupe-dark">{LEVEL_EXPLANATION}</p>
      <ErrorText id={id} message={error} />
    </fieldset>
  );
}

/** Optioneel of verplicht meerregelig tekstveld met label, teller en foutmelding. */
function NotesField({
  id, label, required, error, hint, placeholder, max, value, onChange, rows = 3,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  placeholder?: string;
  max: number;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? <Required /> : <span className="ml-1 font-normal text-taupe-dark/70">(optioneel)</span>}
      </label>
      {hint && <div id={`${id}-hint`} className="mb-2 font-body text-sm text-taupe-dark space-y-1">{hint}</div>}
      <textarea
        id={id}
        name={id}
        rows={rows}
        maxLength={max}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(inputClass, "resize-y", error && inputErrorClass)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="mt-1 text-right font-body text-xs text-taupe-dark/60" aria-hidden>
        {value.length}/{max}
      </p>
      <ErrorText id={id} message={error} />
    </div>
  );
}

// ─── Hoofdcomponent ──────────────────────────────────────────

export default function QuranRegistrationForm({ className }: { className?: string }) {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string>("");

  // Synchrone guard tegen dubbel verzenden (state-updates zijn asynchroon).
  const inFlight = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => todayIsoAmsterdam(), []);
  const minBirth = useMemo(() => minBirthDateIso(), []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    // Een verse wijziging maakt oude serverfouten voor dat veld ongeldig.
    setServerErrors((e) => {
      if (!(key in e)) return e;
      const rest = { ...e };
      delete rest[key];
      return rest;
    });
  }

  const clientErrors = useMemo<FieldErrors>(() => {
    const res = validateQuranRegistration(toPayload(form));
    return res.ok ? {} : res.errors;
  }, [form]);

  const errors: FieldErrors = attempted ? { ...clientErrors, ...serverErrors } : serverErrors;
  const errorCount = Object.keys(errors).length;

  // Scroll naar de succesmelding
  useEffect(() => {
    if (status === "success") {
      successRef.current?.focus();
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  function focusFirstError(errs: FieldErrors) {
    const first = FIELD_ORDER.find((k) => errs[k]);
    if (!first) return;
    const el = document.getElementById(first);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      (el as HTMLElement).focus({ preventScroll: true });
    }
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current || status === "submitting") return; // dubbel verzenden voorkomen

    setAttempted(true);
    setBanner("");

    const local = validateQuranRegistration(toPayload(form));
    if (!local.ok) {
      setBanner("Controleer de gemarkeerde velden en probeer het opnieuw.");
      focusFirstError(local.errors);
      return;
    }

    inFlight.current = true;
    setStatus("submitting");
    setServerErrors({});

    try {
      const resp = await fetch("/api/onderwijs/inschrijven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
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
        setStatus("idle"); // formulier blijft ingevuld
        return;
      }

      setForm(INITIAL);
      setAttempted(false);
      setStatus("success");
    } catch {
      setBanner("Er ging iets mis met de verbinding. Controleer uw internetverbinding en probeer het opnieuw. Uw gegevens zijn bewaard op deze pagina.");
      setStatus("idle");
      bannerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    } finally {
      inFlight.current = false;
    }
  }

  // ─── Succes ────────────────────────────────────────────────
  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className={cn(
          "p-6 sm:p-8 bg-slate-mosque/10 border border-slate-mosque/20 rounded-2xl text-center focus:outline-none scroll-mt-24",
          className,
        )}
      >
        <h2 className="font-display text-2xl text-ink mb-2">{SUCCESS_TITLE}</h2>
        <p className="font-body text-taupe-dark text-base">{SUCCESS_TEXT}</p>
        <div className="mt-6">
          <Button href="/onderwijs" variant="outline">Terug naar onderwijs</Button>
        </div>
      </div>
    );
  }

  const submitting = status === "submitting";
  const showSecond = !form.secondary_contact_absent;

  // ─── Formulier ─────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} noValidate className={cn("space-y-6", className)}>
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

      {/* ── 1. Gegevens kind ── */}
      <Section number={1} title="Gegevens kind">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField
            id="child_first_name" label="Voornaam" required error={errors.child_first_name}
            inputProps={{
              type: "text", autoComplete: "off", maxLength: LIMITS.nameMax,
              value: form.child_first_name,
              onChange: (e) => set("child_first_name", e.target.value),
            }}
          />
          <TextField
            id="child_last_name" label="Achternaam" required error={errors.child_last_name}
            inputProps={{
              type: "text", autoComplete: "off", maxLength: LIMITS.nameMax,
              value: form.child_last_name,
              onChange: (e) => set("child_last_name", e.target.value),
            }}
          />
          <TextField
            id="child_birth_date" label="Geboortedatum" required error={errors.child_birth_date}
            className="sm:col-span-1"
            inputProps={{
              type: "date", min: minBirth, max: today, autoComplete: "off",
              value: form.child_birth_date,
              onChange: (e) => set("child_birth_date", e.target.value),
              suppressHydrationWarning: true,
            }}
          />
        </div>
        <RadioCards
          id="child_gender" legend="Geslacht" required options={CHILD_GENDER_OPTIONS}
          value={form.child_gender} onChange={(v) => set("child_gender", v)}
          error={errors.child_gender}
        />
      </Section>

      {/* ── 2. Ouder(s) / verzorger(s) ── */}
      <Section number={2} title="Ouder(s) / verzorger(s)">
        <RadioCards
          id="involved_guardians"
          legend="Welke ouder(s) of verzorger(s) zijn betrokken bij de opvoeding en het onderwijs van het kind?"
          required
          options={INVOLVED_GUARDIANS_OPTIONS}
          value={form.involved_guardians}
          onChange={(v) => set("involved_guardians", v)}
          error={errors.involved_guardians}
          hint="Deze informatie helpt ons om te weten met wie wij kunnen communiceren over het onderwijs en de ontwikkeling van uw kind."
          columns={3}
        />
        {form.involved_guardians === "other" && (
          <TextField
            id="involved_guardians_other" label="Namelijk:" required error={errors.involved_guardians_other}
            inputProps={{
              type: "text", autoComplete: "off", maxLength: LIMITS.otherMax,
              value: form.involved_guardians_other,
              onChange: (e) => set("involved_guardians_other", e.target.value),
            }}
          />
        )}
      </Section>

      {/* ── 3. Contactgegevens ── */}
      <Section
        number={3}
        title="Contactgegevens"
        description="Wij nemen contact op met de eerste contactpersoon. Een tweede contactpersoon is optioneel."
      >
        <div className="rounded-xl border border-sand-200 bg-sand-50/50 p-4 sm:p-5 space-y-5">
          <h3 className="font-body text-sm font-semibold uppercase tracking-wider text-ink">
            Eerste contactpersoon
          </h3>
          <TextField
            id="contact_1_name" label="Naam" required error={errors.contact_1_name}
            inputProps={{
              type: "text", autoComplete: "name", maxLength: LIMITS.nameMax,
              value: form.contact_1_name,
              onChange: (e) => set("contact_1_name", e.target.value),
            }}
          />
          <RadioCards
            id="contact_1_relation" legend="Relatie tot het kind" required options={RELATION_OPTIONS}
            value={form.contact_1_relation} onChange={(v) => set("contact_1_relation", v)}
            error={errors.contact_1_relation} columns={4}
          />
          {form.contact_1_relation === "other" && (
            <TextField
              id="contact_1_relation_other" label="Welke relatie?" required error={errors.contact_1_relation_other}
              inputProps={{
                type: "text", autoComplete: "off", maxLength: LIMITS.otherMax,
                value: form.contact_1_relation_other,
                onChange: (e) => set("contact_1_relation_other", e.target.value),
              }}
            />
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id="contact_1_phone" label="Telefoonnummer" required error={errors.contact_1_phone}
              hint="Bijvoorbeeld 06 12345678 of +31 6 12345678"
              inputProps={{
                type: "tel", inputMode: "tel", autoComplete: "tel", maxLength: 30,
                value: form.contact_1_phone,
                onChange: (e) => set("contact_1_phone", e.target.value),
              }}
            />
            <TextField
              id="contact_1_email" label="E-mailadres" required error={errors.contact_1_email}
              inputProps={{
                type: "email", inputMode: "email", autoComplete: "email", maxLength: LIMITS.emailMax,
                value: form.contact_1_email,
                onChange: (e) => set("contact_1_email", e.target.value),
              }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-sand-200 bg-sand-50/50 p-4 sm:p-5 space-y-5">
          <h3 className="font-body text-sm font-semibold uppercase tracking-wider text-ink">
            Tweede contactpersoon
          </h3>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.secondary_contact_absent}
              onChange={(e) => set("secondary_contact_absent", e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-sand-200 text-slate-mosque focus:ring-slate-mosque"
            />
            <span className="font-body text-sm text-ink leading-relaxed">
              Er is geen tweede contactpersoon
            </span>
          </label>

          {showSecond && (
            <div className="space-y-5">
              <TextField
                id="secondary_contact_name" label="Naam" error={errors.secondary_contact_name}
                inputProps={{
                  type: "text", autoComplete: "off", maxLength: LIMITS.nameMax,
                  value: form.secondary_contact_name,
                  onChange: (e) => set("secondary_contact_name", e.target.value),
                }}
              />
              <RadioCards
                id="secondary_contact_relation" legend="Relatie tot het kind" options={RELATION_OPTIONS}
                value={form.secondary_contact_relation} onChange={(v) => set("secondary_contact_relation", v)}
                error={errors.secondary_contact_relation} columns={4}
              />
              {form.secondary_contact_relation === "other" && (
                <TextField
                  id="secondary_contact_relation_other" label="Welke relatie?" error={errors.secondary_contact_relation_other}
                  inputProps={{
                    type: "text", autoComplete: "off", maxLength: LIMITS.otherMax,
                    value: form.secondary_contact_relation_other,
                    onChange: (e) => set("secondary_contact_relation_other", e.target.value),
                  }}
                />
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  id="secondary_contact_phone" label="Telefoonnummer" error={errors.secondary_contact_phone}
                  hint="Bijvoorbeeld 06 12345678 of +31 6 12345678"
                  inputProps={{
                    type: "tel", inputMode: "tel", autoComplete: "off", maxLength: 30,
                    value: form.secondary_contact_phone,
                    onChange: (e) => set("secondary_contact_phone", e.target.value),
                  }}
                />
                <TextField
                  id="secondary_contact_email" label="E-mailadres" error={errors.secondary_contact_email}
                  inputProps={{
                    type: "email", inputMode: "email", autoComplete: "off", maxLength: LIMITS.emailMax,
                    value: form.secondary_contact_email,
                    onChange: (e) => set("secondary_contact_email", e.target.value),
                  }}
                />
              </div>
              <p className="font-body text-xs text-taupe-dark/80">
                Laat leeg als er geen tweede contactpersoon is. Vult u één veld in, dan zijn alle
                velden van de tweede contactpersoon nodig.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* ── 4. Niveau Arabisch ── */}
      <Section number={4} title="Niveau Arabisch">
        <div className="space-y-4">
          <LevelPicker
            id="reading_level"
            legend="Hoe beoordeelt u het huidige leesniveau van uw kind in het Arabisch?"
            value={form.reading_level}
            onChange={(v) => set("reading_level", v)}
            error={errors.reading_level}
          />
          <NotesField
            id="reading_notes"
            label="Eventuele toelichting"
            placeholder="Bijvoorbeeld: kent alleen losse letters, kan al woorden lezen, leest uit de Qur'an."
            max={LIMITS.levelNotesMax}
            value={form.reading_notes}
            onChange={(v) => set("reading_notes", v)}
            error={errors.reading_notes}
          />
        </div>
        <div className="space-y-4">
          <LevelPicker
            id="writing_level"
            legend="Hoe beoordeelt u het huidige schrijfniveau van uw kind in het Arabisch?"
            value={form.writing_level}
            onChange={(v) => set("writing_level", v)}
            error={errors.writing_level}
          />
          <NotesField
            id="writing_notes"
            label="Eventuele toelichting"
            max={LIMITS.levelNotesMax}
            value={form.writing_notes}
            onChange={(v) => set("writing_notes", v)}
            error={errors.writing_notes}
          />
        </div>
      </Section>

      {/* ── 5. Bijzonderheden ── */}
      <Section number={5} title="Bijzonderheden">
        <RadioCards
          id="special_considerations"
          legend="Zijn er bijzonderheden waar wij tijdens de lessen rekening mee moeten houden?"
          required
          options={[
            { value: "no", label: "Nee" },
            { value: "yes", label: "Ja" },
          ]}
          value={form.special_considerations}
          onChange={(v) => set("special_considerations", v)}
          error={errors.special_considerations}
        />
        {form.special_considerations === "yes" && (
          <NotesField
            id="special_considerations_notes"
            label="Toelichting"
            required
            rows={4}
            max={LIMITS.notesMax}
            value={form.special_considerations_notes}
            onChange={(v) => set("special_considerations_notes", v)}
            error={errors.special_considerations_notes}
            hint={
              <>
                <p>{SPECIAL_CONSIDERATIONS_HINT}</p>
                <p>
                  Vul alleen informatie in die relevant is voor de begeleiding tijdens het onderwijs.
                  Diagnoses of medische gegevens die daarvoor niet nodig zijn hoeft u niet te vermelden.
                </p>
              </>
            }
          />
        )}
      </Section>

      {/* ── 6. Betaling ── */}
      <Section number={6} title="Betaling">
        <RadioCards
          id="payment_frequency"
          legend="Welke betalingsperiode heeft uw voorkeur?"
          required
          options={PAYMENT_FREQUENCY_OPTIONS}
          value={form.payment_frequency}
          onChange={(v) => set("payment_frequency", v)}
          error={errors.payment_frequency}
          columns={2}
        />
      </Section>

      {/* ── 7. Afronding ── */}
      <Section number={7} title="Afronding">
        <NotesField
          id="additional_notes"
          label="Heeft u nog vragen, opmerkingen of informatie die voor ons belangrijk kan zijn?"
          max={LIMITS.additionalNotesMax}
          value={form.additional_notes}
          onChange={(v) => set("additional_notes", v)}
          error={errors.additional_notes}
        />

        <div>
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
              {CONSENT_TEXT}
              <Required />
            </span>
          </label>
          <p className="mt-2 pl-7 font-body text-xs text-taupe-dark/80">
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

        <div ref={bannerRef}>
          {banner && (
            <div
              className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-body text-sm"
              role="alert"
            >
              {banner}
              {errorCount > 1 && attempted && (
                <span className="block mt-1 text-red-700/80">
                  {errorCount} velden vragen uw aandacht.
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Button type="submit" variant="primary" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? "Bezig met versturen…" : "Inschrijving versturen"}
          </Button>
          <p className="font-body text-xs text-taupe-dark/80">
            Velden met <span className="text-red-600">*</span> zijn verplicht.
          </p>
        </div>
      </Section>
    </form>
  );
}
