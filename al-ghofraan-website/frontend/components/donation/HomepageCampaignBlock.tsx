// components/donation/HomepageCampaignBlock.tsx
//
// Compacte campagne-kaart voor de homepage. Toont titel, short_text,
// samenvatting (opgehaald + maandelijkse donateurs) en een klikbare
// link naar /doneren. Géén uitklap-toggle, géén volledige
// voortgangsbalk — homepage = aandachts-trekker, /doneren = detail.
//
// Self-guarded: rendert null als goalCents<=0 (zonder doel kan
// percentage niet getoond worden, en de hele kaart heeft minder
// betekenis).
//
// GA: gebruikt bestaande TrackedLink + donate_click event met
// source="homepage_campaign". GEEN nieuwe events, GEEN PII.

import type { DonationCampaign } from "@/types/directus";
import { getAssetUrl }            from "@/lib/directus";
import TrackedLink                from "@/components/analytics/TrackedLink";

interface Props {
  campaign:          DonationCampaign;
  autoRaisedCents:   number;
  monthlyDonorCount: number;
  manualRaisedCents: number;
  goalCents:         number;
}

function formatEurFromCents(cents: number): string {
  return (cents / 100).toLocaleString("nl-NL", {
    style:                 "currency",
    currency:              "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export default function HomepageCampaignBlock({
  campaign,
  autoRaisedCents,
  monthlyDonorCount,
  manualRaisedCents,
  goalCents,
}: Props) {
  if (goalCents <= 0) return null;

  const raisedCents = Math.max(0, autoRaisedCents + manualRaisedCents);
  const pctRaw      = (raisedCents / goalCents) * 100;
  const pctCapped   = Math.max(0, Math.min(100, pctRaw));
  const pctLabel    = Math.round(pctCapped);

  const raisedLabel = formatEurFromCents(raisedCents);
  const goalLabel   = formatEurFromCents(goalCents);

  const imageId =
    typeof campaign.image === "string" ? campaign.image : campaign.image?.id;
  const imageUrl = imageId ? getAssetUrl(imageId) : null;

  return (
    <TrackedLink
      href={`/doneren?campaign=${encodeURIComponent(campaign.slug)}`}
      event="donate_click"
      params={{
        source:       "homepage_campaign",
        button_label: campaign.title,
      }}
      className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-sand-200 shadow-sm hover:shadow-md hover:border-taupe/50 transition-all"
      aria-label={`Bekijk campagne ${campaign.title} op donatiepagina`}
    >
      {imageUrl && (
        <div className="relative h-36 bg-sand-100 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}

      <div className="p-5 flex flex-col gap-3">
        <h3 className="font-display text-lg text-ink leading-tight group-hover:text-slate-mosque transition-colors">
          {campaign.title}
        </h3>

        {campaign.short_text && (
          <p className="font-body text-taupe-dark text-sm leading-relaxed line-clamp-2">
            {campaign.short_text}
          </p>
        )}

        {/* Compacte voortgangsbalk */}
        <div>
          <div className="flex items-baseline justify-between mb-1 gap-2 flex-wrap">
            <span className="font-body text-sm font-medium text-slate-mosque">
              {raisedLabel}
            </span>
            <span className="font-body text-xs text-taupe-dark">
              van {goalLabel}
            </span>
          </div>
          <div
            className="w-full h-2 bg-sand-200 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={pctLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Voortgang ${pctLabel} procent`}
          >
            <div
              className="h-full bg-taupe"
              style={{ width: `${pctCapped}%` }}
            />
          </div>
        </div>

        {monthlyDonorCount > 0 && (
          <p className="font-body text-xs text-taupe-dark">
            {monthlyDonorCount}{" "}
            {monthlyDonorCount === 1
              ? "persoon doneert maandelijks"
              : "mensen doneren maandelijks"}
          </p>
        )}

        <span className="font-body text-sm text-slate-mosque font-medium mt-1">
          Steun deze campagne →
        </span>
      </div>
    </TrackedLink>
  );
}
