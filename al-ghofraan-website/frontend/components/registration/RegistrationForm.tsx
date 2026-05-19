// components/registration/RegistrationForm.tsx
"use client";

import { useMemo, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type {
  Gender,
  RegistrationType,
  TargetGender,
} from "@/types/directus";

// ─── Props ─────────────────────────────────────────────────
interface RegistrationFormProps {
  /** "activity" → bestaande single-flow. "education" → parent + multi-student. */
  type: RegistrationType;
  /** Slug van de bron (activity of education_program). */
  sourceSlug: string;
  /** Titel van de bron — wordt meegegeven voor weergave in admin. */
  sourceTitle: string;
  /** Doelgroep op geslacht — male/female/mixed. */
  targetGender?: TargetGender | null;
  /** Optionele eigen titel boven het formulier. */
  heading?: string;
  /** Optionele inleidende tekst. */
  intro?: string;

  /**
   * Optionele beheerbare teksten uit Directus (education_programs / activities).
   * Lege strings worden behandeld als "niet gezet" — fallback naar defaults.
   */
  contentTexts?: {
    intro_title?: string | null;
    intro_text?: string | null;
    button_text?: string | null;
    success_message?: string | null;
    extra_note?: string | null;
  } | null;

  /**
   * Voorwaarden-link & label uit site_settings (alleen relevant voor
   * education-mode, maar mag ook bij activity worden meegegeven).
   * Wanneer leeg → checkbox krijgt default tekst zonder link.
   */
  termsUrl?: string | null;
  termsLabel?: string | null;

  /**
   * Onderwijs-flow toggles (delivery 4) — alleen relevant voor `type === "education"`.
   * Worden door de detailpagina afgeleid uit education_programs en kunnen
   * `undefined` zijn voor backwards compat met oude callers (defaults: true/true).
   *
   * - requireTermsAcceptance:
   *     true  → toont voorwaarden-checkbox, server-side ook verplicht
   *     false → checkbox verdwijnt en wordt niet meegestuurd
   * - allowMultipleStudents:
   *     true  → "+ Voeg nog een student toe"-knop zichtbaar, max 20
   *     false → knop verborgen, students-array beperkt tot 1
   */
  requireTermsAcceptance?: boolean;
  allowMultipleStudents?: boolean;

  /**
   * Delivery 19 — Leeftijd verplicht maken (alleen activity-mode).
   *
   *     true  → leeftijd-input krijgt `required` + label-asterisk +
   *             client-side validatie weigert lege waarde
   *     false → leeftijd blijft optioneel (bestaande gedrag)
   *
   * Voor education-mode wordt deze prop genegeerd: dat is een multi-student
   * flow waar leeftijd per student al z'n eigen optionele invoer heeft, en
   * waar `require_age` op `activities` semantisch niet van toepassing is.
   * De API gebruikt voor education zijn eigen flow-toggles.
   */
  requireAge?: boolean;

  className?: string;
  /** ID van de form-section voor anchor-links (#inschrijven). */
  anchorId?: string;

  /**
   * Delivery recurring — gekozen occurrence voor een terugkerende activiteit.
   * Alleen relevant voor `type === "activity"`. Bij gevuld wordt het meegestuurd
   * naar /api/inschrijven en getoond in de bevestigingsmails. Eenmalige
   * activiteiten laten deze prop ongedefinieerd.
   */
  occurrence?: {
    start: string;
    end:   string;
    label: string;
  } | null;
}

// ─── State types ───────────────────────────────────────────
interface ParentState {
  name: string;
  email: string;
  phone: string;
}

interface StudentState {
  /** Stabiele key voor React-list — niet naar API verstuurd. */
  _key: string;
  name: string;
  age: string;
  gender: "" | Gender;
  notes: string;
}

const DEFAULT_PARENT: ParentState = {
  name: "",
  email: "",
  phone: "",
};

function newStudent(initialGender: "" | Gender): StudentState {
  return {
    _key: `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    age: "",
    gender: initialGender,
    notes: "",
  };
}

// ─── Gender resolutie (zelfde logica als oude versie) ─────
function resolveGenderConfig(target: TargetGender | null | undefined): {
  options: Array<{ value: Gender; label: string }>;
  initialValue: "" | Gender;
  notice: string | null;
  locked: boolean;
} {
  if (target === "male") {
    return {
      options: [{ value: "male", label: "Man" }],
      initialValue: "male",
      notice: "Deze inschrijving is alleen voor mannen.",
      locked: true,
    };
  }
  if (target === "female") {
    return {
      options: [{ value: "female", label: "Vrouw" }],
      initialValue: "female",
      notice: "Deze inschrijving is alleen voor vrouwen.",
      locked: true,
    };
  }
  return {
    options: [
      { value: "male", label: "Man" },
      { value: "female", label: "Vrouw" },
    ],
    initialValue: "",
    notice: null,
    locked: false,
  };
}

// ─── Telefoon-helpers ──────────────────────────────────────
/** Strip alles wat geen cijfer is. */
function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

/** True als het genormaliseerde nummer exact 10 cijfers is. */
function isValidPhone10(input: string): boolean {
  return normalizePhone(input).length === 10;
}

// ─── Component ─────────────────────────────────────────────
export default function RegistrationForm({
  type,
  sourceSlug,
  sourceTitle,
  targetGender,
  heading,
  intro,
  contentTexts,
  termsUrl,
  termsLabel,
  requireTermsAcceptance = true,
  allowMultipleStudents  = true,
  requireAge             = false,
  className,
  anchorId = "inschrijven",
  occurrence,
}: RegistrationFormProps) {
  const isEducation = type === "education";
  const genderConfig = resolveGenderConfig(targetGender);

  // Toggles zijn alleen zinvol voor education-mode. Voor activity blijft
  // alles bij het oude (geen voorwaarden-checkbox, geen multi-student).
  const showTerms        = isEducation && requireTermsAcceptance;
  const showAddStudent   = isEducation && allowMultipleStudents;
  // Delivery 19 — leeftijd-verplichting is alleen actief in activity-mode.
  // Education-tak blijft per student optioneel (eigen flow, eigen API-tak).
  const ageRequired      = !isEducation && requireAge;

  // ─── Beheerbare teksten met fallback ─────────────────────
  const text = useMemo(() => {
    const t = contentTexts ?? {};
    return {
      introTitle: (t.intro_title || "").trim() || heading || "Inschrijven",
      introText: (t.intro_text || "").trim() || intro || null,
      buttonText: (t.button_text || "").trim() || (isEducation ? "Inschrijving versturen" : "Inschrijving versturen"),
      successText: (t.success_message || "").trim() ||
        (isEducation
          ? "Bedankt voor uw inschrijving! We nemen zo snel mogelijk contact met u op."
          : "Bedankt voor uw inschrijving! We nemen zo snel mogelijk contact met u op."),
      extraNote: (t.extra_note || "").trim() || null,
    };
  }, [contentTexts, heading, intro, isEducation]);

  // ─── Form state ──────────────────────────────────────────
  const [parent, setParent] = useState<ParentState>(DEFAULT_PARENT);
  const [students, setStudents] = useState<StudentState[]>([
    newStudent(genderConfig.initialValue),
  ]);
  const [consent, setConsent] = useState<boolean>(false);
  const [terms, setTerms] = useState<boolean>(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  function updateParent<K extends keyof ParentState>(key: K, value: ParentState[K]) {
    setParent((p) => ({ ...p, [key]: value }));
  }
  function updateStudent(idx: number, key: keyof StudentState, value: string) {
    setStudents((arr) => arr.map((s, i) => (i === idx ? { ...s, [key]: value } : s)));
  }
  function addStudent() {
    setStudents((arr) => [...arr, newStudent(genderConfig.initialValue)]);
  }
  function removeStudent(idx: number) {
    setStudents((arr) => (arr.length <= 1 ? arr : arr.filter((_, i) => i !== idx)));
  }

  // ─── Submit ──────────────────────────────────────────────
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    setMessage("");
    setStatus("idle");

    if (isEducation) {
      // Parent-validatie
      if (!parent.name.trim()) {
        return failWith("Vul de naam van de ouder/contactpersoon in.");
      }
      if (!parent.email.trim()) {
        return failWith("Vul het e-mailadres van de ouder/contactpersoon in.");
      }
      if (!parent.phone.trim()) {
        return failWith("Vul een telefoonnummer in.");
      }
      if (!isValidPhone10(parent.phone)) {
        return failWith("Telefoonnummer moet uit precies 10 cijfers bestaan.");
      }
      // Studenten-validatie
      if (students.length < 1) {
        return failWith("Voeg ten minste één kind/student toe.");
      }

      for (let i = 0; i < students.length; i += 1) {
        const s = students[i];

        if (!s || !s.name.trim()) {
          return failWith(`Vul de naam van student ${i + 1} in.`);
        }

        if (!s.gender) {
          return failWith(`Geef het geslacht op voor student ${i + 1}.`);
        }
      }

      if (!consent) {
        return failWith("U moet akkoord gaan met de privacyverklaring.");
      }

      if (showTerms && !terms) {
        return failWith("U moet akkoord gaan met de voorwaarden.");
      }
    } else {
      // Activity-modus: single student-flow (gedrag van vóór delivery 3)
      const s = students[0];
      if (!s.name.trim()) {
        return failWith("Vul alstublieft uw naam in.");
      }
      if (!parent.email.trim()) {
        return failWith("Vul alstublieft uw e-mailadres in.");
      }
      if (!s.gender) {
        return failWith("Geslacht is verplicht.");
      }
      // Delivery 19 — leeftijd verplicht wanneer `requireAge` aanstaat.
      // Wanneer wel gevuld: existing parser checkt 1-120; hier alleen
      // de aanwezigheid afdwingen. Server-side dubbele check in route.ts.
      if (ageRequired) {
        const ageVal = (s.age ?? "").trim();
        if (!ageVal) {
          return failWith("Leeftijd is verplicht voor deze activiteit.");
        }
      }
      // Telefoon optioneel bij activiteiten — maar als gevuld dan 10 cijfers
      if (parent.phone.trim() && !isValidPhone10(parent.phone)) {
        return failWith("Telefoonnummer moet uit precies 10 cijfers bestaan (of laat leeg).");
      }
      if (!consent) {
        return failWith("U moet akkoord gaan met de verwerking van uw gegevens.");
      }
    }

    setStatus("submitting");

    try {
      // Defensief: wanneer meerdere studenten niet zijn toegestaan,
      // sturen we max 1 student mee. De API valideert dit ook server-side.
      const studentsToSend = allowMultipleStudents ? students : students.slice(0, 1);

      const payload = isEducation
        ? {
          type,
          source_slug: sourceSlug,
          parent: {
            name: parent.name.trim(),
            email: parent.email.trim(),
            phone: normalizePhone(parent.phone),
          },
          students: studentsToSend.map((s) => ({
            name: s.name.trim(),
            age: s.age ? Number(s.age) : undefined,
            gender: s.gender,
            notes: s.notes.trim() || undefined,
          })),
          consent,
          // Alleen meesturen wanneer de checkbox aanwezig was. De API
          // controleert of het programma voorwaarden vereist en valideert
          // dit veld zelfstandig — frontend kan niet liegen over consent.
          terms_accepted: showTerms ? terms : undefined,
        }
        : {
          // Backwards-compatible payload voor activiteit-flow
          type,
          source_slug: sourceSlug,
          name: students[0].name.trim(),
          email: parent.email.trim(),
          phone: parent.phone.trim() ? normalizePhone(parent.phone) : undefined,
          age: students[0].age ? Number(students[0].age) : undefined,
          gender: students[0].gender,
          notes: students[0].notes.trim() || undefined,
          consent,
          // Delivery recurring — alleen meegestuurd wanneer caller een
          // occurrence selecteerde. Server normaliseert/valideert (en
          // weigert bij recurring activity zonder occurrence).
          ...(occurrence && {
            occurrence_start: occurrence.start,
            occurrence_end:   occurrence.end,
            occurrence_label: occurrence.label,
          }),
        };

      const resp = await fetch("/api/inschrijven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({} as Record<string, unknown>));

      if (!resp.ok) {
        return failWith(
          (data as { error?: string }).error ||
          "Er ging iets mis. Probeer het later opnieuw."
        );
      }

      setStatus("success");
      setMessage(text.successText);
      // Reset
      setParent(DEFAULT_PARENT);
      setStudents([newStudent(genderConfig.initialValue)]);
      setConsent(false);
      setTerms(false);
    } catch {
      failWith("Er ging iets mis met de verbinding. Probeer het later opnieuw.");
    }
  }

  function failWith(msg: string) {
    setStatus("error");
    setMessage(msg);
  }

  // ─── Succes-state ────────────────────────────────────────
  if (status === "success") {
    return (
      <div
        id={anchorId}
        className={cn(
          "p-6 bg-slate-mosque/10 border border-slate-mosque/20 rounded-2xl text-center",
          className,
        )}
      >
        <h3 className="font-display text-xl text-ink mb-2">Inschrijving ontvangen</h3>
        <p className="font-body text-taupe-dark text-sm whitespace-pre-line">{message}</p>
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

  // ─── Render ──────────────────────────────────────────────
  return (
    <form
      id={anchorId}
      onSubmit={handleSubmit}
      className={cn(
        "p-6 sm:p-8 bg-white border border-sand-200 rounded-2xl shadow-sm scroll-mt-24",
        className,
      )}
      noValidate
    >
      <h3 className="font-display text-xl sm:text-2xl text-ink mb-1">{text.introTitle}</h3>
      <p className="font-body text-sm text-taupe-dark mb-4 whitespace-pre-line">
        {text.introText || (
          <>
            U schrijft zich in voor: <strong>{sourceTitle}</strong>
          </>
        )}
      </p>

      {/* Doelgroep-banner */}
      {genderConfig.notice && (
        <div
          className="mb-6 p-3 rounded-lg bg-taupe/10 border border-taupe/20 font-body text-sm text-ink"
          role="note"
        >
          {genderConfig.notice}
        </div>
      )}

      {/* ─── EDUCATION-MODUS: parent-sectie + students-array ─── */}
      {isEducation ? (
        <>
          {/* Parent-sectie */}
          <fieldset className="mb-6">
            <legend className="font-body text-sm font-semibold text-ink mb-3 uppercase tracking-wider">
              Ouder / contactpersoon
            </legend>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="parent-name" className={labelClass}>
                  Naam <span className="text-red-600" aria-hidden>*</span>
                </label>
                <input
                  id="parent-name" type="text" required autoComplete="name"
                  className={inputClass}
                  value={parent.name}
                  onChange={(e) => updateParent("name", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="parent-email" className={labelClass}>
                  E-mailadres <span className="text-red-600" aria-hidden>*</span>
                </label>
                <input
                  id="parent-email" type="email" required autoComplete="email"
                  className={inputClass}
                  value={parent.email}
                  onChange={(e) => updateParent("email", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="parent-phone" className={labelClass}>
                  Telefoon <span className="text-red-600" aria-hidden>*</span>
                </label>
                <input
                  id="parent-phone" type="tel" required autoComplete="tel"
                  inputMode="numeric"
                  placeholder="0612345678"
                  className={inputClass}
                  value={parent.phone}
                  onChange={(e) => updateParent("phone", e.target.value)}
                />
                <p className="font-body text-xs text-taupe-dark/70 mt-1">
                  10 cijfers. Spaties en streepjes zijn toegestaan.
                </p>
              </div>
            </div>
          </fieldset>

          {/* Studenten-array */}
          <fieldset className="mb-6">
            <legend className="font-body text-sm font-semibold text-ink mb-3 uppercase tracking-wider">
              Kind(eren) / student(en)
            </legend>
            <div className="space-y-4">
              {students.map((s, idx) => (
                <div
                  key={s._key}
                  className="rounded-lg border border-sand-200 bg-sand-50/50 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-body text-sm font-medium text-ink">
                      Student {idx + 1}
                    </span>
                    {students.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStudent(idx)}
                        className="font-body text-xs text-taupe-dark hover:text-red-700 underline"
                      >
                        Verwijderen
                      </button>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Naam <span className="text-red-600" aria-hidden>*</span>
                      </label>
                      <input
                        type="text" required
                        className={inputClass}
                        value={s.name}
                        onChange={(e) => updateStudent(idx, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>
                        Geslacht <span className="text-red-600" aria-hidden>*</span>
                      </label>
                      <select
                        required disabled={genderConfig.locked}
                        className={inputClass}
                        value={s.gender}
                        onChange={(e) => updateStudent(idx, "gender", e.target.value)}
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
                      <label className={labelClass}>
                        Leeftijd
                      </label>
                      <input
                        type="number" min={1} max={120} inputMode="numeric"
                        className={inputClass}
                        value={s.age}
                        onChange={(e) => updateStudent(idx, "age", e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={labelClass}>
                        Opmerkingen
                      </label>
                      <textarea
                        rows={2}
                        className={cn(inputClass, "resize-y")}
                        placeholder="Allergieën, niveau, etc. (optioneel)"
                        value={s.notes}
                        onChange={(e) => updateStudent(idx, "notes", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {showAddStudent && (
              <button
                type="button"
                onClick={addStudent}
                className="mt-3 font-body text-sm text-slate-mosque hover:text-slate-dark underline underline-offset-2"
              >
                + Voeg nog een student toe
              </button>
            )}
          </fieldset>
        </>
      ) : (
        /* ─── ACTIVITY-MODUS: single student-flow ─── */
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="sm:col-span-2">
            <label className={labelClass}>
              Naam <span className="text-red-600" aria-hidden>*</span>
            </label>
            <input
              type="text" required autoComplete="name"
              className={inputClass}
              value={students[0].name}
              onChange={(e) => updateStudent(0, "name", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              E-mailadres <span className="text-red-600" aria-hidden>*</span>
            </label>
            <input
              type="email" required autoComplete="email"
              className={inputClass}
              value={parent.email}
              onChange={(e) => updateParent("email", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Telefoon
            </label>
            <input
              type="tel" autoComplete="tel" inputMode="numeric"
              placeholder="0612345678"
              className={inputClass}
              value={parent.phone}
              onChange={(e) => updateParent("phone", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>
              Geslacht <span className="text-red-600" aria-hidden>*</span>
            </label>
            <select
              required disabled={genderConfig.locked}
              className={inputClass}
              value={students[0].gender}
              onChange={(e) => updateStudent(0, "gender", e.target.value)}
            >
              {!genderConfig.locked && <option value="">— Maak een keuze —</option>}
              {genderConfig.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Leeftijd
              {ageRequired && <span className="text-red-600" aria-hidden> *</span>}
            </label>
            <input
              type="number" min={1} max={120} inputMode="numeric"
              required={ageRequired}
              aria-required={ageRequired || undefined}
              className={inputClass}
              value={students[0].age}
              onChange={(e) => updateStudent(0, "age", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Opmerkingen</label>
            <textarea
              rows={4}
              className={cn(inputClass, "resize-y")}
              placeholder="Vragen, dieetwensen, etc. (optioneel)"
              value={students[0].notes}
              onChange={(e) => updateStudent(0, "notes", e.target.value)}
            />
          </div>
        </div>
      )}

      {/* ─── Akkoorden ─────────────────────────────────────── */}
      <div className="space-y-3 mb-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox" required
            className="mt-1 w-4 h-4 rounded border-sand-200 text-slate-mosque focus:ring-slate-mosque"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
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

        {/* Voorwaarden-checkbox alleen tonen wanneer het programma ze vereist
            (showTerms = isEducation && requireTermsAcceptance). */}
        {showTerms && (
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" required
              className="mt-1 w-4 h-4 rounded border-sand-200 text-slate-mosque focus:ring-slate-mosque"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <span className="font-body text-sm text-taupe-dark leading-relaxed">
              {(termsLabel || "").trim() ||
                "Ik heb de voorwaarden van de organisatie gelezen en ga hiermee akkoord."}
              {termsUrl && (
                <>
                  {" "}
                  <a
                    href={termsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-mosque underline hover:text-slate-dark"
                  >
                    (lees voorwaarden)
                  </a>
                </>
              )}
              <span className="text-red-600" aria-hidden> *</span>
            </span>
          </label>
        )}
      </div>

      {text.extraNote && (
        <p className="mt-4 font-body text-xs text-taupe-dark/80 leading-relaxed">
          {text.extraNote}
        </p>
      )}

      {status === "error" && message && (
        <div
          className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-body text-sm"
          role="alert"
        >
          {message}
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <Button type="submit" variant="primary" disabled={status === "submitting"}>
          {status === "submitting" ? "Bezig met versturen…" : text.buttonText}
        </Button>
        <p className="font-body text-xs text-taupe-dark/80">
          Velden met <span className="text-red-600">*</span> zijn verplicht.
        </p>
      </div>
    </form>
  );
}
