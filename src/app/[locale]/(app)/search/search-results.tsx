"use client";

import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { FollowButton } from "@/components/follow-button";
import { MediaCapabilityBadges } from "@/components/media-capability-badges";
import { PosterBadge } from "@/components/poster-badge";
import { WatchedBadge } from "@/components/watched-badge";
import { MediaCard } from "@/components/media-card";
import { MediaGrid } from "@/components/media-grid";
import { RequestButton, type RequestOptions } from "@/components/request-button";
import { ShowMoreButton } from "@/components/show-more-button";
import { SearchFilters, type SearchFilterValues } from "./search-filters";

type SearchItem = {
  id: number;
  type: "movie" | "series" | "person";
  title: string;
  date?: string;
  imagePath?: string;
  popularity: number;
  rating?: number;
  genreIds?: number[];
  department?: string;
  available: boolean;
  watched: boolean;
  partiallyWatched: boolean;
  strmAvailable: boolean;
  strmPending: boolean;
  m3uAvailable: boolean;
  contentRatingAge?: number | null;
  restricted?: boolean;
};

export function SearchResults({
  query,
  locale,
  items,
  totalResults,
  totalPages,
  initialFilters,
  strmEnabled,
  requestable,
  requestOptions,
  allowRequestOptions,
  requestStates,
  following,
  heading,
}: {
  query: string;
  locale: string;
  items: SearchItem[];
  totalResults: number;
  totalPages: number;
  initialFilters: SearchFilterValues;
  strmEnabled: boolean;
  requestable: { movie: boolean; series: boolean };
  requestOptions: { movie: RequestOptions; series: RequestOptions };
  allowRequestOptions: boolean;
  requestStates: Record<string, "idle" | "pending" | "existing">;
  following: Record<string, boolean>;
  heading: string;
}) {
  const t = useTranslations("Search");
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [visibleItems, setVisibleItems] = useState(items);
  const [visibleRequestStates, setVisibleRequestStates] = useState(requestStates);
  const [visibleFollowing, setVisibleFollowing] = useState(following);
  const [nextPage, setNextPage] = useState(2);
  const [more, setMore] = useState(totalPages > 1);
  const [loadingMore, setLoadingMore] = useState(false);
  const decades = useMemo(
    () =>
      [
        ...new Set(
          visibleItems.flatMap((item) =>
            item.date ? [String(Math.floor(Number(item.date.slice(0, 4)) / 10) * 10)] : [],
          ),
        ),
      ]
        .filter((decade) => /^\d{4}$/.test(decade))
        .sort((a, b) => Number(b) - Number(a)),
    [visibleItems],
  );
  useEffect(() => {
    const syncFromUrl = () => {
      const next = searchFiltersFromUrl(window.location.search);
      setFilters(next);
      setAppliedFilters(next);
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  const filtered = useMemo(
    () =>
      visibleItems
        .filter((item) => appliedFilters.type === "all" || item.type === appliedFilters.type)
        .filter((item) => {
          if (appliedFilters.availability === "all") return true;
          if (item.type === "person") return false;
          if (appliedFilters.availability === "jellyfin") return item.available;
          if (appliedFilters.availability === "strm") return item.strmAvailable;
          if (appliedFilters.availability === "no-source")
            return !item.available && !item.strmAvailable && !item.m3uAvailable;
          return !item.available && !item.strmAvailable;
        })
        .filter((item) => {
          if (appliedFilters.watch === "all") return true;
          if (item.type === "person") return false;
          return appliedFilters.watch === "watched" ? item.watched : !item.watched;
        })
        .filter((item) => appliedFilters.rating === "all" || (item.rating ?? 0) >= Number(appliedFilters.rating))
        .filter((item) => {
          const genre = appliedFilters.genre;
          if (genre === "all") return true;
          return item.genreIds?.some((id) => genreIds[genre].includes(id));
        })
        .filter((item) => appliedFilters.decade === "all" || item.date?.startsWith(appliedFilters.decade.slice(0, 3)))
        .sort((a, b) => {
          if (appliedFilters.sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
          if (appliedFilters.sort === "year") return (b.date ?? "").localeCompare(a.date ?? "");
          if (appliedFilters.sort === "popularity") return b.popularity - a.popularity;
          return 0;
        }),
    [appliedFilters, visibleItems],
  );
  const updateFilters = (next: SearchFilterValues) => setFilters(next);
  const applyFilters = () => {
    setAppliedFilters(filters);
    const params = new URLSearchParams({ q: query });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== "all" && value !== "relevance") params.set(key, value);
    }
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  };
  const resetFilters = () => {
    const next: SearchFilterValues = {
      type: "all",
      availability: "all",
      watch: "all",
      rating: "all",
      genre: "all",
      decade: "all",
      sort: "relevance",
    };
    setFilters(next);
    setAppliedFilters(next);
    const params = new URLSearchParams({ q: query });
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  };
  const showMore = async () => {
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ q: query, page: String(nextPage), locale });
      const response = await fetch(`/api/search?${params}`);
      if (!response.ok) throw new Error("load failed");
      const next = (await response.json()) as {
        results: SearchItem[];
        page: number;
        totalPages: number;
        requestStates: Record<string, "idle" | "pending" | "existing">;
        following: Record<string, boolean>;
      };
      setVisibleItems((current) => {
        const seen = new Set(current.map((item) => `${item.type}:${item.id}`));
        return [...current, ...next.results.filter((item) => !seen.has(`${item.type}:${item.id}`))];
      });
      setVisibleRequestStates((current) => ({ ...current, ...next.requestStates }));
      setVisibleFollowing((current) => ({ ...current, ...next.following }));
      setNextPage(next.page + 1);
      setMore(next.page < next.totalPages);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <SearchFilters
        values={filters}
        decades={decades}
        strmEnabled={strmEnabled}
        onChange={updateFilters}
        onApply={applyFilters}
        onReset={resetFilters}
      />
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{heading}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("resultCount", { shown: filtered.length, total: totalResults })}
          </p>
        </div>
      </div>
      {filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {t("noFilteredResults")}
        </div>
      )}
      <MediaGrid density="compact">
        {filtered.map((item) => {
          const href = item.type === "person" ? `/people/${item.id}` : `/title/${item.type}/${item.id}`;
          const canRequest = item.type !== "person" && requestable[item.type];
          const hasRequest = item.type !== "person" && (canRequest || (strmEnabled && item.m3uAvailable));
          return (
            <MediaCard
              key={`${item.type}-${item.id}`}
              href={href}
              posterPath={item.imagePath}
              title={item.title}
              person={item.type === "person"}
              contentRatingAge={item.type === "person" ? undefined : item.contentRatingAge}
              restrictedReason={item.restricted ? t("restrictedByContentGuidance") : undefined}
              topLeft={
                item.rating !== undefined && item.rating > 0 ? (
                  <PosterBadge>
                    <Star className="size-3 fill-current text-primary" />
                    {item.rating.toFixed(1)}
                  </PosterBadge>
                ) : undefined
              }
              badges={
                item.type !== "person" ? (
                  <>
                    {item.watched && <WatchedBadge label={t("watched")} />}
                    {item.partiallyWatched && <WatchedBadge state="partial" label={t("partiallyWatched")} />}
                    <MediaCapabilityBadges
                      available={item.available}
                      strmAvailable={strmEnabled && item.strmAvailable}
                      strmPending={strmEnabled && item.strmPending}
                      strmRequestable={strmEnabled && item.m3uAvailable}
                      availableLabel={t("available")}
                      strmAvailableLabel={t("strmAvailable")}
                      strmPendingLabel={t("strmPending")}
                      strmRequestableLabel={t("strmRequestable")}
                    />
                  </>
                ) : undefined
              }
              meta={
                <>
                  <span>{t(`types.${item.type}`)}</span>
                  {item.date && <span> · {item.date.slice(0, 4)}</span>}
                </>
              }
              secondary={item.type === "person" ? item.department : undefined}
              footer={
                <div className={`grid ${hasRequest ? "grid-cols-2" : "grid-cols-1"}`}>
                  <FollowButton
                    targetType={item.type}
                    tmdbId={item.id}
                    initialFollowing={visibleFollowing[`${item.type}:${item.id}`] ?? false}
                    iconOnly
                  />
                  {hasRequest && item.type !== "person" && (
                    <div className="border-l border-border/60">
                      <RequestButton
                        type={item.type}
                        tmdbId={item.id}
                        compact
                        iconOnly
                        actionCell
                        tooltip={t("request")}
                        allowOptions={allowRequestOptions}
                        arrAvailable={canRequest}
                        strmAvailable={
                          strmEnabled &&
                          item.m3uAvailable &&
                          !item.available &&
                          !item.strmAvailable &&
                          !item.strmPending
                        }
                        strmAlreadyAvailable={strmEnabled && item.strmAvailable}
                        strmImportPending={strmEnabled && item.strmPending}
                        options={requestOptions[item.type]}
                        initialState={
                          item.available ? "available" : (visibleRequestStates[`${item.type}:${item.id}`] ?? "idle")
                        }
                      />
                    </div>
                  )}
                </div>
              }
            />
          );
        })}
      </MediaGrid>
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
    </>
  );
}

