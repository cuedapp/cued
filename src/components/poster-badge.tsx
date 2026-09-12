import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PosterBadgeVariant = "neutral" | "primary" | "danger";

export function PosterBadge({
  children,
  variant = "neutral",
  className,
  ...props
}: {
  children: ReactNode;
  variant?: PosterBadgeVariant;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-xs font-semibold leading-none shadow-sm backdrop-blur-sm",
        variant === "neutral" && "bg-black/70 text-white",
        variant === "primary" && "border-primary/30 bg-primary text-primary-foreground",
        variant === "danger" && "border-destructive/30 bg-destructive text-destructive-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
