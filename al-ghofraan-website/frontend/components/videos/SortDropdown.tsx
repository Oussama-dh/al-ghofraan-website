"use client";

// components/videos/SortDropdown.tsx
//
// Lichte client-component voor de sorteer-dropdown op /videos.
// Auto-navigeert bij onChange — geen submit-knop nodig.
//
// We doen geen client-side state of fetch; alleen een navigate naar
// dezelfde URL met aangepaste `sort` query. Server-component rendert
// het resultaat. Categorie blijft behouden omdat we hem expliciet
// meegeven in de href.

import { useRouter } from "next/navigation";

interface SortOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  options:        ReadonlyArray<SortOption>;
  defaultValue:   string;
  categorySlug?:  string | null;
  /** Default sort wordt uit de URL gelaten om hem schoon te houden. */
  defaultSortValue: string;
}

export default function SortDropdown({
  options,
  defaultValue,
  categorySlug,
  defaultSortValue,
}: SortDropdownProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (next && next !== defaultSortValue) params.set("sort", next);
    const qs = params.toString();
    router.push(qs ? `/videos?${qs}` : "/videos");
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="videos-sort" className="font-body text-sm text-taupe-dark">
        Sorteer op
      </label>
      <select
        id="videos-sort"
        defaultValue={defaultValue}
        onChange={handleChange}
        className="rounded-full border border-sand-300 bg-white px-3 py-1.5 text-sm font-body text-ink focus:outline-none focus:ring-2 focus:ring-slate-mosque focus:border-slate-mosque"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
