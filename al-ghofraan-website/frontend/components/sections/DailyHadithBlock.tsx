// components/sections/DailyHadithBlock.tsx
//
// Server-component voor de "Hadith van de dag"-blok op de homepage.
// Self-guarded: rendert niets zonder hadith of zonder vertaling.
//
// Design-conventies (consistent met AyahBlock):
//   - zand-achtergrond, narrow container, gecentreerd
//   - Bogart Arabic font voor Arabische tekst (font-arabic, RTL)
//   - Nederlandse vertaling in cursief
//   - bron + authenticiteit in kleinere taupe-tekst
//   - optionele uitleg onder met subtiele divider

import type { DailyHadith } from "@/types/directus";
import Container             from "@/components/ui/Container";
import { BookOpen }          from "lucide-react";

interface DailyHadithBlockProps {
  hadith?: DailyHadith | null;
}

export default function DailyHadithBlock({ hadith }: DailyHadithBlockProps) {
  // Self-guard: zonder hadith of zonder vertaling renderen we niets.
  // (Vertaling is verplicht in de seed-validatie, maar defensief check.)
  if (!hadith) return null;
  const translation = hadith.translation_nl?.trim();
  if (!translation) return null;

  const arabic     = hadith.arabic_text?.trim() || "";
  const source     = hadith.source?.trim() || "";
  const grade      = hadith.grade?.trim() || "";
  const explanation = hadith.explanation_short?.trim() || "";

  return (
    <section className="bg-sand-50 pt-8 pb-4" aria-labelledby="hadith-of-the-day-heading">
      <Container narrow>
        <article className="rounded-2xl bg-white border border-sand-200 p-6 sm:p-8 text-center">
          {/* Heading — vast, niet uit DB */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-slate-mosque" />
            <h2
              id="hadith-of-the-day-heading"
              className="font-display text-lg text-slate-mosque"
            >
              Hadith van de dag
            </h2>
          </div>

          {/* Arabische tekst — optioneel */}
          {arabic && (
            <p
              className="font-arabic text-2xl sm:text-3xl text-ink leading-loose mb-4"
              lang="ar"
              dir="rtl"
            >
              {arabic}
            </p>
          )}

          {/* Nederlandse vertaling */}
          <p className="font-body text-base sm:text-lg text-ink italic leading-relaxed">
            &ldquo;{translation}&rdquo;
          </p>

          {/* Bron + authenticiteit */}
          {(source || grade) && (
            <p className="font-body text-xs sm:text-sm text-taupe-dark mt-3">
              {source}
              {source && grade && " — "}
              {grade}
            </p>
          )}

          {/* Korte uitleg — onder subtiele divider */}
          {explanation && (
            <>
              <div className="my-4 mx-auto w-12 h-px bg-sand-200" aria-hidden />
              <p className="font-body text-sm text-taupe-dark leading-relaxed max-w-prose mx-auto">
                {explanation}
              </p>
            </>
          )}
        </article>
      </Container>
    </section>
  );
}
