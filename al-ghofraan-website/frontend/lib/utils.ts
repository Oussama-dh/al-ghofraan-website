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
  const euros = Math.floor(cents / 100);
  const rest  = Math.abs(cents) % 100;
  const restStr = rest.toString().padStart(2, "0");
  return `€${euros},${restStr}`;
}

/**
 * Normaliseer een telefoonnummer voor wa.me — alleen cijfers.
 * Verwijdert +, spaties, streepjes en haakjes.
 *
 * "+31 6 12345678" → "31612345678"
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  return String(raw).replace(/\D/g, "");
}

/**
 * Bouw een wa.me URL. Geeft "" terug als nummer leeg/ongeldig is.
 */
export function buildWhatsAppUrl(
  number: string | null | undefined,
  defaultMessage?: string | null
): string {
  const normalized = normalizeWhatsAppNumber(number);
  if (!normalized) return "";
  const base = `https://wa.me/${normalized}`;
  if (defaultMessage && defaultMessage.trim()) {
    return `${base}?text=${encodeURIComponent(defaultMessage.trim())}`;
  }
  return base;
}
