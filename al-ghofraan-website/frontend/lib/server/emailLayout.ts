// lib/server/emailLayout.ts
//
// HTML-layout voor uitgaande al-Ghofraan-mails (bezoekers/ouders).
// Zelfde huisstijl als de handmatig verstuurde nieuwsbrief-mails:
// zandkleurige achtergrond, kaart met logo + titel, taupe balk,
// leisteenblauwe tekst en footer.
//
// Alleen inline styles en tabellen: dat is het enige dat betrouwbaar
// werkt in Gmail/Outlook/Apple Mail. Alle dynamische tekst gaat door
// escapeHtml(); bouwers geven NOOIT ruwe HTML door.

const COLOR = {
  page:   "#e8dfd8",
  card:   "#f7f3ef",
  accent: "#b4aa91",
  ink:    "#536277",
  onInk:  "#f7f3ef",
} as const;

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Tekst met lege regels als alinea-scheiding → lijst alinea's (enkele \n blijft binnen de alinea). */
export function splitParagraphs(text: string | null | undefined): string[] {
  return (text || "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type EmailBlock =
  | { type: "p"; text: string }
  | { type: "summary"; title: string; rows: Array<{ label: string; value: string }> };

export interface BrandedEmailOptions {
  /** Titel bovenaan de kaart (h2). */
  title:    string;
  blocks:   EmailBlock[];
  /** Absolute URL van het logo; leeg = geen afbeelding. */
  logoUrl?: string | null;
  /** Absolute basis-URL van de site voor de footerlink. */
  siteUrl?: string | null;
  /** Naam in header en footer. */
  brandName?: string;
}

const P_STYLE =
  `margin:0 0 16px 0;font-size:16px;line-height:1.7;color:${COLOR.ink};`;

function paragraphHtml(text: string): string {
  const body = escapeHtml(text).replace(/\n/g, "<br />");
  return `<p style="${P_STYLE}">${body}</p>`;
}

function summaryHtml(title: string, rows: Array<{ label: string; value: string }>): string {
  const rowsHtml = rows
    .map(
      (r) =>
        `<tr>` +
        `<td style="padding:4px 12px 4px 0;font-size:15px;line-height:1.6;color:${COLOR.ink};vertical-align:top;white-space:nowrap;"><strong>${escapeHtml(r.label)}</strong></td>` +
        `<td style="padding:4px 0;font-size:15px;line-height:1.6;color:${COLOR.ink};vertical-align:top;">${escapeHtml(r.value).replace(/\n/g, "<br />")}</td>` +
        `</tr>`,
    )
    .join("");

  return (
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" ` +
    `style="background-color:${COLOR.page};border-left:5px solid ${COLOR.accent};border-radius:8px;margin:25px 0;">` +
    `<tr><td style="padding:18px 20px;">` +
    `<p style="margin:0 0 10px 0;font-size:15px;line-height:1.7;color:${COLOR.ink};"><strong>${escapeHtml(title)}</strong></p>` +
    `<table role="presentation" cellspacing="0" cellpadding="0">${rowsHtml}</table>` +
    `</td></tr></table>`
  );
}

export function renderBrandedEmail(opts: BrandedEmailOptions): string {
  const brand = escapeHtml(opts.brandName || "al-Ghofraan");
  const logo  = (opts.logoUrl || "").trim();
  const site  = (opts.siteUrl || "").trim();

  const logoHtml = logo
    ? `<img src="${escapeHtml(logo)}" alt="${brand}" width="170" style="display:block;margin:0 auto 18px auto;border:0;outline:none;text-decoration:none;" />`
    : "";

  const blocksHtml = opts.blocks
    .map((b) => (b.type === "p" ? paragraphHtml(b.text) : summaryHtml(b.title, b.rows)))
    .join("\n");

  const siteLink = site
    ? `<p style="margin:14px 0 0 0;font-size:13px;"><a href="${escapeHtml(site)}" target="_blank" rel="noopener noreferrer" style="color:${COLOR.page};text-decoration:underline;">Website</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:${COLOR.page};">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:${COLOR.page};padding:30px 15px;font-family:Arial,Helvetica,sans-serif;">
<tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background-color:${COLOR.card};border-radius:14px;overflow:hidden;border:1px solid ${COLOR.accent};">
<tr><td align="center" style="padding:35px 25px 25px 25px;background-color:${COLOR.page};">
${logoHtml}
<h1 style="margin:0;font-size:28px;letter-spacing:1px;color:${COLOR.ink};font-family:Georgia,'Times New Roman',serif;">${brand}</h1>
</td></tr>
<tr><td style="height:6px;line-height:6px;font-size:6px;background-color:${COLOR.accent};">&nbsp;</td></tr>
<tr><td style="padding:35px 30px;">
<h2 style="margin:0 0 18px 0;font-size:24px;color:${COLOR.ink};font-weight:bold;">${escapeHtml(opts.title)}</h2>
${blocksHtml}
</td></tr>
<tr><td align="center" style="padding:25px 20px;background-color:${COLOR.ink};color:${COLOR.onInk};">
<p style="margin:0;font-size:14px;line-height:1.6;color:${COLOR.onInk};">${brand}</p>
${siteLink}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
