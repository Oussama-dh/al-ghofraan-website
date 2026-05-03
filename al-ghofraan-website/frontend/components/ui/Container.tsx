// components/ui/Container.tsx

import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}

export default function Container({
  children,
  className,
  narrow = false,
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        narrow ? "max-w-3xl" : "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}
