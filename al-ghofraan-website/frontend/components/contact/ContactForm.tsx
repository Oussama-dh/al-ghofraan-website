// components/contact/ContactForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ContactSubject } from "@/types/directus";

interface FormState {
  name:    string;
  email:   string;
  phone:   string;
  subject: string;
  message: string;
  consent: boolean;
  /** Honeypot — moet leeg blijven; bots vullen dit waarschijnlijk wel in */
  website: string;
}

const initialState: FormState = {
  name:    "",
  email:   "",
  phone:   "",
  subject: "",
  message: "",
  consent: false,
  website: "",
};

interface ContactFormProps {
  className?: string;
  /** Onderwerpen uit Directus. Lege/ontbrekende lijst → fallback naar tekstveld. */
  subjects?: ContactSubject[];
}

export default function ContactForm({ className, subjects = [] }: ContactFormProps) {
  const [form,    setForm]    = useState<FormState>(initialState);
  const [status,  setStatus]  = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  // Beslissing: dropdown of vrije tekst?
  // - Lijst leeg of ontbreekt → val terug op tekstveld (geen lock-out)
  // - Anders → dropdown met "Maak een keuze" als placeholder
  const useDropdown = subjects.length > 0;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    if (!form.name.trim() || !form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setStatus("error");
      setMessage("Vul alstublieft alle verplichte velden in.");
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
      const resp = await fetch("/api/contact", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:    form.name.trim(),
          email:   form.email.trim(),
          phone:   form.phone.trim() || undefined,
          subject: form.subject.trim(),
          message: form.message.trim(),
          consent: form.consent,
          website: form.website, // honeypot — meestuur leeg
        }),
      });

      const data = await resp.json().catch(() => ({} as Record<string, unknown>));

      if (!resp.ok) {
        setStatus("error");
        setMessage((data as { error?: string }).error || "Er ging iets mis. Probeer het later opnieuw.");
        return;
      }

      setStatus("success");
      setMessage("Bedankt voor uw bericht! We nemen zo snel mogelijk contact met u op.");
      setForm(initialState);
    } catch {
      setStatus("error");
      setMessage("Verbinding mislukt. Probeer het later opnieuw.");
    }
  }

  if (status === "success") {
    return (
      <div className={cn("p-6 bg-slate-mosque/10 border border-slate-mosque/20 rounded-2xl text-center", className)}>
        <h3 className="font-display text-xl text-ink mb-2">Bericht verzonden</h3>
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
      className={cn("p-6 sm:p-8 bg-white border border-sand-200 rounded-2xl shadow-sm", className)}
      noValidate
    >
      <h3 className="font-display text-xl sm:text-2xl text-ink mb-1">Stuur ons een bericht</h3>
      <p className="font-body text-sm text-taupe-dark mb-6">
        We reageren meestal binnen enkele werkdagen.
      </p>

      {/* Honeypot — verborgen voor mensen, maar bots vullen 't wel in */}
      <div className="hidden" aria-hidden="true">
        <label htmlFor="contact-website">Website (laat leeg)</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => update("website", e.target.value)}
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            Naam <span className="text-red-600" aria-hidden>*</span>
          </label>
          <input
            id="contact-name" type="text" required autoComplete="name" className={inputClass}
            value={form.name} onChange={(e) => update("name", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            E-mailadres <span className="text-red-600" aria-hidden>*</span>
          </label>
          <input
            id="contact-email" type="email" required autoComplete="email" className={inputClass}
            value={form.email} onChange={(e) => update("email", e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="contact-phone" className={labelClass}>
            Telefoon
          </label>
          <input
            id="contact-phone" type="tel" autoComplete="tel" className={inputClass}
            value={form.phone} onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className={labelClass}>
            Onderwerp <span className="text-red-600" aria-hidden>*</span>
          </label>
          {useDropdown ? (
            <select
              id="contact-subject"
              required
              className={inputClass}
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
            >
              <option value="">Maak een keuze…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="contact-subject" type="text" required className={inputClass}
              value={form.subject} onChange={(e) => update("subject", e.target.value)}
            />
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="contact-message" className={labelClass}>
            Bericht <span className="text-red-600" aria-hidden>*</span>
          </label>
          <textarea
            id="contact-message" rows={5} required className={cn(inputClass, "resize-y")}
            value={form.message} onChange={(e) => update("message", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" required
              className="mt-1 w-4 h-4 rounded border-sand-200 text-slate-mosque focus:ring-slate-mosque"
              checked={form.consent} onChange={(e) => update("consent", e.target.checked)}
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
        <div className="mt-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-body text-sm" role="alert">
          {message}
        </div>
      )}

      <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:items-center">
        <Button type="submit" variant="primary" disabled={status === "submitting"}>
          {status === "submitting" ? "Bezig met versturen…" : "Bericht versturen"}
        </Button>
        <p className="font-body text-xs text-taupe-dark/80">
          Velden met <span className="text-red-600">*</span> zijn verplicht.
        </p>
      </div>
    </form>
  );
}
