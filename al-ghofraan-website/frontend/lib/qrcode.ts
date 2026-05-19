// lib/qrcode.ts
//
// Dunne wrapper rond het `qrcode` npm-pakket. Genereert een
// QR-code als SVG-string die we inline in een server-component
// kunnen renderen zonder runtime-fetch en zonder externe service.
//
// Reden voor SVG (en niet PNG/dataURL):
//   - Schaalt scherp op elk scherm, ook op highres telefoons.
//   - Geen base64-overhead.
//   - Server-side render, dus geen client-bundle voor `qrcode`.
//
// Reden voor de wrapper i.p.v. direct importeren in de page:
//   - Sane defaults op één plek (margin, kleur).
//   - Eén plek om de lib te swappen mocht dat ooit nodig zijn.
//   - Eén plek om try/catch te doen (fail-soft).
//
// API:
//   renderQrSvg(text)       → Promise<string> met de <svg>...</svg>.
//                             Bij interne fout: lege string (caller
//                             toont fallback). Throws nooit.

import QRCode from "qrcode";

export interface RenderQrSvgOptions {
  /** Margin in QR-modules (default 1, krap en print-vriendelijk) */
  margin?: number;
  /** Foreground color, default zwart */
  darkColor?: string;
  /** Background color, default transparant */
  lightColor?: string;
}

/**
 * Genereer een QR-code als SVG-string.
 *
 * Gebruikt errorCorrectionLevel 'M' (medium ~15%) — goed compromis
 * tussen QR-dichtheid en resilience tegen vuile camera-scans. Onze
 * tokens zijn UUID v4 (36 tekens), past comfortabel in een kleine
 * QR-code op level M.
 *
 * Throws NOOIT — bij interne fout retourneert deze functie een lege
 * string. Caller kan daarop fallback rendering doen (bv. de
 * letterlijke URL als plain text).
 */
export async function renderQrSvg(
  text: string,
  options: RenderQrSvgOptions = {},
): Promise<string> {
  if (!text || typeof text !== "string") return "";

  try {
    // toString met type 'svg' returnt een SVG-element-string.
    const svg = await QRCode.toString(text, {
      type:                 "svg",
      margin:               options.margin     ?? 1,
      errorCorrectionLevel: "M",
      color: {
        dark:  options.darkColor  ?? "#000000",
        light: options.lightColor ?? "#00000000", // transparante background
      },
    });
    return svg;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[qrcode] genereren mislukt (genegeerd): ${msg}`);
    return "";
  }
}
