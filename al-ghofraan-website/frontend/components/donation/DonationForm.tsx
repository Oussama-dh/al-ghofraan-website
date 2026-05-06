// components/donation/DonationForm.tsx
"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { DonationType } from "@/types/directus";

interface DonationFormProps {
  className?: string;
}

const PRESET_AMOUNTS = [5, 10, 25, 50, 100] as const;
const MIN_AMOUNT = 1;

export default function DonationForm({ className }: DonationFormProps) {
  const [type,         setType]         = useState<DonationType>("one_time");
  const [presetAmount, setPresetAmount] = useState<number | null>(25);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [donorName,    setDonorName]    = useState<string>("");
  const [donorEmail,   setDonorEmail]   = useState<string>("");
  const [message,      setMessage]      = useState<string>("");
  const [status,       setStatus]       = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");

  function selectPreset(amount: number) {
    setPresetAmount(amount);
    setCustomAmount("");
  }

  function selectCustom(value: string) {
    // Alleen cijfers + max 1 punt/komma
    const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
    setCustomAmount(cleaned);
    setPresetAmount(null);
  }

  /** Bedrag in eurocenten — null als ongeldig */
  function getAmountCents(): number | null {
    const euros = presetAmount !== null
      ? presetAmount
      : Number(customAmount);
    if (!Number.isFinite(euros) || euros < MIN_AMOUNT) return null;
    return Math.round(euros * 100);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("idle");
    setErrorMessage("");

    if (!donorEmail.trim()) {
      setStatus("error");
      setErrorMessage("Vul uw e-mailadres in.");
      return;
    }

    const amountCents = getAmountCents();
    if (amountCents === null) {
      setStatus("error");
      setErrorMessage(`Vul een bedrag van minimaal €${MIN_AMOUNT} in.`);
      return;
    }

    setStatus("submitting");

    try {
      const resp = await fetch("/api/doneren/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          type,
          amount_cents: amountCents,
          donor_name:   donorName.trim() || undefined,
          donor_email:  donorEmail.trim(),
          message:      message.trim() || undefined,
        }),
      });

      const data = await resp.json().catch(() => ({} as Record<string, unknown>));

      if (!resp.ok || !(data as { url?: string }).url) {
        setStatus("error");
        setErrorMessage(
          (data as { error?: string }).error ||
          "Er ging iets mis met de betaling. Probeer het later opnieuw."
        );
        return;
      }

      // Redirect naar Stripe Checkout
      window.location.href = (data as { url: string }).url;
    } catch {
      setStatus("error");
      setErrorMessage("Verbinding mislukt. Probeer het later opnieuw.");
    }
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
      {/* Type-toggle */}
      <fieldset className="mb-6">
        <legend className={labelClass}>Hoe vaak wilt u doneren?</legend>
        <div className="grid grid-cols-2 gap-2 p-1 bg-sand-100 rounded-xl">
          <button
            type="button"
            onClick={() => setType("one_time")}
            aria-pressed={type === "one_time"}
            className={cn(
              "py-2.5 rounded-lg font-body font-medium text-sm transition-all",
              type === "one_time"
                ? "bg-white text-slate-mosque shadow-sm"
                : "text-taupe-dark hover:text-ink"
            )}
          >
            Eenmalig
          </button>
          <button
            type="button"
            onClick={() => setType("monthly")}
            aria-pressed={type === "monthly"}
            className={cn(
              "py-2.5 rounded-lg font-body font-medium text-sm transition-all",
              type === "monthly"
                ? "bg-white text-slate-mosque shadow-sm"
                : "text-taupe-dark hover:text-ink"
            )}
          >
            Maandelijks
          </button>
        </div>
      </fieldset>

      {/* Bedrag */}
      <fieldset className="mb-6">
        <legend className={labelClass}>
          Kies een bedrag {type === "monthly" && <span className="text-taupe">(per maand)</span>}
        </legend>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
          {PRESET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => selectPreset(amt)}
              aria-pressed={presetAmount === amt}
              className={cn(
                "py-3 rounded-lg font-body font-medium border transition-all",
                presetAmount === amt
                  ? "bg-slate-mosque text-white border-slate-mosque"
                  : "bg-white text-ink border-sand-200 hover:border-slate-mosque"
              )}
            >
              €{amt}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="don-amount" className="sr-only">Eigen bedrag</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-taupe-dark">€</span>
            <input
              id="don-amount"
              type="text"
              inputMode="decimal"
              placeholder="Eigen bedrag"
              className={cn(inputClass, "pl-8")}
              value={customAmount}
              onChange={(e) => selectCustom(e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      {/* Persoonlijke gegevens */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="don-name" className={labelClass}>
            Naam <span className="text-taupe-dark/70 text-xs font-normal">(optioneel)</span>
          </label>
          <input
            id="don-name"
            type="text"
            autoComplete="name"
            className={inputClass}
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="don-email" className={labelClass}>
            E-mailadres <span className="text-red-600" aria-hidden>*</span>
          </label>
          <input
            id="don-email"
            type="email"
            required
            autoComplete="email"
            className={inputClass}
            value={donorEmail}
            onChange={(e) => setDonorEmail(e.target.value)}
          />
        </div>
      </div>

      <div className="mb-6">
        <label htmlFor="don-message" className={labelClass}>
          Bericht <span className="text-taupe-dark/70 text-xs font-normal">(optioneel)</span>
        </label>
        <textarea
          id="don-message"
          rows={3}
          className={cn(inputClass, "resize-y")}
          placeholder="Een persoonlijke notitie voor de DawahCommissie"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>

      {status === "error" && errorMessage && (
        <div
          className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-body text-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        className="w-full justify-center"
        disabled={status === "submitting"}
      >
        {status === "submitting"
          ? "Bezig met doorsturen…"
          : "Verder naar betaling"}
      </Button>

      <p className="mt-4 font-body text-xs text-taupe-dark/80 text-center leading-relaxed">
        U wordt doorgestuurd naar de beveiligde betaalomgeving van Stripe.<br />
        iDEAL en creditcard worden ondersteund. Geen kaartgegevens komen op deze site terecht.
      </p>
    </form>
  );
}
