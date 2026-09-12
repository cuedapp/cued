"use client";

import { useState, useTransition } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { updateRecommendationFeedback } from "../recommendation-actions";

type HiddenRecommendation = {
  id: string;
  title: string;
  mediaType: string;
  tmdbId: number;
};

export function HiddenRecommendations({ items }: { items: HiddenRecommendation[] }) {
  const t = useTranslations("Recommendations");
  const router = useRouter();
  const [restoringIds, setRestoringIds] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const visibleItems = items.filter((item) => !restoringIds.has(item.id));

  function restore(id: string) {
    setRestoringIds((current) => new Set(current).add(id));
    const formData = new FormData();
    formData.set("recommendationId", id);
    formData.set("feedback", "restore");
    startTransition(async () => {
      const result = await updateRecommendationFeedback(formData);
      if (result?.error) {
        setRestoringIds((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        toast.error(t("restoreFailed"));
        return;
      }
      router.refresh();
    });
  }

  if (visibleItems.length === 0) return null;

  return (
    <details className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 marker:hidden">
        <div>
          <h2 className="font-display text-xl font-semibold">{t("hiddenTitle", { count: visibleItems.length })}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("hiddenHelp")}</p>
        </div>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-3 border-t border-border p-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleItems.map((item) => (
          <div
            key={item.id}
            className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3"
          >
            <Link
              href={`/title/${item.mediaType}/${item.tmdbId}` as never}
              className="truncate text-sm font-medium hover:text-primary hover:underline"
            >
              {item.title}
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 cursor-pointer text-primary"
              disabled={isPending}
              onClick={() => restore(item.id)}
            >
              <RotateCcw className="size-4" />
              {t("restore")}
            </Button>
          </div>
        ))}
      </div>
    </details>
  );
}
