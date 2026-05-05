// components/layout/Footer.tsx

import Link  from "next/link";
import Image from "next/image";
import { Icon } from "@/lib/icons";
import type { NavigationItem, SiteSettings } from "@/types/directus";

interface FooterProps {
  settings:     SiteSettings | null;
  navItems?:    NavigationItem[];
  logoUrl?:     string | null;
  emailIcon?:   string;
  phoneIcon?:   string;
  addressIcon?: string;
}

const FALLBACK_NAV: NavigationItem[] = [
  { id: "f1", label: "Home",                  href: "/",               sort: 10, highlight: false, external: false, active: true },
  { id: "f2", label: "Over de DawahCommissie", href: "/dawahcommissie", sort: 20, highlight: false, external: false, active: true },
  { id: "f3", label: "Agenda",                href: "/agenda",         sort: 30, highlight: false, external: false, active: true },
  { id: "f4", label: "Gebedstijden",          href: "/gebedstijden",   sort: 40, highlight: false, external: false, active: true },
  { id: "f5", label: "Doneren",               href: "/doneren",        sort: 50, highlight: true,  external: false, active: true },
];

const FALLBACK_FOOTER_TEXT =
  "De DawahCommissie van moskee Al-Ghofraan organiseert lezingen, " +
  "activiteiten en programma's voor de moslimgemeenschap.";

export default function Footer({
  settings,
  navItems,
  logoUrl,
  emailIcon   = "mail",
  phoneIcon   = "phone",
  addressIcon = "map-pin",
}: FooterProps) {
  const year       = new Date().getFullYear();
  const siteName   = settings?.site_name      || "Al-Ghofraan";
  const email      = settings?.contact_email   || "el-masoudi@hotmail.com";
  const phone      = settings?.phone           || null;
  const address    = settings?.address         || null;
  const social     = settings?.social_links    || {};
  const footerText = settings?.footer_text     || FALLBACK_FOOTER_TEXT;
  const copyright  = settings?.copyright_text  ||
    `© ${year} ${siteName} — DawahCommissie. Alle rechten voorbehouden.`;

  const items = (navItems && navItems.length > 0 ? navItems : FALLBACK_NAV)
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return (
    <footer className="bg-slate-mosque text-white">
      <div className="h-1 bg-taupe/60" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Branding */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {logoUrl && (
                <div className="w-10 h-10 relative shrink-0 bg-white/10 rounded-lg p-1.5">
                  <Image
                    src={logoUrl}
                    alt={`${siteName} logo`}
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </div>
              )}
              <div>
                <div className="font-display text-2xl text-white">{siteName}</div>
                <div className="font-arabic text-base text-sand/70" lang="ar">
                  المسجد الغفران
                </div>
              </div>
            </div>
            <p className="font-body text-sm text-sand/70 leading-relaxed max-w-xs">
              {footerText}
            </p>

{social && Object.values(social).some(Boolean) && (
  <div className="flex flex-wrap gap-3 mt-2 text-sm">
    {social.facebook && (
      <Link
        href={social.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-bluegray transition-colors"
      >
        Facebook
      </Link>
    )}

    {social.instagram && (
      <Link
        href={social.instagram}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-bluegray transition-colors"
      >
        Instagram
      </Link>
    )}

    {social.youtube && (
      <Link
        href={social.youtube}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-bluegray transition-colors"
      >
        YouTube
      </Link>
    )}
  </div>
)}
          </div>

          {/* Navigatie */}
          <div>
            <h3 className="font-body text-sm uppercase tracking-widest text-taupe mb-4 font-semibold">
              Navigatie
            </h3>
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <li key={item.id}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-body text-sm text-sand/70 hover:text-white transition-colors"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className="font-body text-sm text-sand/70 hover:text-white transition-colors"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-body text-sm uppercase tracking-widest text-taupe mb-4 font-semibold">
              Contact
            </h3>
            <ul className="flex flex-col gap-3">
              {address && (
                <li className="flex items-start gap-2 text-sm text-sand/70">
                  <Icon name={addressIcon} className="w-4 h-4 mt-0.5 shrink-0" />
                  <span className="whitespace-pre-line">{address}</span>
                </li>
              )}
              {email && (
                <li className="flex items-center gap-2 text-sm text-sand/70">
                  <Icon name={emailIcon} className="w-4 h-4 shrink-0" />
                  <a href={`mailto:${email}`} className="hover:text-white transition-colors">
                    {email}
                  </a>
                </li>
              )}
              {phone && (
                <li className="flex items-center gap-2 text-sm text-sand/70">
                  <Icon name={phoneIcon} className="w-4 h-4 shrink-0" />
                  <a href={`tel:${phone}`} className="hover:text-white transition-colors">
                    {phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-sand/50 font-body">
          <span>{copyright}</span>
          <span className="font-arabic text-sm" lang="ar">بسم الله الرحمن الرحيم</span>
        </div>
      </div>
    </footer>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
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
