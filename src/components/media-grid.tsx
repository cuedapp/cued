import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MediaGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 justify-start gap-3 [&>*]:max-w-56 sm:grid-cols-[repeat(auto-fit,minmax(10rem,1fr))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
