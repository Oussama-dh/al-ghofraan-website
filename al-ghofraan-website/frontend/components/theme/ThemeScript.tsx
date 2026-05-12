// components/theme/ThemeScript.tsx
//
// Pre-hydration inline-script dat de juiste `.dark`-class op <html>
// zet vóór de browser ook maar één pixel rendert. Hierdoor zien
// gebruikers nooit een "flits" van light-mode wanneer ze dark mode
// gekozen hebben (of omgekeerd).
//
// Delivery 11 — VEREENVOUDIGD:
//   - Alleen "light" en "dark". Geen "system" meer.
//   - Geen matchMedia. Geen prefers-color-scheme detectie.
//   - Default = "light" wanneer er geen geldige waarde in localStorage staat.
//   - Een oude opgeslagen "system" waarde wordt veilig als "light"
//     geïnterpreteerd (en bij eerste toggle herschreven).
//
// Implementatie: een gewone <script>-tag met `dangerouslySetInnerHTML`.
// Browser parsed en voert het synchroon uit tijdens HTML-parsing, dus
// vóór React hydrateert.
//
// Hydration-veiligheid:
//   - We muteren alleen `document.documentElement.className`.
//   - <html> heeft `suppressHydrationWarning` in app/layout.tsx zodat
//     React de gemuteerde class niet als mismatch flagt.
//   - React rendert geen thema-afhankelijke markup vanuit de
//     server-render; de class verandert alléén CSS-variabelen.

export const THEME_STORAGE_KEY = "alghofraan-theme";

const INLINE_SCRIPT = `
(function() {
  try {
    var key = "${THEME_STORAGE_KEY}";
    var stored = null;
    try { stored = localStorage.getItem(key); } catch (e) {}
    // Alleen "light" en "dark" worden geaccepteerd. Een legacy
    // "system" waarde (delivery 10) valt netjes terug op "light".
    var theme = stored === "dark" ? "dark" : "light";
    var html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else                   html.classList.remove("dark");
    html.setAttribute("data-theme", theme);
  } catch (e) {
    /* light-mode is de veilige default */
  }
})();
`;

/**
 * Plaatst de inline pre-hydration script. Rendert NIETS zichtbaars.
 * Gebruik bovenin <body> in app/layout.tsx, vóór de rest van de boom.
 */
export default function ThemeScript() {
  return (
    <script
      // dangerouslySetInnerHTML is hier veilig: de string komt uit
      // onze eigen code en bevat geen user-input.
      dangerouslySetInnerHTML={{ __html: INLINE_SCRIPT }}
    />
  );
}
