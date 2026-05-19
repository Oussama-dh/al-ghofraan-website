// components/layout/Header.tsx
"use client";

import Link               from "next/link";
import { useState, useRef, useEffect } from "react";
import { Menu, X, ChevronDown }        from "lucide-react";
import { cn }             from "@/lib/utils";
import ThemeToggle        from "@/components/theme/ThemeToggle";
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

/**
 * Bouw een tree-structuur van de flat lijst: top-level items en hun
 * children. Eén niveau diep — een child kan niet zelf weer children
 * tonen (defensief).
 */
interface NavNode {
  item:     NavigationItem;
  children: NavigationItem[];
}

function buildNavTree(items: NavigationItem[]): NavNode[] {
  const sorted = items.slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const byId   = new Map(sorted.map((i) => [i.id, i]));

  const topLevel: NavNode[] = [];
  const childrenByParent = new Map<string, NavigationItem[]>();

  for (const item of sorted) {
    const parentId = item.parent;
    if (parentId && byId.has(parentId)) {
      const arr = childrenByParent.get(parentId) || [];
      arr.push(item);
      childrenByParent.set(parentId, arr);
    } else {
      topLevel.push({ item, children: [] });
    }
  }

  for (const node of topLevel) {
    node.children = childrenByParent.get(node.item.id) || [];
  }

  return topLevel;
}

export default function Header({ settings, navItems, logoUrl }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const siteName = settings?.site_name || "Al-Ghofraan";
  const subtitle = settings?.site_subtitle || "DawahCommissie";

  const tree = buildNavTree(
    navItems && navItems.length > 0 ? navItems : FALLBACK_NAV,
  );

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sand-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo / naam */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            onClick={closeMenu}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${siteName} logo`}
                className="h-10 md:h-12 w-auto max-w-[160px] object-contain shrink-0"
              />
            ) : (
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-mosque rounded-xl flex items-center justify-center shrink-0 group-hover:bg-slate-dark transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
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
              {subtitle && (
                <div className="font-body text-xs text-taupe leading-none tracking-wide">
                  {subtitle}
                </div>
              )}
            </div>
          </Link>

          {/* Desktop navigatie */}
          <nav className="hidden md:flex items-center gap-1">
            {tree.map((node) =>
              node.children.length > 0 ? (
                <DesktopDropdown
                  key={node.item.id}
                  parent={node.item}
                  childItems={node.children}
                  onNavigate={closeMenu}
                />
              ) : (
                renderNavLink(node.item, false, closeMenu)
              ),
            )}
            <ThemeToggle className="ml-2" />
          </nav>

          {/* Mobiel: theme-toggle naast hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              className="p-2 rounded-lg text-ink hover:bg-sand transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu openen"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobiel menu */}
      <div
        className={cn(
          "md:hidden transition-[max-height] duration-300 ease-in-out",
          menuOpen
            ? "max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain border-t border-sand-200"
            : "max-h-0 overflow-hidden"
        )}
      >
        <nav className="px-4 py-3 pb-6 flex flex-col gap-1">
          {tree.map((node) =>
            node.children.length > 0 ? (
              <MobileDropdown
                key={node.item.id}
                parent={node.item}
                childItems={node.children}
                onNavigate={closeMenu}
              />
            ) : (
              renderNavLink(node.item, true, closeMenu)
            ),
          )}
        </nav>
      </div>
    </header>
  );
}

// ─── Desktop dropdown ────────────────────────────────────────
// Parent-link blijft volledige link (klik gaat naar parent.href).
// Een aparte chevron-button ernaast toggelt de dropdown. Hover op
// de hele wrapper opent ook. Outside-click sluit.

function DesktopDropdown({
  parent,
  childItems,
  onNavigate,
}: {
  parent:     NavigationItem;
  childItems: NavigationItem[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Outside-click sluit
  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const desktopBase = "px-4 py-2 text-sm font-body rounded-lg transition-colors";

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center">
        {/* Parent-link blijft klikbaar */}
        <Link
          href={parent.href}
          className={cn(desktopBase, "text-ink hover:text-slate-mosque hover:bg-sand pr-2")}
          onClick={() => {
            onNavigate();
            setOpen(false);
          }}
        >
          {parent.label}
        </Link>
        {/* Chevron-button toggelt dropdown apart van de link */}
        <button
          type="button"
          className={cn(
            "px-1 py-2 rounded-lg text-ink hover:text-slate-mosque hover:bg-sand transition-colors",
            open && "text-slate-mosque",
          )}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label={`${parent.label} submenu ${open ? "sluiten" : "openen"}`}
        >
          <ChevronDown
            size={16}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute left-0 top-full mt-1 min-w-[200px] bg-white rounded-xl border border-sand-200 shadow-lg py-1.5 z-50",
          open ? "block" : "hidden",
        )}
        role="menu"
      >
        {childItems.map((child) =>
          child.external ? (
            <a
              key={child.id}
              href={child.href}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              className="block px-4 py-2 text-sm font-body text-ink hover:bg-sand hover:text-slate-mosque transition-colors"
              onClick={() => {
                onNavigate();
                setOpen(false);
              }}
            >
              {child.label}
            </a>
          ) : (
            <Link
              key={child.id}
              href={child.href}
              role="menuitem"
              className="block px-4 py-2 text-sm font-body text-ink hover:bg-sand hover:text-slate-mosque transition-colors"
              onClick={() => {
                onNavigate();
                setOpen(false);
              }}
            >
              {child.label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}

// ─── Mobile dropdown ─────────────────────────────────────────
// Parent-link is volledige tap-target naar parent.href. Aparte
// chevron-knop ernaast toggelt de children-collapse. Beide bereikbaar.

function MobileDropdown({
  parent,
  childItems,
  onNavigate,
}: {
  parent:     NavigationItem;
  childItems: NavigationItem[];
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);

  const mobileBase = "px-4 py-3 rounded-xl font-body text-base transition-colors";

  return (
    <div className="flex flex-col">
      <div className="flex items-center">
        {/* Parent-link — vult de meeste rij-breedte */}
        <Link
          href={parent.href}
          className={cn(
            mobileBase,
            "flex-1 text-ink hover:bg-sand hover:text-slate-mosque",
          )}
          onClick={onNavigate}
        >
          {parent.label}
        </Link>
        {/* Chevron-knop voor uitklap — los van de link */}
        <button
          type="button"
          className="p-3 ml-1 rounded-xl text-ink hover:bg-sand transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`Submenu van ${parent.label} ${open ? "sluiten" : "openen"}`}
        >
          <ChevronDown
            size={20}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {/* Children — inset onder de parent */}
      <div
        className={cn(
          "transition-[max-height] duration-200 ease-in-out overflow-hidden",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <div className="pl-4 flex flex-col gap-1 mt-1">
          {childItems.map((child) =>
            child.external ? (
              <a
                key={child.id}
                href={child.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(mobileBase, "text-ink hover:bg-sand hover:text-slate-mosque text-sm")}
                onClick={onNavigate}
              >
                {child.label}
              </a>
            ) : (
              <Link
                key={child.id}
                href={child.href}
                className={cn(mobileBase, "text-ink hover:bg-sand hover:text-slate-mosque text-sm")}
                onClick={onNavigate}
              >
                {child.label}
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Plain nav link (geen children) — ongewijzigd uit vorige versie ─

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
