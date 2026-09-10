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
      ? "flex flex-wrap items-stretch gap-3 [&>*]:min-w-0 [&>*]:max-w-56 [&>*]:flex-[1_1_10rem] sm:[&>*]:max-w-56"
      : "flex flex-wrap items-stretch gap-3 [&>*]:min-w-0 [&>*]:max-w-56 [&>*]:flex-[1_1_12rem] sm:[&>*]:max-w-56";
  return <div className={cn(gridClass, className)}>{children}</div>;
}
