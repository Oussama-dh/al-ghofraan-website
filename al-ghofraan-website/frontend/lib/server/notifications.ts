// lib/server/notifications.ts
//
// ─── Admin-notificaties — SMTP-VERZENDLAAG ───────────────────────
//
// Verzendt interne admin-notificaties via cPanel SMTP wanneer alle
// volgende voorwaarden zijn voldaan:
//   1. `site_settings.email_notifications_enabled === true`
//   2. Een afdeling-specifiek `notification_email_<dept>` is gevuld
//   3. De SMTP_* env-vars zijn geconfigureerd
//
// Wat het doet:
//   - Leest `site_settings.email_notifications_enabled` en de
//     bijbehorende `notification_email_<afdeling>` velden.
//   - Stopt direct (no-op) als één van de twee voorwaarden faalt.
//   - Bouwt een platte tekst-payload (subject + body) op basis van
//     de gegevens van de inschrijving/contactmelding.
//   - Verzendt via nodemailer (cPanel SMTP, configured via env-vars).
//
// From-header strategie (voor cPanel compatibiliteit):
//   - From: "<email_from_name (Directus, fallback 'Al-Ghofraan')>
//            <SMTP_USER>"
//   - Reply-To: email_from_address (Directus) — als gevuld
//   Reden: cPanel weigert From-headers die niet matchen met de
//   authenticerende SMTP-user. Het Directus-veld `email_from_address`
//   stuurt nu de Reply-To header, zodat antwoorden naar het juiste
//   adres gaan zonder cPanel afzender-validatie te activeren.
//
// FAIL-SOFT GARANTIE:
//   Een fout in deze helper MAG NOOIT een formulier-flow blokkeren.
//   Alle publieke functies retourneren `Promise<void>` en swallowen
//   exceptions in een try/catch. De aanroepende API kan hem zonder
//   await uitvoeren of in een try/catch wrappen.
//
// SMTP env-vars:
//   SMTP_HOST    — bijv. mail.al-ghofraan.nl
//   SMTP_PORT    — bijv. 465 (SMTPS) of 587 (STARTTLS)
//   SMTP_SECURE  — "true" voor port 465, "false" voor 587
//   SMTP_USER    — bijv. noreply@al-ghofraan.nl
//   SMTP_PASS    — wachtwoord van die mailbox
//   Als één hiervan ontbreekt: warning in log, geen mail, geen throw.

import type { SiteSettings } from "@/types/directus";
import nodemailer            from "nodemailer";
import type { Transporter }  from "nodemailer";

// ─── Types per gebeurtenis ───────────────────────────────────

export interface ContactNotificationData {
  name:    string;
  email:   string;
  phone?:  string | null;
  subject: string;
  message: string;
}

export interface EducationNotificationData {
  programTitle:   string;
  programSlug:    string;
  parent: {
    name:  string;
    email: string;
    phone: string;
  };
  students: Array<{
    name:           string;
    gender:         string | null;
    age?:           number | null;
    notes?:         string | null;
    studentNumber?: string;
  }>;
  groupId: string;
}

export interface ActivityNotificationData {
  activityTitle: string;
  activitySlug:  string;
  name:    string;
  email:   string;
  phone?:  string | null;
  gender?: string | null;
  age?:    number | null;
  notes?:  string | null;
  status:  string;
}

// ─── Public API ──────────────────────────────────────────────

export async function notifyContact(
  settings: SiteSettings | null,
  data:     ContactNotificationData,
): Promise<void> {
  await prepare(settings, "contact", data.subject, () => ({
    subject: `Nieuw contactbericht: ${data.subject}`,
    body:    buildContactBody(data),
  }));
}

export async function notifyEducationRegistration(
  settings: SiteSettings | null,
  data:     EducationNotificationData,
): Promise<void> {
  await prepare(settings, "education", data.programTitle, () => ({
    subject:
      data.students.length === 1
        ? `Nieuwe onderwijsinschrijving: ${data.programTitle}`
        : `Nieuwe onderwijsinschrijving (${data.students.length} studenten): ${data.programTitle}`,
    body:    buildEducationBody(data),
  }));
}

export async function notifyActivityRegistration(
  settings: SiteSettings | null,
  data:     ActivityNotificationData,
): Promise<void> {
  await prepare(settings, "activities", data.activityTitle, () => ({
    subject: `Nieuwe activiteit-inschrijving: ${data.activityTitle}`,
    body:    buildActivityBody(data),
  }));
}

// ─── Internals ───────────────────────────────────────────────

type Department = "contact" | "education" | "activities" | "donations";

