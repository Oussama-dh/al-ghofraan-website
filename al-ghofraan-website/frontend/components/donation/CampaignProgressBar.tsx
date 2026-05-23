// components/donation/CampaignProgressBar.tsx
//
// Toont een campagne-voortgangsvak met balk, bedragen, monthly count
// en een optionele CTA-knop. Vervangt de expand/collapse-versie uit
// delivery v2 — geen toggle meer; balk is altijd direct zichtbaar.
//
// Wordt typisch gerenderd BINNEN DonationForm vlak onder de campagne-
// dropdown, zodat het voortgangsvak meebeweegt met de campagne-keuze.
//
// Props:
//   - campaign           — de DonationCampaign (voor titel, short_text, image)
//   - autoRaisedCents    — server-side aggregatie van Stripe one_time paid
//   - monthlyDonorCount  — server-side count van actieve monthly + manual extra
//   - manualRaisedCents  — uit campaign.manual_raised_amount_eur * 100
//   - goalCents          — uit goal_amount_eur*100 of legacy goal_amount
//   - onDonateClick?     — optionele callback voor "Doneer aan deze campagne"
//                          knop. Als niet meegegeven, wordt de knop niet
//                          gerenderd (bv. bij gebruik op homepage).
//
// Self-guard: rendert null als show_progress=false OF goalCents<=0.
//
// A11y: voortgangsbalk heeft role="progressbar" + aria-valuenow/min/max/label.
//
// Geen useState meer nodig — kan in principe terug naar server-component,
// maar het component wordt vanuit DonationForm (client) aangeroepen met een
// onDonateClick-callback die client-state aanraakt. Daarom blijft "use client".

"use client";

import type { DonationCampaign } from "@/types/directus";
import { getAssetUrl } from "@/lib/directus";

interface Props {
  campaign:          DonationCampaign;
  autoRaisedCents:   number;
  monthlyDonorCount: number;
  manualRaisedCents: number;
  goalCents:         number;
  /** Optionele CTA — knop verschijnt alleen als deze prop is meegegeven. */
  onDonateClick?:    () => void;
}

/** Formatteer eurocenten als leesbare euro-string: 235050 → "€2.350" */
function formatEurFromCents(cents: number): string {
  const euros = cents / 100;
  return euros.toLocaleString("nl-NL", {
    style:                 "currency",
    currency:              "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function CampaignProgressBar({
  campaign,
  autoRaisedCents,
  monthlyDonorCount,
  manualRaisedCents,
  goalCents,
  onDonateClick,
}: Props) {
  // Self-guard: opt-in toggle moet aan staan, en doel moet > 0 zijn
  if (!campaign.show_progress) return null;
  if (goalCents <= 0)          return null;

  // Totaal opgehaald = auto-Stripe (one_time paid) + handmatige correctie
  const raisedCents = Math.max(0, autoRaisedCents + manualRaisedCents);

  const pctRaw    = (raisedCents / goalCents) * 100;
  const pctCapped = Math.max(0, Math.min(100, pctRaw));
  const pctLabel  = Math.round(pctCapped);

  const raisedLabel = formatEurFromCents(raisedCents);
  const goalLabel   = formatEurFromCents(goalCents);

  const imageId =
    typeof campaign.image === "string" ? campaign.image : campaign.image?.id;
  const imageUrl = imageId ? getAssetUrl(imageId) : null;

  return (
    <article
      className="bg-sand-50 rounded-2xl border border-sand-200 p-5 sm:p-6 flex flex-col gap-4"
      aria-labelledby={`campaign-${campaign.id}-title`}
    >
      {imageUrl && (
        <div className="rounded-xl overflow-hidden bg-sand-100 h-32 sm:h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div>
        <h3
          id={`campaign-${campaign.id}-title`}
          className="font-display text-xl text-ink leading-tight"
        >
          {campaign.title}
        </h3>
        {campaign.short_text && (
          <p className="font-body text-taupe-dark text-sm mt-1 leading-relaxed">
            {campaign.short_text}
          </p>
        )}
      </div>

      {/* Voortgangsbalk — altijd zichtbaar */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <span className="font-body text-sm">
            <strong className="text-slate-mosque">{raisedLabel}</strong>
            <span className="text-taupe-dark"> opgehaald</span>
          </span>
          <span className="font-body text-xs text-taupe-dark">
            doel: {goalLabel} · {pctLabel}%
          </span>
        </div>

        <div
          className="w-full h-2.5 bg-sand-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pctLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Voortgang campagne ${campaign.title}: ${pctLabel} procent`}
        >
          <div
            className="h-full bg-taupe transition-all"
            style={{ width: `${pctCapped}%` }}
          />
        </div>

        {monthlyDonorCount > 0 && (
          <p className="font-body text-xs text-taupe-dark">
            {monthlyDonorCount === 1
              ? "1 persoon doneert maandelijks"
              : `${monthlyDonorCount} mensen doneren maandelijks`}
          </p>
        )}
      </div>

      {/* Optionele CTA — alleen als onDonateClick is meegegeven (DonationForm-context). */}
      {onDonateClick && (
        <button
          type="button"
          onClick={onDonateClick}
          className="self-start inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-slate-mosque text-white font-body font-medium text-sm hover:bg-slate-dark transition-colors"
        >
          Doneer aan deze campagne
        </button>
      )}
    </article>
  );
}
