import { getSeasonalTheme, seasonalThemes, type SeasonalThemeId } from "./seasonal-themes";
import type { DiscoveryCardStates } from "@/components/discovery-card";
import type { SeasonalResult } from "@/server/application/tmdb-metadata.service";
import type { TmdbExploreFilters } from "@/server/integrations/tmdb/provider";
import type { RecommendationAvailability } from "./recommendation-availability";

export interface SeasonalBrowseResult extends SeasonalResult, DiscoveryCardStates {}

export type SeasonalFilters = {
  library: "all" | "in" | "out";
  watch: "all" | "watched" | "unwatched";
  availability: RecommendationAvailability;
  genre: string;
  minimumRating: string;
  sort: NonNullable<TmdbExploreFilters["sort"]>;
};

export type SeasonalSelection = SeasonalFilters & {
  theme: SeasonalThemeId;
  scope: "all" | "trending" | "upcoming";
  type: "all" | "movie" | "series";
};

export const defaultSeasonalFilters: SeasonalFilters = {
  library: "all",
  watch: "all",
  availability: "all",
  genre: "all",
  minimumRating: "all",
  sort: "feed",
};

export function parseSeasonalSelection(params: URLSearchParams, preferredTheme?: string): SeasonalSelection {
  const scope = params.get("scope");
  const type = params.get("type");
  const library = params.get("library");
  const watch = params.get("watch");
  const availability = params.get("availability");
  const genre = params.get("genre");
  const minimumRating = params.get("minimumRating");
  const sort = params.get("sort");
  return {
    theme: (getSeasonalTheme(params.get("theme") ?? undefined) ?? getSeasonalTheme(preferredTheme) ?? seasonalThemes[0])
      .id,
    scope: scope === "trending" || scope === "upcoming" ? scope : "all",
    type: type === "movie" || type === "series" ? type : "all",
    library: library === "in" || library === "out" ? library : "all",
    watch: watch === "watched" || watch === "unwatched" ? watch : "all",
    availability:
      availability === "jellyfin" || availability === "strm" || availability === "m3u" || availability === "unavailable"
        ? availability
        : "all",
    genre:
      genre && /^\d+$/.test(genre) && Number.isSafeInteger(Number(genre)) && Number(genre) > 0
        ? String(Number(genre))
        : "all",
    minimumRating: minimumRating && /^[5-9]$/.test(minimumRating) ? minimumRating : "all",
    sort: sort === "popularity" || sort === "rating" || sort === "releaseAsc" || sort === "releaseDesc" ? sort : "feed",
  };
}

export function sortSeasonalItems<
  T extends { rating: number; popularity: number; date?: string; id?: number; type?: string },
>(items: T[], sort: SeasonalFilters["sort"], scope: SeasonalSelection["scope"]): T[] {
  if (sort === "feed" && scope === "trending") return items;
  const effectiveSort = sort === "feed" ? (scope === "upcoming" ? "releaseAsc" : "popularity") : sort;
  return items.sort((left, right) => {
    let comparison = 0;
    if (effectiveSort === "rating") comparison = right.rating - left.rating;
    if (effectiveSort === "releaseAsc" || effectiveSort === "releaseDesc") {
      if (!left.date && right.date) return 1;
      if (left.date && !right.date) return -1;
      if (left.date && right.date)
        comparison =
          effectiveSort === "releaseAsc" ? left.date.localeCompare(right.date) : right.date.localeCompare(left.date);
    }
    return (
      comparison ||
      right.popularity - left.popularity ||
      (left.id ?? 0) - (right.id ?? 0) ||
      (left.type ?? "").localeCompare(right.type ?? "")
    );
  });
}
