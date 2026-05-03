// components/ui/Button.tsx

import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps {
  children:  React.ReactNode;
  variant?:  Variant;
  size?:     Size;
  href?:     string;
  external?: boolean;
  className?: string;
  disabled?:  boolean;
  onClick?:   () => void;
  type?:      "button" | "submit";
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-slate-mosque text-white hover:bg-slate-dark shadow-sm hover:shadow-md",
  secondary:
    "bg-taupe text-white hover:bg-taupe-dark shadow-sm hover:shadow-md",
  outline:
    "border-2 border-slate-mosque text-slate-mosque hover:bg-slate-mosque hover:text-white",
  ghost:
    "text-slate-mosque hover:bg-slate-mosque/10",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-lg",
};

export default function Button({
  children,
  variant  = "primary",
  size     = "md",
  href,
  external = false,
  className,
  disabled,
  onClick,
  type = "button",
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2",
    "font-body font-medium rounded-full",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-mosque focus-visible:ring-offset-2",
    disabled && "opacity-50 cursor-not-allowed pointer-events-none",
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {children}
    </button>
  );
}