function getRecipientFor(settings: SiteSettings | null, dept: Department): string {
  if (!settings) return "";
  switch (dept) {
    case "contact":    return (settings.notification_email_contact    || "").trim();
    case "education":  return (settings.notification_email_education  || "").trim();
    case "activities": return (settings.notification_email_activities || "").trim();
    case "donations":  return (settings.notification_email_donations  || "").trim();
  }
}

/**
 * Centrale "prepare-but-don't-send" loop:
 *   - Bepaal of feature aan staat. Zo nee → stille no-op.
 *   - Bepaal of er een afdeling-adres is. Zo nee → info-log + stop.
 *   - Bouw subject+body.
 *   - Geef door aan dispatchAdminEmail() — die in deze delivery
 *     niets verstuurt, alleen logt.
 *
 * Alle stappen zijn try/catch-omsluit: NOOIT throw richting caller.
 */
async function prepare(
  settings: SiteSettings | null,
  dept:     Department,
  contextLabel: string,
  build:    () => { subject: string; body: string },
): Promise<void> {
  try {
    if (!settings || settings.email_notifications_enabled !== true) {
      // Master switch off — geen mail, ook geen log-noise in productie.
      return;
    }

    const to = getRecipientFor(settings, dept);
    if (!to) {
      console.log(`[notify:${dept}] geen ontvanger ingesteld (${contextLabel}) — overgeslagen`);
      return;
    }

    const { subject, body } = build();
    const fromName    = (settings.email_from_name    || "").trim() || "Al-Ghofraan";
    const fromAddress = (settings.email_from_address || "").trim();

    await dispatchAdminEmail({
      to,
      fromName,
      fromAddress,
      subject,
      body,
      department: dept,
    });
  } catch (err: unknown) {
    // Vangnet — mag NOOIT bubbelen.
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[notify:${dept}] onverwachte fout (genegeerd): ${msg}`);
  }
}

interface PreparedEmail {
  to:          string;
  fromName:    string;
  fromAddress: string;  // het Directus email_from_address veld; wordt Reply-To
  subject:     string;
  body:        string;
  department:  Department;
}

// ─── SMTP transporter ────────────────────────────────────────

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

let cachedTransporter: Transporter | null = null;
let cachedConfigKey:   string             = "";

/**
 * Lees SMTP-config uit env. Retourneert null als één van de
 * verplichte vars ontbreekt — caller logt dan en doet een no-op.
 */
function readSmtpConfig(): SmtpConfig | null {
  const host = (process.env.SMTP_HOST || "").trim();
  const user = (process.env.SMTP_USER || "").trim();
  const pass = process.env.SMTP_PASS || "";
  const portRaw   = (process.env.SMTP_PORT   || "").trim();
  const secureRaw = (process.env.SMTP_SECURE || "").trim().toLowerCase();

  if (!host || !user || !pass || !portRaw) return null;

  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) return null;

  // secure: expliciet "true" → SMTPS (typisch 465). Anders STARTTLS-upgrade
  // (typisch 587). We accepteren ook "1" / "yes" als true, voor mensen die
  // env-files met de hand bewerken.
  const secure = secureRaw === "true" || secureRaw === "1" || secureRaw === "yes";

  return { host, port, secure, user, pass };
}

/**
 * Lazy + gecachete transporter. Cache-key bevat alle config-velden
 * zodat env-aanpassingen tijdens dev hot-reload niet bijten.
 * Geen pooling (laag volume), geen automatische verify (vermijdt
 * cold-start TCP-handshake bij elke server-restart).
 */
function getTransporter(cfg: SmtpConfig): Transporter {
  const key = `${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}`;
  if (cachedTransporter && cachedConfigKey === key) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host:   cfg.host,
    port:   cfg.port,
    secure: cfg.secure,
    auth:   { user: cfg.user, pass: cfg.pass },
  });
  cachedConfigKey = key;
  return cachedTransporter;
}

/**
 * VERZENDPUNT — verstuurt via SMTP (nodemailer) wanneer alle
 * env-vars zijn geconfigureerd.
 *
 * Gedrag:
 *   - SMTP-config compleet → verstuur. Bij fout: warn-log, throw NIET.
 *   - SMTP-config incompleet → warn-log met welke vars ontbreken,
 *     return zonder mail.
 *
 * From-header strategie (cPanel-vriendelijk):
 *   - SMTP envelope+From-header gebruikt SMTP_USER als adres
 *     (verplicht door cPanel; from-spoofing wordt geweigerd).
 *   - Display-name uit Directus `email_from_name`, fallback "Al-Ghofraan".
 *   - Reply-To wordt op `email_from_address` (Directus) gezet wanneer
 *     dat veld gevuld is — zo gaan replies naar het juiste mailbox.
 *
 * Caller hoeft niets te wijzigen bij latere provider-wissels (bv.
 * naar een provider-SDK). Alleen deze functie aanpassen.
 */
async function dispatchAdminEmail(email: PreparedEmail): Promise<void> {
  const cfg = readSmtpConfig();

  if (!cfg) {
    console.warn(
      `[notify:${email.department}] SMTP niet (volledig) geconfigureerd ` +
      `(check SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS env-vars) — ` +
      `mail naar ${redactEmail(email.to)} overgeslagen.`,
    );
    return;
  }

  const fromAddress = cfg.user;                          // verplicht = SMTP user
  const fromName    = email.fromName || "Al-Ghofraan";   // display-name
  const replyTo     = (email.fromAddress || "").trim() || undefined;

  // Bouw de RFC5322 from-header: `"Display Name" <user@example.com>`.
  // Escape dubbele quotes in display-name (defensief — site_settings
  // veld kan in theorie alles bevatten).
  const fromHeader = `"${fromName.replace(/"/g, '\\"')}" <${fromAddress}>`;

  try {
    const transporter = getTransporter(cfg);
    await transporter.sendMail({
      from:    fromHeader,
      to:      email.to,
      replyTo: replyTo,
      subject: email.subject,
      text:    email.body,
    });
    // Korte info-regel — geen body in log (privacy: donor-data).
    console.log(
      `[notify:${email.department}] mail verzonden naar ${redactEmail(email.to)}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[notify:${email.department}] SMTP-verzending naar ${redactEmail(email.to)} ` +
      `mislukt (genegeerd): ${msg}`,
    );
    // GEEN throw — fail-soft contract.
  }
}

