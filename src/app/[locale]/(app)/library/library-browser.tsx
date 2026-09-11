"use client";

import { ArchiveX, Film, Star, Tv } from "lucide-react";
import { formatScoreOutOfTen } from "@/lib/ratings";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LibraryPoster } from "@/components/library-poster";
import { MediaGrid } from "@/components/media-grid";
import { EmptyState } from "@/components/empty-state";
import { RatingSourceIcon } from "@/components/media-ratings";
import { RecommendationCardActions } from "@/components/recommendation-card-actions";
import { ShowMoreButton } from "@/components/show-more-button";
import { ContentRatingBadge } from "@/components/content-rating-badge";

export type LibraryBrowserItem = {
  id: string;
  tmdbId: number | null;
  mediaType: "movie" | "series";
  title: string;
  year?: number;
  overview: string;
  reasons: string[];
  genreIds: number[];
  matchPercent: number;
  score: number;
  rating: {
    source: "jellyfin" | "tmdb" | "imdb" | "rottenTomatoes" | "metacritic" | "trakt";
    value: number;
    scale: number;
    normalizedScore: number;
    votes: number | null;
  } | null;
  contentRating: string | null;
  contentRatingAge: number | null;
  removedAt: string | null;
};

export function LibraryBrowser({
  items,
  feedback,
  following,
  hasMore,
  nextPage,
  total,
  query,
}: {
  items: LibraryBrowserItem[];
  feedback: Record<string, string | null>;
  following: Record<string, boolean>;
  hasMore: boolean;
  nextPage: number;
  total: number;
  query: Record<string, string>;
}) {
  const t = useTranslations("Library");
  const [visibleItems, setVisibleItems] = useState(items);
  const [visibleFeedback, setVisibleFeedback] = useState(feedback);
  const [visibleFollowing, setVisibleFollowing] = useState(following);
  const [page, setPage] = useState(nextPage);
  const [more, setMore] = useState(hasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  async function showMore() {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams(query);
      params.set("page", String(page));
      const response = await fetch(`/api/library?${params}`);
      if (!response.ok) throw new Error("load failed");
      const next = (await response.json()) as {
        items: LibraryBrowserItem[];
        page: number;
        hasMore: boolean;
        feedback: Record<string, string | null>;
        following: Record<string, boolean>;
      };
      setVisibleItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !seen.has(item.id))];
      });
      setVisibleFeedback((current) => ({ ...current, ...next.feedback }));
      setVisibleFollowing((current) => ({ ...current, ...next.following }));
      setPage(next.page + 1);
      setMore(next.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      {visibleItems.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{t("showing", { shown: visibleItems.length, total })}</p>
          <MediaGrid density="compact">
            {visibleItems.map((item) => {
              const Icon = item.mediaType === "movie" ? Film : Tv;
              const body = (
                <>
                  <div className="relative">
                    {item.removedAt ? (
                      <div className="grid aspect-2/3 place-items-center bg-muted px-4 text-center text-muted-foreground">
                        <div>
                          <ArchiveX className="mx-auto size-10" />
                          <p className="mt-3 text-xs font-medium">{t("removed")}</p>
                        </div>
                      </div>
                    ) : (
                      <LibraryPoster mediaItemId={item.id} title={item.title} />
                    )}
                    <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-linear-to-b from-black/70 to-transparent p-2 text-white">
                      {item.rating ? (
                        <span
                          className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold tabular-nums shadow-sm"
                          aria-label={t("ratingValue", {
                            source: t(`ratingSources.${item.rating.source}`),
                            rating: formatRating(item.rating.value, item.rating.scale),
                          })}
                        >
                          {item.rating.source === "jellyfin" ? (
                            <Star className="size-3.5 fill-current text-amber-400" />
                          ) : (
                            <RatingSourceIcon source={item.rating.source} compact />
                          )}
                          {formatRating(item.rating.value, item.rating.scale)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-medium">
                          <Icon className="size-3.5" />
                          {t(`types.${item.mediaType}`)}
                        </span>
                      )}
                      {item.removedAt ? (
                        <span className="rounded-full bg-destructive px-2 py-1 text-xs font-semibold text-destructive-foreground">
                          {t("removed")}
                        </span>
                      ) : item.rating ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-medium">
                          <Icon className="size-3.5" />
                          {t(`types.${item.mediaType}`)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="p-3">
                    <h2 className="line-clamp-2 font-medium leading-5 group-hover:text-primary">{item.title}</h2>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {item.year && <span>{item.year}</span>}
                      <ContentRatingBadge age={item.contentRatingAge} />
                    </div>
                    {item.overview && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.overview}</p>
                    )}
                  </div>
                </>
              );
              return (
                <article
                  key={item.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
                >
                  {item.tmdbId ? (
                    <Link
                      href={`/title/${item.mediaType}/${item.tmdbId}` as never}
                      className="block flex-1 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {body}
                    </Link>
                  ) : (
                    body
                  )}
                  {item.tmdbId && (
                    <div className="border-t border-border/60">
                      <RecommendationCardActions
                        feedbackTarget={{
                          mediaType: item.mediaType,
                          tmdbId: item.tmdbId,
                          title: item.title,
                          overview: item.overview,
                        }}
                        feedback={visibleFeedback[`${item.mediaType}:${item.tmdbId}`] ?? null}
                        follow={{
                          targetType: item.mediaType,
                          tmdbId: item.tmdbId,
                          initialFollowing: visibleFollowing[`${item.mediaType}:${item.tmdbId}`] ?? false,
                        }}
                      />
                    </div>
                  )}
                </article>
              );
            })}
          </MediaGrid>
        </>
      )}
      {more && (
        <div className="flex justify-center">
          <ShowMoreButton
            onShowMore={showMore}
            loading={loadingMore}
            label={t("showMore")}
            loadingLabel={t("loadingMore")}
          />
        </div>
      )}
    </div>
  );
}

function formatRating(value: number, scale: number) {
  return formatScoreOutOfTen(value, scale);
}
