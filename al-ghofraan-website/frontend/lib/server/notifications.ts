// lib/server/notifications.ts
//
// ─── Admin-notificaties — VOORBEREIDENDE LAAG ────────────────────
//
// Dit is een **voorbereidende** server-only helper. In deze delivery
// verzendt deze code GEEN echte e-mails:
//   - Geen SMTP-verbinding.
//   - Geen `node:net` of `node:tls`.
//   - Geen externe dependency (geen nodemailer, geen provider-SDK).
//   - Geen netwerktoegang vanuit deze module.
//
// Wat hij wel doet:
//   1. Leest `site_settings.email_notifications_enabled` en de
//      bijbehorende `notification_email_<afdeling>` velden.
//   2. Bepaalt of er voor deze gebeurtenis "verstuurd zou moeten
//      worden" als er een verzendkanaal was.
//   3. Bouwt een platte tekst-payload (subject + body) op basis van
//      de gegevens van de inschrijving/contactmelding.
//   4. Logt in development de payload als info, in productie alleen
//      een neutrale info-regel ("notificatie voorbereid voor ...").
//
// Hiermee kunnen we:
//   - de UI-velden vandaag al inrichten,
//   - de API-routes vandaag al door de "happy path" laten gaan,
//   - en straks alleen `dispatchAdminEmail()` invullen met een echte
//     verzender (Brevo/Resend SDK of nodemailer-SMTP). De aanroepende
//     code in /api/contact en /api/inschrijven blijft dan ongewijzigd.
//
// FAIL-SOFT GARANTIE:
//   Een fout in deze helper MAG NOOIT een formulier-flow blokkeren.
//   Alle publieke functies retourneren `Promise<void>` en swallowen
//   exceptions in een try/catch. De aanroepende API kan hem zonder
//   await uitvoeren of in een try/catch wrappen.

import type { SiteSettings } from "@/types/directus";

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
  fromAddress: string;  // mag leeg zijn — wordt straks gevuld door provider-default
  subject:     string;
  body:        string;
  department:  Department;
}

/**
 * VERZENDPUNT — bewust een no-op in deze delivery.
 *
 * Wanneer we later kiezen voor een echt kanaal, hoeft enkel deze
 * functie te worden vervangen. Mogelijke implementaties:
 *
 *   A) Nodemailer + SMTP (Brevo/Mailgun/AWS SES/Postmark SMTP-relay)
 *      - dependency: `nodemailer` (~150 KB, geen native deps)
 *      - import { createTransport } from "nodemailer";
 *      - env vars: SMTP_HOST/PORT/USER/PASSWORD/SECURE
 *
 *   B) Provider-SDK (Resend, Brevo, Postmark)
 *      - dependency: `resend` of `@getbrevo/brevo` of `postmark`
 *      - env vars: RESEND_API_KEY (etc.)
 *      - Voordeel: betere deliverability, geen SMTP-config nodig
 *
 *   C) Eigen pure-Node SMTP-client over node:net/node:tls
 *      - geen dependency, maar wel >300 regels onderhoud
 *      - in deze delivery EXPLICIET niet gekozen
 *
 * Tot die keuze gemaakt is, doet deze functie alleen:
 *   - log in development de volledige payload (handig voor testen)
 *   - log in productie een rustige info-regel zonder body
 *
 * Caller hoeft niets te wijzigen wanneer de implementatie verandert.
 */
async function dispatchAdminEmail(email: PreparedEmail): Promise<void> {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    // In development tonen we volledig wat verzonden ZOU worden.
    // Logt netjes via console.log, niet console.warn — dit is een
    // verwachte info-regel zolang de mailprovider niet is geconfigureerd.
    console.log(
      `[notify:${email.department}] (dev) zou verzenden naar ${email.to}\n` +
      `  From: ${email.fromName} <${email.fromAddress || "(geen from-adres)"}>\n` +
      `  Subject: ${email.subject}\n` +
      `  --- body ---\n${indent(email.body, "  ")}\n  --- /body ---`,
    );
  } else {
    // In productie houden we het kort om logs niet vol te schrijven.
    console.log(
      `[notify:${email.department}] payload voorbereid voor ${redactEmail(email.to)} — ` +
      `verzendkanaal nog niet geconfigureerd in deze delivery.`,
    );
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

function indent(text: string, prefix: string): string {
  return text.split("\n").map((l) => prefix + l).join("\n");
}

/** Maskeer een e-mail in productie-logs: 'jan@voorbeeld.nl' → 'j***@voorbeeld.nl' */
function redactEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  if (!local) return `***@${domain}`;
  return `${local[0]}***@${domain}`;
}
