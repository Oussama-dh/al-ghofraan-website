// lib/donations.ts
//
// Server-side aggregaties van Stripe-donaties per campagne.
// Wordt vanuit server-components op /doneren en de homepage aangeroepen.
//
// Privacy: deze module DRAAIT ALLEEN SERVER-SIDE met directusServer
// (admin-token). De resultaten zijn aggregaten (totaalbedragen, counts)
// — géén donor-namen, e-mails of bedragen-per-donor lekken naar de
// client. Aggregaten zijn safe voor publieke weergave.
//
// Source of truth voor statussen (uit Stripe webhook):
//   - one_time + paid     → ECHT geslaagd, telt voor totaal bedrag
//   - monthly + active    → ECHT actief abonnement, telt voor donor count
//   - alle andere statussen worden GENEGEERD (pending, failed,
//     cancelled, ended)
//
// Aggregaten zijn ALTIJD per campaign-id. Donaties zonder campaign
// (algemene donatie) worden NIET meegerekend in een specifieke
// campagne — die hebben campaign=null en vallen automatisch uit
// onze filter.

import { readItems } from "@directus/sdk";
import { directusServer } from "./directus";

const IS_DEV = process.env.NODE_ENV !== "production";

/**
 * Lokale duplicatie van safe() uit lib/directus.ts om die module's
 * public surface area niet aan te raken. Identieke semantiek:
 * fail-soft met fallback.
 */
async function safe<T>(fn: () => Promise<T>, label: string, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (IS_DEV) {
      console.warn(`[donations] ${label} mislukt:`, (err as Error)?.message || err);
    }
    return fallback;
  }
}

export interface CampaignProgressData {
  /** Totaal opgehaald in EUROCENTEN (alleen one_time paid). */
  autoRaisedCents: number;
  /** Aantal unieke actieve maandelijkse abonnementen voor deze campagne. */
  monthlyDonorCount: number;
}

/**
 * Berekent voor één campagne het automatisch opgehaalde bedrag (in
 * cents) en het aantal actieve maandelijkse donateurs.
 *
 * Fail-soft: bij Directus-fout → 0/0 (CampaignProgressBar valt dan
 * stilletjes terug op alleen manual_raised_amount_eur).
 */
export async function getCampaignProgress(
  campaignId: number,
): Promise<CampaignProgressData> {
  return safe(
    async () => {
      const [oneTimePaid, monthlyActive] = await Promise.all([
        // Eenmalige geslaagde donaties — bedrag optellen
        directusServer.request(
          readItems("donations", {
            filter: {
              campaign: { _eq: campaignId },
              type:     { _eq: "one_time" },
              status:   { _eq: "paid" },
            } as never,
            // Alleen amount nodig — geen PII naar deze server-side aggregatie
            fields: ["amount"],
            limit:  -1,
          })
        ),
        // Maandelijkse actieve abonnementen — distinct subscription-id tellen
        directusServer.request(
          readItems("donations", {
            filter: {
              campaign: { _eq: campaignId },
              type:     { _eq: "monthly" },
              status:   { _eq: "active" },
            } as never,
            // Subscription-id is een Stripe-id, geen PII per definitie,
            // maar we tellen alleen aantal unieke waardes — niet exposen
            fields: ["stripe_subscription_id"],
            limit:  -1,
          })
        ),
      ]);

      // Optel eenmalig totaal
      const autoRaisedCents = (oneTimePaid as Array<{ amount?: number }>)
        .reduce((sum, d) => sum + (d.amount ?? 0), 0);

      // Distinct subscription-ids tellen (één abonnee kan in theorie
      // meerdere rijen hebben als webhook hem twee keer ziet — distinct
      // voorkomt dubbel-tellen)
      const subIds = new Set<string>();
      for (const row of monthlyActive as Array<{ stripe_subscription_id?: string | null }>) {
        if (row.stripe_subscription_id) subIds.add(row.stripe_subscription_id);
      }
      const monthlyDonorCount = subIds.size;

      return { autoRaisedCents, monthlyDonorCount };
    },
    `getCampaignProgress(${campaignId})`,
    { autoRaisedCents: 0, monthlyDonorCount: 0 },
  );
}

/**
 * Batch-variant: roept getCampaignProgress voor meerdere campagnes
 * parallel aan. Gebruikt op /doneren waar we voor alle campagnes met
 * show_progress=true tegelijk de cijfers willen.
 *
 * Returns Map<campaignId, CampaignProgressData>.
 */
export async function getCampaignProgressBatch(
  campaignIds: number[],
): Promise<Map<number, CampaignProgressData>> {
  const result = new Map<number, CampaignProgressData>();
  if (campaignIds.length === 0) return result;

  const results = await Promise.all(
    campaignIds.map(async (id) => ({
      id,
      data: await getCampaignProgress(id),
    })),
  );

  for (const { id, data } of results) {
    result.set(id, data);
  }
  return result;
}
