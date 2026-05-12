// components/theme/ThemeToggle.tsx
"use client";

//
// 2-staps theme-toggle: light ⇄ dark.
//
// Delivery 11 — VEREENVOUDIGD:
//   - "system" is verwijderd.
//   - Alleen zon-icoon (in dark mode — klik om naar light te gaan)
//     en maan-icoon (in light mode — klik om naar dark te gaan).
//
// Pre-mount render een placeholder (zelfde afmetingen, ingestelde
// background) zodat de toggle geen layout-shift veroorzaakt en geen
// hydration mismatch geeft.
//
// Voor toetsenbord-gebruik: de knop is een echte <button>, dus
// enter/space werken vanzelf. Aria-label en title vertellen welke
// modus actief is.

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, mounted, toggleTheme } = useTheme();

  // Pre-mount placeholder: zelfde footprint maar geen icoon dat zou
  // kunnen mismatchen met server-render.
  if (!mounted) {
    return (
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-lg",
          "text-ink/40 cursor-default",
          className,
        )}
      >
        <span className="w-5 h-5 inline-block" aria-hidden="true" />
      </button>
    );
  }

  // Toon het icoon van de modus waar je naartoe schakelt:
  //   light-modus actief → toon Maan-icoon (klik = naar dark)
  //   dark-modus actief  → toon Zon-icoon  (klik = naar light)
  const Icon       = theme === "dark" ? Sun : Moon;
  const ariaLabel  = theme === "dark" ? "Schakel naar lichte modus" : "Schakel naar donkere modus";
  const titleLabel = theme === "dark" ? "Thema: Donker (klik voor licht)" : "Thema: Licht (klik voor donker)";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={ariaLabel}
      title={titleLabel}
      className={cn(
        "inline-flex items-center justify-center w-9 h-9 rounded-lg",
        "text-ink hover:bg-sand hover:text-slate-mosque",
        "transition-colors",
        className,
      )}
    >
      <Icon className="w-5 h-5" strokeWidth={1.75} />
    </button>
  );
}
