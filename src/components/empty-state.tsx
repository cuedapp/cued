import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent, low-noise empty state used by browsing and activity surfaces. */
export function EmptyState({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-2xl border border-dashed border-border bg-card/40 px-5 py-10 text-center text-sm text-muted-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}