// ─── Body-builders ───────────────────────────────────────────

function buildContactBody(d: ContactNotificationData): string {
  const lines = [
    "Er is een nieuw contactbericht binnengekomen via de website.",
    "",
    `Naam       : ${d.name}`,
    `E-mail     : ${d.email}`,
  ];
  if (d.phone) lines.push(`Telefoon   : ${d.phone}`);
  lines.push(`Onderwerp  : ${d.subject}`);
  lines.push("");
  lines.push("Bericht:");
  lines.push("--------");
  lines.push(d.message);
  lines.push("");
  lines.push("Bekijk het bericht in Directus onder 'Contactberichten'.");
  return lines.join("\n");
}

function buildEducationBody(d: EducationNotificationData): string {
  const lines = [
    `Er is een nieuwe onderwijsinschrijving binnengekomen voor "${d.programTitle}".`,
    "",
    "Contactpersoon (ouder/verzorger):",
    `  Naam     : ${d.parent.name}`,
    `  E-mail   : ${d.parent.email}`,
    `  Telefoon : ${d.parent.phone}`,
    "",
    `Groep-ID   : ${d.groupId}`,
    `Aantal     : ${d.students.length} student${d.students.length === 1 ? "" : "en"}`,
    "",
    "Studenten:",
  ];
  for (let i = 0; i < d.students.length; i++) {
    const s = d.students[i];
    lines.push(
      `  ${i + 1}. ${s.name}` +
      (s.studentNumber ? ` (#${s.studentNumber})` : "") +
      (s.gender ? ` — ${s.gender}` : "") +
      (s.age != null ? `, ${s.age} jaar` : ""),
    );
    if (s.notes) lines.push(`     Opmerking: ${s.notes}`);
  }
  lines.push("");
  lines.push("Bekijk de inschrijvingen in Directus onder 'Registrations' (filter type=education).");
  return lines.join("\n");
}

function buildActivityBody(d: ActivityNotificationData): string {
  const lines = [
    `Er is een nieuwe inschrijving binnengekomen voor activiteit "${d.activityTitle}".`,
    "",
    `Naam       : ${d.name}`,
    `E-mail     : ${d.email}`,
  ];
  if (d.phone)         lines.push(`Telefoon   : ${d.phone}`);
  if (d.gender)        lines.push(`Geslacht   : ${d.gender}`);
  if (d.age != null)   lines.push(`Leeftijd   : ${d.age}`);
  if (d.notes)         lines.push(`Opmerking  : ${d.notes}`);
  lines.push(`Status     : ${d.status}`);
  lines.push("");
  lines.push("Bekijk de inschrijvingen in Directus onder 'Registrations' (filter type=activity).");
  return lines.join("\n");
}

// ─── Util ────────────────────────────────────────────────────

/** Maskeer een e-mail in productie-logs: 'jan@voorbeeld.nl' → 'j***@voorbeeld.nl' */
function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (!local) return `***@${domain}`;
  return `${local[0]}***@${domain}`;
}
