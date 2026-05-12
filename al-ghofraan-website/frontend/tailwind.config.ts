import type { Config } from "tailwindcss";

/*
  Delivery 10 — Dark-mode:
  --------------------------------------------------------------------
  - `darkMode: "class"` zodat we een `.dark` class op <html> kunnen
    schakelen (zie components/theme/ThemeProvider.tsx).
  - Het kleuren-palet is omgehangen achter CSS-variabelen die in
    app/globals.css worden gedefinieerd. Een kleur zoals `sand-50`
    wordt nu `rgb(var(--c-sand-50) / <alpha>)` — Tailwind ondersteunt
    deze "RGB-channels"-syntax sinds v3.0 en zo blijft `bg-sand-50/40`
    werken voor opacity-modifiers.
  - In light-mode is het visuele resultaat exact gelijk aan delivery 9.
  - In dark-mode (zie `.dark { ... }` in globals.css) krijgen dezelfde
    semantische namen donkere tinten zodat alle bestaande components
    zonder per-bestand wijziging meeschakelen.
*/

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: {
          50:  "rgb(var(--c-sand-50)  / <alpha-value>)",
          100: "rgb(var(--c-sand-100) / <alpha-value>)",
          200: "rgb(var(--c-sand-200) / <alpha-value>)",
          300: "rgb(var(--c-sand-300) / <alpha-value>)",
          DEFAULT: "rgb(var(--c-sand-100) / <alpha-value>)",
        },
        taupe: {
          DEFAULT: "rgb(var(--c-taupe)       / <alpha-value>)",
          dark:    "rgb(var(--c-taupe-dark)  / <alpha-value>)",
          light:   "rgb(var(--c-taupe-light) / <alpha-value>)",
        },
        slate: {
          mosque: "rgb(var(--c-slate-mosque) / <alpha-value>)",
          dark:   "rgb(var(--c-slate-dark)   / <alpha-value>)",
          light:  "rgb(var(--c-slate-light)  / <alpha-value>)",
        },
        ink: "rgb(var(--c-ink) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-amiri)", "serif"],
        body:    ["var(--font-outfit)", "sans-serif"],
        arabic:  ["var(--font-amiri)", "serif"],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "112": "28rem",
        "128": "32rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-in":   "fadeIn 0.6s ease-out forwards",
        "slide-up":  "slideUp 0.5s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%":   { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      backgroundImage: {
        "geometric-pattern": "url('/images/pattern.svg')",
      },
      typography: {
        DEFAULT: {
          css: {
            color:           "rgb(var(--c-ink))",
            "h1,h2,h3,h4":  { fontFamily: "var(--font-amiri), serif" },
            a:               { color: "rgb(var(--c-slate-mosque))" },
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
