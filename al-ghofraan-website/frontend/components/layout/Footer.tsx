// components/layout/Footer.tsx

import Link           from "next/link";
import type { SiteSettings } from "@/types/directus";

interface FooterProps {
  settings: SiteSettings | null;
}

export default function Footer({ settings }: FooterProps) {
  const year        = new Date().getFullYear();
  const siteName    = settings?.site_name    || "Al-Ghofraan";
  const email       = settings?.contact_email || "el-masoudi@hotmail.com";
  const phone       = settings?.phone;
  const address     = settings?.address;
  const socialLinks = settings?.social_links  || {};

  return (
    <footer className="bg-slate-mosque text-white">
      {/* Geometrisch patroon boven footer */}
      <div className="h-1 bg-taupe/60" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Kolom 1: Branding */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-display text-2xl text-white mb-1">
                {siteName}
              </div>
              <div
                className="font-arabic text-lg text-sand/70"
                lang="ar"
              >
                المسجد الغفران
              </div>
            </div>
            <p className="font-body text-sm text-sand/70 leading-relaxed max-w-xs">
              De DawahCommissie van moskee Al-Ghofraan organiseert lezingen,
              activiteiten en programma's voor de moslimgemeenschap.
            </p>

            {/* Sociale media */}
            {Object.keys(socialLinks).length > 0 && (
              <div className="flex gap-3 mt-2">
                {socialLinks.facebook && (
                  <SocialLink href={socialLinks.facebook} label="Facebook">
                    <FacebookIcon />
                  </SocialLink>
                )}
                {socialLinks.instagram && (
                  <SocialLink href={socialLinks.instagram} label="Instagram">
                    <InstagramIcon />
                  </SocialLink>
                )}
                {socialLinks.youtube && (
                  <SocialLink href={socialLinks.youtube} label="YouTube">
                    <YouTubeIcon />
                  </SocialLink>
                )}
                {socialLinks.whatsapp && (
                  <SocialLink href={socialLinks.whatsapp} label="WhatsApp">
                    <WhatsAppIcon />
                  </SocialLink>
                )}
              </div>
            )}
          </div>

          {/* Kolom 2: Navigatie */}
          <div>
            <h3 className="font-body text-sm uppercase tracking-widest text-taupe mb-4 font-semibold">
              Navigatie
            </h3>
            <ul className="flex flex-col gap-2">
              {[
                { href: "/",               label: "Home" },
                { href: "/dawahcommissie", label: "Over de DawahCommissie" },
                { href: "/agenda",         label: "Agenda & Activiteiten" },
                { href: "/gebedstijden",   label: "Gebedstijden" },
                { href: "/doneren",        label: "Doneren" },
              ].map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="font-body text-sm text-sand/70 hover:text-white transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Kolom 3: Contact */}
          <div>
            <h3 className="font-body text-sm uppercase tracking-widest text-taupe mb-4 font-semibold">
              Contact
            </h3>
            <ul className="flex flex-col gap-3">
              {address && (
                <li className="flex items-start gap-2 text-sm text-sand/70">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span>{address}</span>
                </li>
              )}
              <li className="flex items-center gap-2 text-sm text-sand/70">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <a
                  href={`mailto:${email}`}
                  className="hover:text-white transition-colors"
                >
                  {email}
                </a>
              </li>
              {phone && (
                <li className="flex items-center gap-2 text-sm text-sand/70">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.27h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6.29 6.29l1.9-1.9a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                  <a
                    href={`tel:${phone}`}
                    className="hover:text-white transition-colors"
                  >
                    {phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Onderbalk */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-sand/50 font-body">
          <span>
            © {year} {siteName} — DawahCommissie. Alle rechten voorbehouden.
          </span>
          <span className="font-arabic text-sm" lang="ar">
            بسم الله الرحمن الرحيم
          </span>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
    >
      {children}
    </a>
  );
}

function FacebookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58a2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  );
}
