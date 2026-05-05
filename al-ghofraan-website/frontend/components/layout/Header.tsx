// components/layout/Header.tsx
"use client";

import Link             from "next/link";
import Image            from "next/image";
import { useState }     from "react";
import { Menu, X }      from "lucide-react";
import { cn }           from "@/lib/utils";
import type { NavigationItem, SiteSettings } from "@/types/directus";

interface HeaderProps {
  settings:  SiteSettings | null;
  navItems?: NavigationItem[];
  logoUrl?:  string | null;
}

const FALLBACK_NAV: NavigationItem[] = [
  { id: "f1", label: "Home",         href: "/",               sort: 10, highlight: false, external: false, active: true },
  { id: "f2", label: "Over ons",     href: "/dawahcommissie", sort: 20, highlight: false, external: false, active: true },
  { id: "f3", label: "Agenda",       href: "/agenda",         sort: 30, highlight: false, external: false, active: true },
  { id: "f4", label: "Gebedstijden", href: "/gebedstijden",   sort: 40, highlight: false, external: false, active: true },
  { id: "f5", label: "Doneren",      href: "/doneren",        sort: 50, highlight: true,  external: false, active: true },
];

export default function Header({ settings, navItems, logoUrl }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const siteName = settings?.site_name || "Al-Ghofraan";
  const items = (navItems && navItems.length > 0 ? navItems : FALLBACK_NAV)
    .slice()
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / naam */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            onClick={() => setMenuOpen(false)}
          >
            {logoUrl ? (
              <div className="w-9 h-9 relative shrink-0">
                <Image
                  src={logoUrl}
                  alt={`${siteName} logo`}
                  fill
                  sizes="36px"
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              <div className="w-9 h-9 bg-slate-mosque rounded-xl flex items-center justify-center shrink-0 group-hover:bg-slate-dark transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M12 2l2 4h2l1 2H7l1-2h2l2-4z" fill="currentColor" opacity="0.9" />
                  <rect x="9"  y="8"  width="6"  height="12" rx="1"   fill="currentColor" />
                  <rect x="6"  y="18" width="12" height="2"  rx="0.5" fill="currentColor" />
                </svg>
              </div>
            )}
            <div>
              <div className="font-display text-lg leading-tight text-ink">
                {siteName}
              </div>
              <div className="font-body text-xs text-taupe leading-none tracking-wide">
                DawahCommissie
              </div>
            </div>
          </Link>

          {/* Desktop navigatie */}
          <nav className="hidden md:flex items-center gap-1">
            {items.map((item) => renderNavLink(item, false, () => setMenuOpen(false)))}
          </nav>

          {/* Mobiel menu-knop */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-ink hover:bg-sand transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu openen"
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Mobiel menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          menuOpen ? "max-h-[28rem] border-t border-sand-200" : "max-h-0"
        )}
      >
        <nav className="px-4 py-3 flex flex-col gap-1">
          {items.map((item) => renderNavLink(item, true, () => setMenuOpen(false)))}
        </nav>
      </div>
    </header>
  );
}

function renderNavLink(
  item: NavigationItem,
  mobile: boolean,
  onClick: () => void
) {
  const desktopBase      = "px-4 py-2 text-sm font-body rounded-lg transition-colors";
  const mobileBase       = "px-4 py-3 rounded-xl font-body text-base transition-colors";
  const desktopHighlight = "ml-2 px-5 py-2 bg-slate-mosque text-white text-sm font-medium font-body rounded-full hover:bg-slate-dark transition-colors";
  const mobileHighlight  = "bg-slate-mosque text-white text-center font-medium mt-2";

  const className = item.highlight
    ? (mobile ? `${mobileBase} ${mobileHighlight}` : desktopHighlight)
    : (mobile
        ? `${mobileBase} text-ink hover:bg-sand hover:text-slate-mosque`
        : `${desktopBase} text-ink hover:text-slate-mosque hover:bg-sand`);

  if (item.external) {
    return (
      <a
        key={item.id}
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={onClick}
      >
        {item.label}
      </a>
    );
  }

  return (
    <Link key={item.id} href={item.href} className={className} onClick={onClick}>
      {item.label}
    </Link>
  );
}
