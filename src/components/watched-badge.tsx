"use client";

import { Eye, PlayCircle } from "lucide-react";
import { Button } from "react-aria-components";
import { cn } from "@/lib/utils";
import { HoverTooltip } from "./hover-tooltip";
import { PosterBadge } from "./poster-badge";

export function WatchedBadge({
  label,
  compact = true,
  state = "watched",
  className,
}: {
  label: string;
  compact?: boolean;
  state?: "watched" | "partial";
  className?: string;
}) {
  const Icon = state === "partial" ? PlayCircle : Eye;
  if (!compact)
    return (
      <PosterBadge variant="primary" aria-label={label} className={className}>
        <Icon className="size-3.5" />
        {label}
      </PosterBadge>
    );

  return (
    <HoverTooltip label={label}>
      <Button
        aria-label={label}
        className={cn(
          "inline-grid size-7 shrink-0 cursor-default place-items-center rounded-full bg-primary text-primary-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-white",
          state === "partial" && "bg-amber-500 text-black",
          className,
        )}
      >
        <Icon className="size-4" />
      </Button>
    </HoverTooltip>
  );
}
