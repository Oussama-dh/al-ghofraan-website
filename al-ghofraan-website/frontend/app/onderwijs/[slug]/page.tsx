// app/onderwijs/[slug]/page.tsx

import type { Metadata } from "next";
import { notFound }      from "next/navigation";
import Container         from "@/components/ui/Container";
import Button            from "@/components/ui/Button";
import { Icon }          from "@/lib/icons";
import RegistrationForm  from "@/components/registration/RegistrationForm";
import RegistrationFormReveal from "@/components/registration/RegistrationFormReveal";
import {
  getEducationProgramBySlug,
  getAssetUrl,
  getSiteSettings,
} from "@/lib/directus";
import { formatDate }    from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";
export const dynamicParams = true;


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = await getEducationProgramBySlug(params.slug);
  if (!program) return { title: "Onderwijsprogramma niet gevonden" };
  return {
    title:       program.title,
    description: program.description?.replace(/<[^>]+>/g, "").slice(0, 160),
  };
}

export default async function EducationProgramDetailPage({ params }: Props) {
  const [program, settings] = await Promise.all([
    getEducationProgramBySlug(params.slug),
    getSiteSettings(),
  ]);

  if (!program) notFound();

  const imageId =
    typeof program.image === "string" ? program.image : program.image?.id;
  const imageUrl = imageId ? getAssetUrl(imageId) : "";

  // ─── Flow-toggles met veilige defaults ──────────────────
  // Bij vermissing uit Directus (oud record, leeg veld) gebruiken
  // we dezelfde defaults als de DB-defaults uit seed-stap 11c:
  //   show_registration_form_immediately = false
  //   require_terms_acceptance           = true
  //   allow_multiple_students            = true
  const showImmediately      = program.show_registration_form_immediately === true;
  const requireTerms         = program.require_terms_acceptance !== false;
  const allowMultipleStudents = program.allow_multiple_students !== false;

  // Knoptekst: prefereer beheerbare tekst → fallback "Inschrijven"
  const inschrijfButtonText =
    (program.registration_button_text || "").trim() || "Inschrijven";

  // Het inschrijfformulier — wordt gebruikt in beide takken (direct of na
  // reveal). We renderen het hier één keer als JSX-tree zodat de
  // RegistrationFormReveal-wrapper hem als children kan ontvangen.
  const formNode = program.registration_enabled ? (
    <RegistrationForm
      type="education"
      sourceSlug={program.slug}
      sourceTitle={program.title}
      targetGender={program.target_gender ?? null}
      anchorId="inschrijven"
      contentTexts={{
        intro_title:     program.registration_intro_title,
        intro_text:      program.registration_intro_text,
        button_text:     program.registration_button_text,
        success_message: program.registration_success_message,
        extra_note:      program.registration_extra_note,
      }}
      termsUrl={settings?.registration_terms_url ?? null}
      termsLabel={settings?.registration_terms_label ?? null}
      requireTermsAcceptance={requireTerms}
      allowMultipleStudents={allowMultipleStudents}
    />
  ) : null;

  return (
    <>
      <section className="relative bg-slate-mosque text-white py-16 overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        {imageUrl && (
          <div className="absolute inset-0 opacity-20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={program.title} className="w-full h-full object-cover" />
          </div>
        )}
        <Container className="relative z-10">
          <Button
            href="/onderwijs"
            variant="ghost"
            size="sm"
            className="text-sand/70 hover:text-white mb-6 -ml-1"
          >
            ← Terug naar onderwijs
          </Button>
          <div className="max-w-2xl">
            {program.target_group && (
              <span className="inline-block bg-taupe text-white text-xs font-body px-3 py-1 rounded-full mb-4">
                {program.target_group}
              </span>
            )}
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white mb-4 leading-tight">
              {program.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-sand/80 text-sm font-body">
              {program.teacher && (
                <span className="flex items-center gap-2">
                  <Icon name="user" className="w-4 h-4" />
                  {program.teacher}
                </span>
              )}
              {program.start_date && (
                <span className="flex items-center gap-2">
                  <Icon name="calendar" className="w-4 h-4" />
                  vanaf {formatDate(program.start_date, "d MMMM yyyy")}
                </span>
              )}
              {program.end_date && (
                <span className="flex items-center gap-2">
                  t/m {formatDate(program.end_date, "d MMMM yyyy")}
                </span>
              )}
              {program.location && (
                <span className="flex items-center gap-2">
                  <Icon name="map-pin" className="w-4 h-4" />
                  {program.location}
                </span>
              )}
            </div>
          </div>
        </Container>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
          </svg>
        </div>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container narrow>
          {imageUrl && (
            // Flyer-presentatie: object-contain + aspect-ratio met max-h zorgt dat
            // verticale onderwijsflyers volledig zichtbaar blijven zonder de pagina
            // op te blazen op grote schermen (delivery 12).
            <div className="relative w-full aspect-[4/5] sm:aspect-[3/4] max-h-[70vh] rounded-2xl overflow-hidden mb-8 shadow-md bg-sand-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={program.title} className="absolute inset-0 w-full h-full object-contain" />
            </div>
          )}

          {/* Detail-grid: docent, doelgroep, planning, locatie */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            {program.teacher && (
              <DetailItem icon="user" label="Docent" value={program.teacher} />
            )}
            {program.target_group && (
              <DetailItem icon="users" label="Doelgroep" value={program.target_group} />
            )}
            {program.schedule && (
              <DetailItem icon="clock" label="Planning" value={program.schedule} />
            )}
            {program.location && (
              <DetailItem icon="map-pin" label="Locatie" value={program.location} />
            )}
          </div>

          {program.description && (
            <div
              className="prose prose-lg max-w-none font-body text-ink leading-relaxed prose-headings:font-display prose-headings:text-ink prose-a:text-slate-mosque mb-10"
              dangerouslySetInnerHTML={{ __html: program.description }}
            />
          )}

          {/* ─── Inschrijven-flow ──────────────────────────── */}
          {program.registration_enabled ? (
            showImmediately ? (
              // Direct zichtbaar: anchor-CTA + formulier eronder
              <>
                <div className="my-10 p-6 bg-white border border-sand-200 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="font-display text-xl text-ink">
                      Klaar om in te schrijven?
                    </h3>
                    <p className="font-body text-sm text-taupe-dark mt-1">
                      Vul het formulier hieronder in.
                      {allowMultipleStudents && " U kunt meerdere kinderen tegelijk inschrijven."}
                    </p>
                  </div>
                  <Button href="#inschrijven" variant="primary" className="shrink-0">
                    {inschrijfButtonText}
                  </Button>
                </div>
                <div className="mt-10">{formNode}</div>
              </>
            ) : (
              // Reveal-mode: alleen knop, formulier verschijnt na klik
              <div className="mt-10">
                <RegistrationFormReveal
                  buttonLabel={inschrijfButtonText}
                  anchorId="inschrijven"
                >
                  {formNode}
                </RegistrationFormReveal>
              </div>
            )
          ) : (
            <div className="mt-10 p-6 bg-sand-100 border border-sand-200 rounded-2xl text-center">
              <h3 className="font-display text-xl text-ink mb-2">Inschrijven gesloten</h3>
              <p className="font-body text-taupe-dark text-sm">
                Inschrijven is momenteel gesloten. Houd deze pagina in de gaten of
                neem contact met ons op voor meer informatie.
              </p>
            </div>
          )}

          <div className="mt-10 pt-6 border-t border-sand-200">
            <Button href="/onderwijs" variant="outline">
              ← Terug naar alle programma&apos;s
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}

// ─── Lokale helper ───────────────────────────────────────────
function DetailItem({
  icon,
  label,
  value,
}: {
  icon:  string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 p-4 bg-white border border-sand-200 rounded-xl">
      <div className="w-10 h-10 shrink-0 rounded-lg bg-slate-mosque/10 flex items-center justify-center text-slate-mosque">
        <Icon name={icon} className="w-5 h-5" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="font-body text-xs uppercase tracking-wider text-taupe">
          {label}
        </div>
        <div className="font-body text-ink mt-0.5 break-words">{value}</div>
      </div>
    </div>
  );
}
