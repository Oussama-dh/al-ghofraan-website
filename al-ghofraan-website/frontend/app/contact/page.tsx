// app/contact/page.tsx

import type { Metadata } from "next";
import Container         from "@/components/ui/Container";
import SectionTitle      from "@/components/ui/SectionTitle";
import { Icon }          from "@/lib/icons";
import ContactForm       from "@/components/contact/ContactForm";
import {
  getPageContent,
  getSiteSettings,
  getContactSubjects,
} from "@/lib/directus";
import { buildWhatsAppUrl } from "@/lib/utils";

export const dynamic    = process.env.NODE_ENV !== "production" ? "force-dynamic" : "auto";
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const [page, settings] = await Promise.all([
    getPageContent("contact"),
    getSiteSettings(),
  ]);
  return {
    title:       page?.seo_title       || "Contact",
    description:
      page?.seo_description ||
      settings?.default_seo_description ||
      "Neem contact op met de DawahCommissie van moskee Al-Ghofraan.",
  };
}

export default async function ContactPage() {
  const [page, settings, subjects] = await Promise.all([
    getPageContent("contact"),
    getSiteSettings(),
    getContactSubjects(),
  ]);

  const title       = page?.title    || "Contact";
  const subtitle    = page?.subtitle || "Wij horen graag van u";
  const arabicTitle = page?.arabic_title || "اتصل بنا";
  const intro       = page?.intro;

  const email   = settings?.contact_email || null;
  const phone   = settings?.phone || null;
  const address = settings?.address || null;

  const whatsAppUrl = buildWhatsAppUrl(
    settings?.whatsapp_number,
    settings?.whatsapp_default_message
  );

  return (
    <>
      <section className="bg-slate-mosque py-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-overlay" />
        <Container className="relative z-10">
          <SectionTitle
            title={title}
            arabic={arabicTitle}
            subtitle={subtitle}
            light
          />
        </Container>
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 40" fill="none" preserveAspectRatio="none" className="w-full">
            <path d="M0,40 C360,0 1080,0 1440,40 L1440,40 L0,40 Z" fill="#f9f7f5" />
          </svg>
        </div>
      </section>

      <section className="bg-sand-50 py-12 lg:py-16">
        <Container>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Linker kolom — gegevens + WhatsApp + intro */}
            <div className="lg:col-span-1 space-y-6">
              {intro && (
                <p className="font-body text-base text-taupe-dark leading-relaxed">
                  {intro}
                </p>
              )}

              {/* Contactgegevens */}
              <div className="bg-white rounded-2xl border border-sand-200 p-6 space-y-4">
                <h3 className="font-display text-xl text-ink">Contactgegevens</h3>

                {address && (
                  <div className="flex items-start gap-3">
                    <Icon name="map-pin" className="w-5 h-5 text-slate-mosque mt-0.5 shrink-0" />
                    <span className="font-body text-sm text-taupe-dark whitespace-pre-line">
                      {address}
                    </span>
                  </div>
                )}

                {email && (
                  <div className="flex items-center gap-3">
                    <Icon name="mail" className="w-5 h-5 text-slate-mosque shrink-0" />
                    <a
                      href={`mailto:${email}`}
                      className="font-body text-sm text-ink hover:text-slate-mosque transition-colors"
                    >
                      {email}
                    </a>
                  </div>
                )}

                {phone && (
                  <div className="flex items-center gap-3">
                    <Icon name="phone" className="w-5 h-5 text-slate-mosque shrink-0" />
                    <a
                      href={`tel:${phone}`}
                      className="font-body text-sm text-ink hover:text-slate-mosque transition-colors"
                    >
                      {phone}
                    </a>
                  </div>
                )}
              </div>

              {/* WhatsApp-knop — alleen als nummer is ingesteld */}
              {whatsAppUrl && (
                <a
                  href={whatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 w-full px-6 py-4 rounded-2xl bg-[#25D366] text-white font-body font-medium hover:bg-[#1ebe57] transition-colors shadow-sm"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.149-.174.198-.298.297-.496.099-.198.05-.372-.025-.521-.074-.149-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.289.173-1.413z"/>
                  </svg>
                  Stuur ons een WhatsApp
                </a>
              )}
            </div>

            {/* Rechter kolom — formulier */}
            <div className="lg:col-span-2">
              <ContactForm subjects={subjects} />
            </div>
          </div>

          {/* Optionele body uit page_content */}
          {page?.body && (
            <div
              className="rich-text max-w-none mt-12"
              dangerouslySetInnerHTML={{ __html: page.body }}
            />
          )}
        </Container>
      </section>
    </>
  );
}
