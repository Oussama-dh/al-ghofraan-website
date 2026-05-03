import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Al-Ghofraan kleurenpalet
        sand: {
          50:  "#f9f7f5",
          100: "#ece5df",
          200: "#ddd3c8",
          300: "#c9baa9",
          DEFAULT: "#ece5df",
        },
        taupe: {
          DEFAULT: "#a99d85",
          dark:    "#8c8269",
          light:   "#c4baaa",
        },
        slate: {
          mosque: "#4d5b6f",
          dark:   "#3a4558",
          light:  "#6b7a8d",
        },
        ink: "#1a1a1a",
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
            color:           "#1a1a1a",
            "h1,h2,h3,h4":  { fontFamily: "var(--font-amiri), serif" },
            a:               { color: "#4d5b6f" },
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
