// components/donation/DonationForm.tsx
"use client";

import { useMemo, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { DonationCampaign, DonationType } from "@/types/directus";

interface DonationFormProps {
  /** Campagnes uit Directus (status=published, met allow_one_time of allow_monthly). */
  campaigns?: DonationCampaign[];
  className?: string;
}

const DEFAULT_PRESET_AMOUNTS = [5, 10, 25, 50, 100] as const;
const DEFAULT_AMOUNT          = 25;
const MIN_AMOUNT              = 1;

const ALGEMEEN_OPTION: DonationCampaign = {
  id:               0, // sentinel — 0 = geen campagne
  status:           "published",
  title:            "Algemene donatie",
  slug:             "algemeen",
  description:      null,
  image:            null,
  goal_amount:      null,
  goal_amount_display: null,
  allow_one_time:   true,
  allow_monthly:    true,
  suggested_amounts: null,
  default_amount:   null,
  featured:         false,
  sort:             0,
  created_at:       null,
};

export default function DonationForm({ campaigns = [], className }: DonationFormProps) {
  // Algemene donatie altijd als eerste optie
  const allOptions: DonationCampaign[] = useMemo(
    () => [ALGEMEEN_OPTION, ...campaigns],
    [campaigns]
  );

  const [campaignId, setCampaignId] = useState<number>(ALGEMEEN_OPTION.id);

  const selectedCampaign = useMemo(
    () => allOptions.find((c) => c.id === campaignId) ?? ALGEMEEN_OPTION,
    [allOptions, campaignId]
  );

  // Welke type-opties zijn beschikbaar voor deze campagne?
  const typeOptions = useMemo(() => {
    const opts: DonationType[] = [];
    if (selectedCampaign.allow_one_time) opts.push("one_time");
    if (selectedCampaign.allow_monthly)  opts.push("monthly");
    return opts.length > 0 ? opts : (["one_time"] as DonationType[]);
  }, [selectedCampaign]);

  const [type, setType] = useState<DonationType>("one_time");

  // Als de campagne wisselt en het huidige type niet meer kan, val terug
  if (!typeOptions.includes(type)) {
    // Side effect tijdens render is normaal in React voor afgeleide state correctie
    setTimeout(() => setType(typeOptions[0]), 0);
  }

  // Welke preset bedragen tonen we?
  const presetAmounts = useMemo<number[]>(() => {
    const list = selectedCampaign.suggested_amounts;
    if (Array.isArray(list) && list.length > 0) {
      return list.filter((n) => Number.isFinite(n) && n >= MIN_AMOUNT);
    }
    return [...DEFAULT_PRESET_AMOUNTS];
  }, [selectedCampaign]);

  // Voorgeselecteerd bedrag
  const initialAmount = useMemo<number>(() => {
    if (selectedCampaign.default_amount && Number.isFinite(selectedCampaign.default_amount)) {
      return selectedCampaign.default_amount;
    }
    if (presetAmounts.includes(DEFAULT_AMOUNT)) return DEFAULT_AMOUNT;
    return presetAmounts[0] ?? DEFAULT_AMOUNT;
  }, [selectedCampaign, presetAmounts]);

  const [presetAmount, setPresetAmount] = useState<number | null>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>("");

  // Wanneer campagne wisselt: reset preset naar nieuwe initialAmount
  if (presetAmount !== null && !presetAmounts.includes(presetAmount) && customAmount === "") {
    setTimeout(() => setPresetAmount(initialAmount), 0);
  }

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
    const cleaned = value.replace(/[^\d.,]/g, "").replace(",", ".");
    setCustomAmount(cleaned);
    setPresetAmount(null);
  }

  function getAmountCents(): number | null {
    const euros = presetAmount !== null ? presetAmount : Number(customAmount);
    if (!Number.isFinite(euros) || euros < MIN_AMOUNT) return null;
    return Math.round(euros * 100);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;

    setStatus("idle");
    setErrorMessage("");

    if (!donorName.trim()) {
      setStatus("error");
      setErrorMessage("Vul uw naam in.");
      return;
    }
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
          amount_cents:  amountCents,
          donor_name:    donorName.trim(),
          donor_email:   donorEmail.trim(),
          message:       message.trim() || undefined,
          campaign_slug: campaignId === ALGEMEEN_OPTION.id ? undefined : selectedCampaign.slug,
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

  const showTypeToggle = typeOptions.length > 1;

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "p-6 sm:p-8 bg-white border border-sand-200 rounded-2xl shadow-sm",
        className
      )}
      noValidate
    >
      {/* Donatiedoel — alleen tonen als er campagnes zijn */}
      {campaigns.length > 0 && (
        <fieldset className="mb-6">
          <legend className={labelClass}>Waar gaat uw donatie naartoe?</legend>
          <div className="space-y-2">
            {allOptions.map((c) => (
              <label
                key={c.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                  campaignId === c.id
                    ? "border-slate-mosque bg-slate-mosque/5"
                    : "border-sand-200 hover:border-taupe/50"
                )}
              >
                <input
                  type="radio"
                  name="campaign"
                  value={c.id}
                  checked={campaignId === c.id}
                  onChange={() => setCampaignId(c.id)}
                  className="mt-1 w-4 h-4 text-slate-mosque focus:ring-slate-mosque"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-body font-medium text-ink">{c.title}</span>
                    {c.featured && c.id !== ALGEMEEN_OPTION.id && (
                      <span className="font-body text-xs uppercase tracking-wider text-slate-mosque">
                        ★ uitgelicht
                      </span>
                    )}
                    {c.goal_amount_display && (
                      <span className="font-body text-xs text-taupe">
                        doel: {c.goal_amount_display}
                      </span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {/* Type-toggle — alleen tonen als beide opties beschikbaar zijn */}
      {showTypeToggle && (
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
      )}

      {!showTypeToggle && (
        <p className="mb-6 text-sm text-taupe-dark font-body">
          Voor dit doel zijn alleen{" "}
          <strong>{type === "one_time" ? "eenmalige" : "maandelijkse"}</strong> donaties beschikbaar.
        </p>
      )}

      {/* Bedrag */}
      <fieldset className="mb-6">
        <legend className={labelClass}>
          Kies een bedrag {type === "monthly" && <span className="text-taupe">(per maand)</span>}
        </legend>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
          {presetAmounts.map((amt) => (
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
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-body text-taupe-dark">€</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Eigen bedrag"
            className={cn(inputClass, "pl-8")}
            value={customAmount}
            onChange={(e) => selectCustom(e.target.value)}
          />
        </div>
      </fieldset>

      {/* Persoonlijke gegevens */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="don-name" className={labelClass}>
            Naam <span className="text-red-600" aria-hidden>*</span>
          </label>
          <input
            id="don-name"
            type="text"
            required
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
        {status === "submitting" ? "Bezig met doorsturen…" : "Verder naar betaling"}
      </Button>

      <p className="mt-4 font-body text-xs text-taupe-dark/80 text-center leading-relaxed">
        U wordt doorgestuurd naar de beveiligde betaalomgeving van Stripe.<br />
        iDEAL en creditcard worden ondersteund. Geen kaartgegevens komen op deze site terecht.<br />
        Door verder te gaan accepteert u onze{" "}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-mosque underline hover:text-slate-dark"
        >
          privacyverklaring
        </a>.
      </p>
    </form>
  );
}
