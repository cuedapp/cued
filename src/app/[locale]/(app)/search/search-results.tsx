"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { FollowButton } from "@/components/follow-button";
import { MediaCapabilityBadges } from "@/components/media-capability-badges";
import { MediaCard } from "@/components/media-card";
import { Pagination } from "@/components/pagination";
import { RequestButton, type RequestOptions } from "@/components/request-button";
import { SearchFilters, type SearchFilterValues } from "./search-filters";
import { SearchResultsSkeleton } from "./search-results-skeleton";

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
  strmAvailable: boolean;
  strmPending: boolean;
  m3uAvailable: boolean;
};

export function SearchResults({
  query,
  items,
  totalResults,
  page,
  totalPages,
  initialFilters,
  strmEnabled,
  requestable,
  requestOptions,
  allowRequestOptions,
  requestStates,
  following,
}: {
  query: string;
  items: SearchItem[];
  totalResults: number;
  page: number;
  totalPages: number;
  initialFilters: SearchFilterValues;
  strmEnabled: boolean;
  requestable: { movie: boolean; series: boolean };
  requestOptions: { movie: RequestOptions; series: RequestOptions };
  allowRequestOptions: boolean;
  requestStates: Record<string, "idle" | "pending" | "existing">;
  following: Record<string, boolean>;
}) {
  const t = useTranslations("Search");
  const router = useRouter();
  const [filters, setFilters] = useState(initialFilters);
  const [isPagePending, startPageTransition] = useTransition();
  const decades = useMemo(
    () =>
      [
        ...new Set(
          items.flatMap((item) => (item.date ? [String(Math.floor(Number(item.date.slice(0, 4)) / 10) * 10)] : [])),
        ),
      ]
        .filter((decade) => /^\d{4}$/.test(decade))
        .sort((a, b) => Number(b) - Number(a)),
    [items],
  );
  useEffect(() => {
    const syncFromUrl = () => setFilters(searchFiltersFromUrl(window.location.search));
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);
  const filtered = useMemo(
    () =>
      items
        .filter((item) => filters.type === "all" || item.type === filters.type)
        .filter((item) => {
          if (filters.availability === "all") return true;
          if (item.type === "person") return false;
          if (filters.availability === "jellyfin") return item.available;
          if (filters.availability === "strm") return item.strmAvailable;
          if (filters.availability === "no-source") return !item.available && !item.strmAvailable && !item.m3uAvailable;
          return !item.available && !item.strmAvailable;
        })
        .filter((item) => filters.rating === "all" || (item.rating ?? 0) >= Number(filters.rating))
        .filter((item) => {
          const genre = filters.genre;
          if (genre === "all") return true;
          return item.genreIds?.some((id) => genreIds[genre].includes(id));
        })
        .filter((item) => filters.decade === "all" || item.date?.startsWith(filters.decade.slice(0, 3)))
        .sort((a, b) => {
          if (filters.sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
          if (filters.sort === "year") return (b.date ?? "").localeCompare(a.date ?? "");
          if (filters.sort === "popularity") return b.popularity - a.popularity;
          return 0;
        }),
    [filters, items],
  );
  const updateFilters = (next: SearchFilterValues) => {
    setFilters(next);
    const params = new URLSearchParams({ q: query });
    if (page > 1) params.set("page", String(page));
    for (const [key, value] of Object.entries(next)) {
      if (value !== "all" && value !== "relevance") params.set(key, value);
    }
    router.replace(`/search?${params}` as never, { scroll: false });
  };
  const resetFilters = () =>
    updateFilters({
      type: "all",
      availability: "all",
      rating: "all",
      genre: "all",
      decade: "all",
      sort: "relevance",
    });

  return (
    <>
      <SearchFilters
        values={filters}
        decades={decades}
        strmEnabled={strmEnabled}
        onChange={updateFilters}
        onReset={resetFilters}
      />
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">{t("resultsTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("resultCount", { shown: filtered.length, loaded: items.length, total: totalResults })}
          </p>
        </div>
      </div>
      {!isPagePending && filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {t("noFilteredResults")}
        </div>
      )}
      {isPagePending ? (
        <SearchResultsSkeleton />
      ) : (
        <div className="grid grid-cols-2 justify-center gap-4 sm:grid-cols-[repeat(auto-fill,minmax(10rem,12rem))] sm:justify-start">
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
                topLeft={
                  item.rating !== undefined && item.rating > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 text-xs font-semibold text-white">
                      <Star className="size-3 fill-current text-primary" />
                      {item.rating.toFixed(1)}
                    </span>
                  ) : undefined
                }
                badges={
                  item.type !== "person" ? (
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
                      initialFollowing={following[`${item.type}:${item.id}`] ?? false}
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
                            item.available ? "available" : (requestStates[`${item.type}:${item.id}`] ?? "idle")
                          }
                        />
                      </div>
                    )}
                  </div>
                }
              />
            );
          })}
        </div>
      )}
      <Pagination
        pathname="/search"
        query={{ q: query, ...filters }}
        page={page}
        totalPages={totalPages}
        label={t("pagination")}
        onNavigate={(href) => startPageTransition(() => router.push(href as never, { scroll: false }))}
      />
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
