export type AnalyticsEventName =
  | "donate_click"
  | "donation_start"
  | "donation_success"
  | "activity_view"
  | "activity_signup_start"
  | "activity_signup_complete"
  | "contact_click"
  | "agenda_click"
  | "video_click";

export type AnalyticsEventParams = Record<
  string,
  string | number | boolean | null | undefined
>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const ALLOWED_EVENTS = new Set<AnalyticsEventName>([
  "donate_click",
  "donation_start",
  "donation_success",
  "activity_view",
  "activity_signup_start",
  "activity_signup_complete",
  "contact_click",
  "agenda_click",
  "video_click",
]);

function sanitizeParams(params: AnalyticsEventParams = {}) {
      const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;

    const lowerKey = key.toLowerCase();

    // Voorkom per ongeluk persoonsgegevens in GA.
    if (
      lowerKey.includes("email") ||
      lowerKey.includes("mail") ||
      lowerKey.includes("phone") ||
      lowerKey.includes("telefoon") ||
      lowerKey.includes("name") ||
      lowerKey.includes("naam")
    ) {
      continue;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export function trackEvent(
  eventName: AnalyticsEventName,
  params: AnalyticsEventParams = {},
) {  if (!ALLOWED_EVENTS.has(eventName)) return;

  if (typeof window === "undefined") return;
  if (typeof window.gtag !== "function") return;

  window.gtag("event", eventName, sanitizeParams(params));
}