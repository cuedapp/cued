"use client";

import { useTranslations } from "next-intl";
import { displayContentRating } from "@/lib/content-rating";
import { cn } from "@/lib/utils";

export function ContentRatingBadge({
  age,
  variant = "compact",
}: {
  age?: number | null;
  variant?: "compact" | "detail";
}) {
  const t = useTranslations("ContentRating");
  const label = displayContentRating(age, t("allAges"));
  if (!label) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border/80 font-medium text-foreground",
        variant === "detail" ? "bg-background/70 px-2 py-0.5 text-xs" : "px-1.5 py-0.5",
      )}
    >
      {variant === "detail" ? t("detail", { rating: label }) : label}
    </span>
  );
}
