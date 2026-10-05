import { getSeasonalTheme, seasonalThemes, type SeasonalThemeId } from "./seasonal-themes";
import type { DiscoveryCardStates } from "@/components/discovery-card";
import type { SeasonalResult } from "@/server/application/tmdb-metadata.service";

export interface SeasonalBrowseResult extends SeasonalResult, DiscoveryCardStates {}

export type SeasonalFilters = {
  library: "all" | "in" | "out";
  watch: "all" | "watched" | "unwatched";
  availability: "all" | "available" | "unavailable";
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
};

export function parseSeasonalSelection(params: URLSearchParams, preferredTheme?: string): SeasonalSelection {
  const scope = params.get("scope");
  const type = params.get("type");
  const library = params.get("library");
  const watch = params.get("watch");
  const availability = params.get("availability");
  return {
    theme: (getSeasonalTheme(params.get("theme") ?? undefined) ?? getSeasonalTheme(preferredTheme) ?? seasonalThemes[0])
      .id,
    scope: scope === "trending" || scope === "upcoming" ? scope : "all",
    type: type === "movie" || type === "series" ? type : "all",
    library: library === "in" || library === "out" ? library : "all",
    watch: watch === "watched" || watch === "unwatched" ? watch : "all",
    availability: availability === "available" || availability === "unavailable" ? availability : "all",
  };
}
