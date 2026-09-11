import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function MediaGrid({
  children,
  className,
  density = "default",
}: {
  children: ReactNode;
  className?: string;
  density?: "default" | "compact";
}) {
  const gridClass =
    density === "compact"
      ? "grid grid-cols-2 items-stretch gap-3 *:min-w-0 sm:grid-cols-[repeat(auto-fill,minmax(13rem,1fr))]"
      : "grid grid-cols-2 items-stretch gap-3 *:min-w-0 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]";
  return <div className={cn(gridClass, className)}>{children}</div>;
}
