// components/theme/ThemeProvider.tsx
"use client";

//
// Theme-Provider (delivery 11 — vereenvoudigd).
//
// Twee standen: "light" | "dark". Geen "system" meer; geen matchMedia.
// Default = "light" wanneer er geen geldige waarde in localStorage
// staat. Een oude legacy "system" waarde (van delivery 10) wordt
// veilig als "light" geïnterpreteerd.
//
// Werking:
//   1. Vóór hydration zet `ThemeScript` (zie components/theme/
//      ThemeScript.tsx) al de juiste `.dark`-class op <html>, op
//      basis van localStorage. Hierdoor begint de Provider met
//      state die overeenkomt met wat de gebruiker al ziet — geen
//      flits.
//   2. Bij wisseling (toggle in header) updaten we de class op <html>,
//      schrijven naar localStorage en updaten data-attributen.
//
// Hydration-veiligheid:
//   - We muteren <html>-class buiten React via useEffect — server-HTML
//     bevat geen "dark"-class, en de inline script + provider zorgen
//     ervoor dat de pagina klopt zonder dat React-markup zelf van het
//     thema afhangt.
//   - We retourneren altijd `children` (geen "loading"-flash).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { THEME_STORAGE_KEY } from "./ThemeScript";

export type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Convenience: wissel tussen light en dark. */
  toggleTheme: () => void;
  /** True zodra Provider mounted is — voor "skeleton"-render in toggles. */
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark") return "dark";
    // "light", "system" (legacy), null, of een andere waarde → light
    return "light";
  } catch {
    return "light";
  }
}

function applyTheme(t: Theme) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  if (t === "dark") html.classList.add("dark");
  else              html.classList.remove("dark");
  html.setAttribute("data-theme", t);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Initial state: server- en eerste-client-render starten beide op "light".
  // Pas in useEffect (post-mount) lezen we de werkelijke voorkeur uit
  // localStorage. Dat is veilig omdat de pre-hydration script de
  // <html>-class al heeft gezet — de echte UI matcht meteen.
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setThemeState(readStoredTheme());
    setMounted(true);
  }, []);

  // Pas <html>-class aan na een wijziging. Niet bij eerste mount —
  // dan is de pre-hydration script al toegepast.
  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
  }, [theme, mounted]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* private mode of disabled storage */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((curr) => {
      const next: Theme = curr === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* private mode */
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, mounted }),
    [theme, setTheme, toggleTheme, mounted],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Veilige fallback wanneer een component buiten de provider wordt
    // gebruikt (mag eigenlijk niet, maar voorkomt crashes).
    return {
      theme: "light",
      setTheme: () => undefined,
      toggleTheme: () => undefined,
      mounted: false,
    };
  }
  return ctx;
}
