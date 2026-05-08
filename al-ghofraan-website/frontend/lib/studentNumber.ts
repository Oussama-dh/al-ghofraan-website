// lib/studentNumber.ts
//
// Server-side helper voor genereren van studentnummers per onderwijsregistratie.
//
// Format: JJ-MM-DD-XXXX
//   JJ   = laatste 2 cijfers van het kalenderjaar
//   MM   = maand (01..12)
//   DD   = dag (01..31)
//   XXXX = oplopend nummer per dag, 4-cijferig met leading zeros
//
// Voorbeeld: 26-05-08-0001
//
// Werking:
//   1. Bouw de prefix "JJ-MM-DD-" voor vandaag (in Europe/Amsterdam, want de
//      seed wordt door Nederlandse beheerders gebruikt).
//   2. Query alle bestaande registrations waarvan student_number met die
//      prefix begint.
//   3. Pak het hoogste numerieke suffix en tel daar 1 bij op.
//   4. Pad naar 4 cijfers.
//
// **Race condition**: bij twee gelijktijdige inschrijvingen op dezelfde
// seconde kan in theorie hetzelfde nummer worden gegenereerd. Voor de
// huidige schaal (kleine moskee, paar inschrijvingen per dag) is dit
// acceptabel. Als het ooit een probleem wordt: wrap dit in een DB-lock
// of gebruik een unique constraint + retry.

import { readItems } from "@directus/sdk";
import { directusServer } from "@/lib/directus";

/** Geef DD/MM/JJ van vandaag in Europe/Amsterdam-tijd. */
function getAmsterdamDateParts(): { yy: string; mm: string; dd: string } {
  // Gebruik Intl voor stabiele tijdzone-conversie. NL-locale + numericalle delen.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year:     "numeric",
    month:    "2-digit",
    day:      "2-digit",
  });
  // en-CA geeft "2026-05-08" — robuust te splitsen
  const [y, mo, da] = fmt.format(new Date()).split("-");
  return {
    yy: y.slice(-2),
    mm: mo,
    dd: da,
  };
}

/**
 * Genereer een nieuw studentnummer.
 *
 * Doet één Directus read-query om bestaande nummers van vandaag te tellen.
 * Als de query mislukt, valt de helper terug op suffix `0001`. Dat is veiliger
 * dan een crash; het ergste wat kan gebeuren is dat twee studenten op
 * dezelfde dag identieke nummers krijgen — welke pas later opvalt en
 * handmatig gecorrigeerd kan worden.
 */
export async function generateStudentNumber(): Promise<string> {
  const { yy, mm, dd } = getAmsterdamDateParts();
  const prefix = `${yy}-${mm}-${dd}-`;

  let nextSeq = 1;
  try {
    const items = await directusServer.request(
      readItems("registrations", {
        filter: { student_number: { _starts_with: prefix } } as never,
        fields: ["student_number"],
        limit:  -1,
      }),
    );

    let maxSeq = 0;
    for (const item of items as Array<{ student_number?: string | null }>) {
      const sn = (item.student_number || "").trim();
      if (!sn.startsWith(prefix)) continue;
      const suffix = sn.slice(prefix.length);
      const n = parseInt(suffix, 10);
      if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
    }
    nextSeq = maxSeq + 1;
  } catch (err) {
    // Niet-blokkerend — log en val terug op 1
    console.warn("[studentNumber] kon bestaande nummers niet ophalen:", err);
    nextSeq = 1;
  }

  return `${prefix}${String(nextSeq).padStart(4, "0")}`;
}

/**
 * Genereer N opvolgende studentnummers in één keer (voor multi-student
 * inschrijvingen). Bouwt voort op `generateStudentNumber` maar reserveert
 * vooraf een reeks zodat alle kinderen van één indiening opeenvolgende
 * nummers krijgen.
 */
export async function generateStudentNumbers(count: number): Promise<string[]> {
  if (count < 1) return [];
  const first = await generateStudentNumber();
  // Parse de prefix + start-suffix
  const lastDash = first.lastIndexOf("-");
  if (lastDash < 0) return [first]; // theoretisch onmogelijk
  const prefix = first.slice(0, lastDash + 1);
  const startSeq = parseInt(first.slice(lastDash + 1), 10);
  if (!Number.isFinite(startSeq)) return [first];

  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(`${prefix}${String(startSeq + i).padStart(4, "0")}`);
  }
  return result;
}
