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
