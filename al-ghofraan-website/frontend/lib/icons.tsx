// lib/icons.tsx
// Centrale icon-mapping voor de hele site.
//
// Directus slaat alleen een tekstwaarde op (bv. "calendar"). Deze module mapt
// die string naar een veilige, vooraf goedgekeurde lucide-react component.
// Onbekende of lege waarden vallen automatisch terug op een standaardicoon.

import {
  // Tijd & data
  Calendar,
  Clock,
  CalendarDays,
  // Mens & gemeenschap
  Users,
  User,
  HandHeart,
  Heart,
  // Plaats & contact
  MapPin,
  Mail,
  Phone,
  Globe,
  // Religieus / educatief
  BookOpen,
  GraduationCap,
  Moon,
  Star,
  Sparkles,
  // Communicatie
  MessageCircle,
  MessageSquare,
  Megaphone,
  HelpCircle,
  Camera,
  PlayCircle,
  // Algemeen
  Info,
  ArrowRight,
  ChevronRight,
  Check,
  Compass,
  Lightbulb,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Toegestane icon-namen (whitelist)
// ─────────────────────────────────────────────────────────────
//
// Alleen iconen in deze map kunnen via Directus worden gebruikt.
// Zo kan een redacteur geen onveilige string of typo plaatsen die
// de UI breekt — onbekende waarden vallen terug op de fallback.

export const ICON_MAP = {
  // Tijd & data
  calendar:         Calendar,
  "calendar-days":  CalendarDays,
  clock:            Clock,

  // Mens & gemeenschap
  users:            Users,
  user:             User,
  "hand-heart":     HandHeart,
  heart:            Heart,

  // Plaats & contact
  "map-pin":        MapPin,
  mail:             Mail,
  phone:            Phone,
  globe:            Globe,

  // Religieus / educatief
  "book-open":       BookOpen,
  "graduation-cap":  GraduationCap,
  moon:              Moon,
  star:              Star,
  sparkles:          Sparkles,
  // Geen "mosque" in lucide — gebruik moon/star/sparkles als alternatief.
  // We accepteren de waarde "mosque" maar mappen 'm naar Moon zodat content
  // die hiernaar verwijst niet breekt.
  mosque:            Moon,

  // Communicatie
  "message-circle":  MessageCircle,
  "message-square":  MessageSquare,
  megaphone:         Megaphone,
  "help-circle":     HelpCircle,
  facebook:          MessageCircle,
  instagram:         Camera,
  youtube:           PlayCircle,
  // Algemeen
  info:              Info,
  "arrow-right":     ArrowRight,
  "chevron-right":   ChevronRight,
  check:             Check,
  compass:           Compass,
  lightbulb:         Lightbulb,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICON_MAP;

// Lijst met alle toegestane icon-namen — handig voor docs en validatie
export const ALLOWED_ICONS: IconName[] = Object.keys(ICON_MAP) as IconName[];

// Standaardicoon bij onbekende of lege waarde
export const FALLBACK_ICON: LucideIcon = Info;

// ─────────────────────────────────────────────────────────────
// Helper: vind een icoon op basis van string
// ─────────────────────────────────────────────────────────────
export function getIconByName(name?: string | null): LucideIcon {
  if (!name) return FALLBACK_ICON;
  const normalized = name.trim().toLowerCase();
  if (normalized in ICON_MAP) {
    return ICON_MAP[normalized as IconName];
  }
  return FALLBACK_ICON;
}

export function isKnownIcon(name?: string | null): boolean {
  if (!name) return false;
  return name.trim().toLowerCase() in ICON_MAP;
}

// ─────────────────────────────────────────────────────────────
// <Icon /> — convenience component
// ─────────────────────────────────────────────────────────────
//
// Gebruik:  <Icon name="calendar" className="w-5 h-5" />
//           <Icon name={page.icon} className="..." />

interface IconProps extends Omit<LucideProps, "ref" | "name"> {
  name?: string | null;
}

export function Icon({ name, ...rest }: IconProps) {
  const Component = getIconByName(name);
  return <Component {...rest} />;
}
