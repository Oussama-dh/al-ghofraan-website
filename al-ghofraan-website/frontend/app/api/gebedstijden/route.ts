// app/api/gebedstijden/route.ts
// API route die het actieve CSV-bestand ophaalt uit Directus en parseert

import { NextResponse }              from "next/server";
import { getActivePrayerTimeFile, getAssetUrl } from "@/lib/directus";
import { parsePrayerTimesCSV }       from "@/lib/prayerTimes";

export const revalidate = 3600; // cache 1 uur

export async function GET() {
  try {
    // Haal het actieve gebedstijden-bestand op uit Directus
    const prayerFile = await getActivePrayerTimeFile();

    if (!prayerFile) {
      return NextResponse.json(
        { error: "Geen actief gebedstijden-bestand gevonden" },
        { status: 404 }
      );
    }

    const fileId =
      typeof prayerFile.file === "string"
        ? prayerFile.file
        : (prayerFile.file as { id: string })?.id;

    if (!fileId) {
      return NextResponse.json(
        { error: "Bestand-ID ontbreekt" },
        { status: 404 }
      );
    }

    /// Download het CSV-bestand van Directus
const assetUrl = getAssetUrl(fileId);

if (!assetUrl) {
  return NextResponse.json(
    { error: "Asset-URL ontbreekt" },
    { status: 404 }
  );
}

const token = process.env.DIRECTUS_TOKEN;
const headers: HeadersInit = token
  ? { Authorization: `Bearer ${token}` }
  : {};

const response = await fetch(assetUrl, {
  headers,
  cache: process.env.NODE_ENV === "development" ? "no-store" : "force-cache",
  next:
    process.env.NODE_ENV === "development"
      ? undefined
      : { revalidate: 3600 },
});

    if (!response.ok) {
      throw new Error(`Kon bestand niet downloaden: ${response.status}`);
    }

    const csvText = await response.text();
    const rows    = parsePrayerTimesCSV(csvText);

    return NextResponse.json({
      title:       prayerFile.title,
      year:        prayerFile.year,
      uploaded_at: prayerFile.uploaded_at,
      rows,
    });
  } catch (error) {
    console.error("Gebedstijden API fout:", error);
    return NextResponse.json(
      { error: "Er is een fout opgetreden bij het laden van de gebedstijden" },
      { status: 500 }
    );
  }
}
