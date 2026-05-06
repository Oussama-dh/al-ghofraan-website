// lib/utils.ts

import { clsx, type ClassValue } from "clsx";
import { twMerge }               from "tailwind-merge";
import { format, parseISO }      from "date-fns";
import { nl }                    from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string, pattern = "d MMMM yyyy"): string {
  try {
    const date = parseISO(dateString);
    return format(date, pattern, { locale: nl });
  } catch {
    return dateString;
  }
}

export function formatDateShort(dateString: string): string {
  return formatDate(dateString, "d MMM");
}

export function formatTime(dateString: string): string {
  try {
    return format(parseISO(dateString), "HH:mm", { locale: nl });
  } catch {
    return dateString;
  }
}

export function isUpcoming(dateString: string): boolean {
  return new Date(dateString) >= new Date();
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + "…";
}

/**
 * Formatteer een bedrag in eurocenten naar leesbare NL-tekst.
 * Gebruikt door /api/doneren/checkout en /api/stripe/webhook om
 * `donations.amount_display` te vullen met dezelfde formattering.
 *
 * Voorbeeld: 2500 → "€25,00"
 */
export function formatEurFromCents(cents: number): string {
  if (!Number.isFinite(cents)) return "";
  // toLocaleString met nl-NL geeft "€ 25,00" met smalle non-breaking space.
  // We willen "€25,00" — daarom handmatig opbouwen.
  const euros = Math.floor(cents / 100);
  const rest  = Math.abs(cents) % 100;
  const restStr = rest.toString().padStart(2, "0");
  return `€${euros},${restStr}`;
}