function searchFiltersFromUrl(search: string): SearchFilterValues {
  const params = new URLSearchParams(search);
  return {
    type: member(params.get("type"), ["all", "movie", "series", "person"] as const, "all"),
    availability: member(
      params.get("availability"),
      ["all", "jellyfin", "strm", "unavailable", "no-source"] as const,
      "all",
    ),
    watch: member(params.get("watch"), ["all", "watched", "unwatched"] as const, "all"),
    rating: member(params.get("rating"), ["all", "5", "6", "7", "8", "9"] as const, "all"),
    genre: member(
      params.get("genre"),
      [
        "all",
        "action",
        "animation",
        "comedy",
        "crime",
        "documentary",
        "drama",
        "family",
        "fantasy",
        "horror",
        "romance",
        "scifi",
        "thriller",
      ] as const,
      "all",
    ),
    decade: /^\d{4}$/.test(params.get("decade") ?? "") ? params.get("decade")! : "all",
    sort: member(params.get("sort"), ["relevance", "rating", "year", "popularity"] as const, "relevance"),
  };
}

const genreIds: Record<Exclude<SearchFilterValues["genre"], "all">, number[]> = {
  action: [12, 28, 10759],
  animation: [16],
  comedy: [35],
  crime: [80],
  documentary: [99],
  drama: [18],
  family: [10751, 10762],
  fantasy: [14, 10765],
  horror: [27],
  romance: [10749],
  scifi: [878, 10765],
  thriller: [53, 9648],
};

function member<const T extends readonly string[]>(value: string | null, values: T, fallback: T[number]): T[number] {
  return values.includes(value ?? "") ? (value as T[number]) : fallback;
}
