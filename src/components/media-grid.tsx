import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MediaGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 justify-start gap-3 sm:grid-cols-[repeat(auto-fill,minmax(10rem,14rem))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
