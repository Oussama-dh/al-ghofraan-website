// components/ui/SectionTitle.tsx

import { cn } from "@/lib/utils";

interface SectionTitleProps {
  title:      string;
  subtitle?:  string;
  arabic?:    string;
  align?:     "left" | "center" | "right";
  className?: string;
  light?:     boolean;
}

export default function SectionTitle({
  title,
  subtitle,
  arabic,
  align     = "center",
  className,
  light     = false,
}: SectionTitleProps) {
  const alignClass = {
    left:   "items-start text-left",
    center: "items-center text-center",
    right:  "items-end text-right",
  }[align];

  return (
    <div className={cn("flex flex-col gap-2", alignClass, className)}>
      {arabic && (
        <span
          className={cn(
            "font-arabic text-2xl leading-relaxed",
            light ? "text-sand/70" : "text-taupe"
          )}
          lang="ar"
        >
          {arabic}
        </span>
      )}

      {/* Sierlijk lijntje boven de titel */}
      <div
        className={cn(
          "flex items-center gap-3",
          align === "center" && "justify-center"
        )}
      >
        <span
          className={cn(
            "block h-px w-8",
            light ? "bg-sand/40" : "bg-taupe/50"
          )}
        />
        <span
          className={cn(
            "text-xs font-body uppercase tracking-[0.2em] font-medium",
            light ? "text-sand/60" : "text-taupe"
          )}
        >
          Al-Ghofraan
        </span>
        <span
          className={cn(
            "block h-px w-8",
            light ? "bg-sand/40" : "bg-taupe/50"
          )}
        />
      </div>

      <h2
        className={cn(
          "font-display text-3xl sm:text-4xl leading-tight text-balance",
          light ? "text-white" : "text-ink"
        )}
      >
        {title}
      </h2>

      {subtitle && (
        <p
          className={cn(
            "max-w-xl font-body text-base sm:text-lg leading-relaxed mt-1",
            light ? "text-sand/80" : "text-taupe-dark"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
