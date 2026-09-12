"use client";

import { useState } from "react";
import { Clock3, Film, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LibraryPoster } from "@/components/library-poster";
import { ShowMoreButton } from "@/components/show-more-button";
import { RatingForm } from "./rating-form";
import { EmptyState } from "@/components/empty-state";

export type HistoryBrowserItem = {
  id: string;
  name: string;
  kind: "movie" | "series" | "season";
  tmdbId: number | null;
  seriesTmdbId: number | null;
  seriesName: string | null;
  removedAt: string | null;
  played: boolean;
  rating: number | null;
  feedback: string | null;
  tags: string[];
  excluded: boolean | null;
  watchedLabel: string;
  progressLabel: string;
  unavailableLabel: string;
};

export function HistoryBrowser({ items, tagOrder }: { items: HistoryBrowserItem[]; tagOrder: string[] }) {
  const t = useTranslations("History");
  const [visibleCount, setVisibleCount] = useState(20);
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleItems.length < items.length;

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {t("showing", { shown: visibleItems.length, total: items.length })}
      </p>
      {items.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <div className="grid gap-4">
          {visibleItems.map((item) => {
            const titleHref =
              item.tmdbId && (item.kind === "movie" || item.kind === "series")
                ? (`/title/${item.kind}/${item.tmdbId}` as const)
                : undefined;
            const seasonHref =
              item.kind === "season" && item.seriesTmdbId ? (`/title/series/${item.seriesTmdbId}` as const) : undefined;
            const title = item.kind === "season" && item.seriesName ? `${item.seriesName} · ${item.name}` : item.name;
            return (
              <article key={item.id} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
                <div className="flex gap-4 sm:gap-5">
                  <div className="relative aspect-2/3 w-20 shrink-0 self-start overflow-hidden rounded-xl bg-muted sm:w-28">
                    {item.removedAt ? (
                      <div className="grid size-full place-items-center gap-2 px-2 text-center text-xs text-muted-foreground">
                        <Film className="size-8" />
                        <span>{item.unavailableLabel}</span>
                      </div>
                    ) : (
                      <LibraryPoster mediaItemId={item.id} title={item.name} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <Clock3 className="size-3.5 shrink-0" />
                      <span>{item.watchedLabel}</span>
                    </div>
                    {titleHref || seasonHref ? (
                      <Link
                        href={titleHref ?? seasonHref!}
                        className="mt-2 block font-display text-2xl font-semibold hover:text-primary"
                      >
                        {title}
                      </Link>
                    ) : (
                      <h2 className="mt-2 font-display text-2xl font-semibold">{title}</h2>
                    )}
                    <p className="mt-1 text-sm text-muted-foreground">{item.progressLabel}</p>
                    {item.rating && (
                      <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary">
                        <Star className="size-3.5 fill-current" />
                        {item.rating}/5
                      </div>
                    )}
                  </div>
                </div>
                <RatingForm
                  mediaItemId={item.id}
                  rating={item.rating}
                  feedback={item.feedback}
                  tags={item.tags}
                  excluded={item.excluded}
                  tagOrder={tagOrder}
                />
              </article>
            );
          })}
        </div>
      )}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <ShowMoreButton
            onShowMore={() => setVisibleCount((count) => count + 20)}
            label={t("showMore")}
            loadingLabel={t("loadingMore")}
          />
        </div>
      )}
    </>
  );
}
