// components/layout/Header.tsx
"use client";

import Link             from "next/link";
import { useState }     from "react";
import { cn }           from "@/lib/utils";
import type { SiteSettings } from "@/types/directus";

interface HeaderProps {
  settings: SiteSettings | null;
}

const NAV_ITEMS = [
  { href: "/",               label: "Home" },
  { href: "/dawahcommissie", label: "Over ons" },
  { href: "/agenda",         label: "Agenda" },
  { href: "/gebedstijden",   label: "Gebedstijden" },
  { href: "/doneren",        label: "Doneren" },
];

export default function Header({ settings }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const siteName = settings?.site_name || "Al-Ghofraan";

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
            {/* Geometrisch logo-icoon */}
            <div className="w-9 h-9 bg-slate-mosque rounded-xl flex items-center justify-center shrink-0 group-hover:bg-slate-dark transition-colors">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-white"
              >
                {/* Minaret-silhouet */}
                <path
                  d="M12 2l2 4h2l1 2H7l1-2h2l2-4z"
                  fill="currentColor"
                  opacity="0.9"
                />
                <rect x="9" y="8" width="6" height="12" rx="1" fill="currentColor" />
                <rect x="6" y="18" width="12" height="2" rx="0.5" fill="currentColor" />
              </svg>
            </div>
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
            {NAV_ITEMS.map((item) =>
              item.label === "Doneren" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className="ml-2 px-5 py-2 bg-slate-mosque text-white text-sm font-medium font-body rounded-full hover:bg-slate-dark transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-body text-ink hover:text-slate-mosque hover:bg-sand rounded-lg transition-colors"
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          {/* Mobiel menu-knop */}
          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-ink hover:bg-sand transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu openen"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="8" x2="21" y2="8" />
                  <line x1="3" y1="16" x2="21" y2="16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobiel menu */}
      <div
        className={cn(
          "md:hidden overflow-hidden transition-all duration-300 ease-in-out",
          menuOpen ? "max-h-96 border-t border-sand-200" : "max-h-0"
        )}
      >
        <nav className="px-4 py-3 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "px-4 py-3 rounded-xl font-body text-base transition-colors",
                item.label === "Doneren"
                  ? "bg-slate-mosque text-white text-center font-medium mt-2"
                  : "text-ink hover:bg-sand hover:text-slate-mosque"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
