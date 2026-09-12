"use client";

import { type ReactNode, useMemo, useRef, useState } from "react";
import { CalendarDays, LoaderCircle, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { FilterPanel } from "@/components/filter-panel";
import { MediaCard } from "@/components/media-card";
import { MediaCapabilityBadges } from "@/components/media-capability-badges";
import { PosterBadge } from "@/components/poster-badge";
import { MediaGrid } from "@/components/media-grid";
import { FollowButton } from "@/components/follow-button";
import { RequestButton, type RequestOptions } from "@/components/request-button";
import { ShowMoreButton } from "@/components/show-more-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { WatchedBadge } from "@/components/watched-badge";

type Scope = "trending" | "upcoming";
type MediaType = "all" | "movie" | "series";
type SortOrder = "feed" | "popularity" | "rating" | "releaseAsc" | "releaseDesc";
type ExploreFilters = {
  watch: "all" | "watched" | "unwatched";
  genre: string;
  minimumRating: string;
  includeDailyShows: boolean;
  sort: SortOrder;
  languages: string[];
};
type ExploreItem = {
  id: number;
  type: "movie" | "series";
  title: string;
  overview: string;
  date?: string;
  upcomingDate?: string;
  imagePath?: string;
  rating: number;
  popularity: number;
  contentRatingAge: number | null;
  restricted: boolean;
  available: boolean;
  watched: boolean;
  partiallyWatched: boolean;
  strmAvailable: boolean;
  strmPending: boolean;
  m3uAvailable: boolean;
  genres: Array<{ id: number; name: string }>;
  dailyShow: boolean;
};
type ExploreResult = {
  page: number;
  totalPages: number;
  results: ExploreItem[];
  following: Record<string, boolean>;
  requestStates: Record<string, "idle" | "pending" | "existing">;
};

export function ExploreBrowser({
  locale,
  languageOptions,
  preferredLanguages,
  initialScope,
  initialType,
  initialFilters,
  initial,
  strmEnabled,
  requestable,
  requestOptions,
  allowRequestOptions,
}: {
  locale: string;
  languageOptions: Array<{ code: string; name: string }>;
  preferredLanguages: string[];
  initialScope: Scope;
  initialType: MediaType;
  initialFilters: ExploreFilters;
  initial: ExploreResult;
  strmEnabled: boolean;
  requestable: { movie: boolean; series: boolean };
  requestOptions: { movie: RequestOptions; series: RequestOptions };
  allowRequestOptions: boolean;
}) {
  const t = useTranslations("Explore");
  const [scope, setScope] = useState<Scope>(initialScope);
  const [type, setType] = useState<MediaType>(initialType);
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [replacingResults, setReplacingResults] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<ExploreFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<ExploreFilters>(initialFilters);
  const [availableGenres, setAvailableGenres] = useState(() => uniqueGenres(initial.results, locale));
  const requestSequence = useRef(0);

  const filteredResults = useMemo(
    () =>
      [...result.results]
        .filter((item) => appliedFilters.includeDailyShows || !item.dailyShow)
        .filter(
          (item) =>
            appliedFilters.genre === "all" ||
            item.genres.some((itemGenre) => String(itemGenre.id) === appliedFilters.genre),
        )
        .filter((item) => appliedFilters.minimumRating === "all" || item.rating >= Number(appliedFilters.minimumRating))
        .filter((item) =>
          appliedFilters.watch === "all" ? true : appliedFilters.watch === "watched" ? item.watched : !item.watched,
        )
        .sort((left, right) => {
          if (appliedFilters.sort === "popularity") return right.popularity - left.popularity;
          if (appliedFilters.sort === "rating") return right.rating - left.rating;
          const leftDate = left.upcomingDate ?? left.date ?? "";
          const rightDate = right.upcomingDate ?? right.date ?? "";
          if (appliedFilters.sort === "releaseAsc") return leftDate.localeCompare(rightDate);
          if (appliedFilters.sort === "releaseDesc") return rightDate.localeCompare(leftDate);
          return 0;
        }),
    [appliedFilters, result.results],
  );
  const filtersActive =
    appliedFilters.genre !== "all" ||
    appliedFilters.minimumRating !== "all" ||
    appliedFilters.watch !== "all" ||
    appliedFilters.includeDailyShows ||
    (scope === "upcoming" && appliedFilters.languages.length > 0);
  const defaultSort = scope === "upcoming" ? "popularity" : "feed";
  const activeFilterCount =
    Number(appliedFilters.genre !== "all") +
    Number(appliedFilters.minimumRating !== "all") +
    Number(appliedFilters.watch !== "all") +
    Number(appliedFilters.includeDailyShows) +
    Number(appliedFilters.sort !== defaultSort) +
    Number(scope === "upcoming" && appliedFilters.languages.length > 0);

  async function load(nextScope: Scope, nextType: MediaType, page = 1, append = false, nextFilters = appliedFilters) {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setReplacingResults(!append);
    setLoadError(false);
    try {
      const params = new URLSearchParams({
        locale,
        scope: nextScope,
        type: nextType,
        page: String(page),
        sort: nextFilters.sort,
        ...(nextFilters.genre !== "all" ? { genre: nextFilters.genre } : {}),
        ...(nextFilters.minimumRating !== "all" ? { minimumRating: nextFilters.minimumRating } : {}),
        ...(nextScope === "upcoming" && nextFilters.languages.length
          ? { languages: nextFilters.languages.join(",") }
          : {}),
      });
      const response = await fetch(`/api/explore?${params}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load Explore results");
      const next = (await response.json()) as ExploreResult;
      if (requestId !== requestSequence.current) return;
      setAvailableGenres((current) =>
        uniqueGenres(
          [...current.map((item) => ({ genres: [item] })), ...next.results] as Array<Pick<ExploreItem, "genres">>,
          locale,
        ),
      );
      setResult((current) =>
        append
          ? {
              ...next,
              following: { ...current.following, ...next.following },
              requestStates: { ...current.requestStates, ...next.requestStates },
              results: [
                ...current.results,
                ...next.results.filter(
                  (item) =>
                    !current.results.some(
                      (currentItem) => `${currentItem.type}:${currentItem.id}` === `${item.type}:${item.id}`,
                    ),
                ),
              ],
            }
          : next,
      );
    } catch {
      if (requestId === requestSequence.current) setLoadError(true);
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setReplacingResults(false);
      }
    }
  }

  function changeScope(next: Scope) {
    const nextFilters = defaultFilters(next, preferredLanguages);
    setScope(next);
    setAppliedFilters(nextFilters);
    setDraftFilters(nextFilters);
    syncUrl(next, type, nextFilters);
    void load(next, type, 1, false, nextFilters);
  }
  function changeType(next: MediaType) {
    setType(next);
    const nextFilters = next === "movie" ? { ...appliedFilters, includeDailyShows: false } : appliedFilters;
    setAppliedFilters(nextFilters);
    setDraftFilters((current) => (next === "movie" ? { ...current, includeDailyShows: false } : current));
    syncUrl(scope, next, nextFilters);
    void load(scope, next, 1, false, nextFilters);
  }

  function clearFilters() {
    const cleared = { ...defaultFilters(scope, preferredLanguages), languages: [] };
    setAppliedFilters(cleared);
    setDraftFilters(cleared);
    syncUrl(scope, type, cleared);
    if (scope === "upcoming") void load(scope, type, 1, false, cleared);
  }

  function applyFilters() {
    setAppliedFilters(draftFilters);
    syncUrl(scope, type, draftFilters);
    if (scope === "upcoming") void load(scope, type, 1, false, draftFilters);
  }

  function toggleLanguage(language: string) {
    setDraftFilters((current) => ({
      ...current,
      languages: current.languages.includes(language)
        ? current.languages.filter((item) => item !== language)
        : [...current.languages, language],
    }));
  }

  function syncUrl(nextScope: Scope, nextType: MediaType, filters: ExploreFilters) {
    const params = new URLSearchParams();
    if (nextScope === "upcoming") params.set("scope", nextScope);
    if (nextType !== "all") params.set("type", nextType);
    if (filters.genre !== "all") params.set("genre", filters.genre);
    if (filters.minimumRating !== "all") params.set("rating", filters.minimumRating);
    if (filters.watch !== "all") params.set("watch", filters.watch);
    const scopeDefaultSort = nextScope === "upcoming" ? "popularity" : "feed";
    if (filters.sort !== scopeDefaultSort) params.set("sort", filters.sort);
    if (filters.includeDailyShows) params.set("daily", "1");
    if (nextScope === "upcoming") {
      if (filters.languages.length === 0) params.set("languages", "all");
      else if (!sameLanguages(filters.languages, preferredLanguages))
        params.set("languages", filters.languages.join(","));
    }
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <SegmentedControl
          value={scope}
          onValueChange={changeScope}
          label={t("scopeLabel")}
          options={[
            { value: "trending", label: t("trending") },
            { value: "upcoming", label: t("upcoming") },
          ]}
        />
        <SegmentedControl
          value={type}
          onValueChange={changeType}
          label={t("typeLabel")}
          options={[
            { value: "all", label: t("all") },
            { value: "movie", label: t("movies") },
            { value: "series", label: t("series") },
          ]}
        />
      </div>

      <FilterPanel
        title={t("filterTitle")}
        help={t(scope === "upcoming" ? "filterHelpUpcoming" : "filterHelpTrending")}
        activeLabel={activeFilterCount > 0 ? t("activeFilters", { count: activeFilterCount }) : undefined}
        clearLabel={t("clearFilters")}
        clearDisabled={activeFilterCount === 0}
        onClear={clearFilters}
        footer={
          <Button type="button" onClick={applyFilters} disabled={loading} className="w-full sm:w-auto">
            {loading ? t("applyingFilters") : t("applyFilters")}
          </Button>
        }
      >
        <p className="mb-4 text-sm leading-6 text-muted-foreground">
          {t(scope === "upcoming" ? "upcomingFilterHelp" : "trendingFilterHelp")}
        </p>
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <FilterSelect
            label={t("genre")}
            value={draftFilters.genre}
            onChange={(genre) => setDraftFilters((current) => ({ ...current, genre }))}
          >
            <option value="all">{t("allGenres")}</option>
            {availableGenres.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("rating")}
            value={draftFilters.minimumRating}
            onChange={(minimumRating) => setDraftFilters((current) => ({ ...current, minimumRating }))}
          >
            <option value="all">{t("allRatings")}</option>
            {[9, 8, 7, 6, 5].map((rating) => (
              <option key={rating} value={rating}>
                {t("ratingAtLeast", { rating })}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={t("sort")}
            value={draftFilters.sort}
            onChange={(sort) => setDraftFilters((current) => ({ ...current, sort: sort as SortOrder }))}
          >
            <option value="feed">{t("sortFeed")}</option>
            <option value="popularity">{t("sortPopularity")}</option>
            <option value="rating">{t("sortRating")}</option>
            <option value="releaseAsc">{t("sortReleaseAsc")}</option>
            <option value="releaseDesc">{t("sortReleaseDesc")}</option>
          </FilterSelect>
          <FilterSelect
            label={t("watchLabel")}
            value={draftFilters.watch}
            onChange={(watch) =>
              setDraftFilters((current) => ({ ...current, watch: watch as ExploreFilters["watch"] }))
            }
          >
            <option value="all">{t("watchAll")}</option>
            <option value="watched">{t("watchWatched")}</option>
            <option value="unwatched">{t("watchUnwatched")}</option>
          </FilterSelect>
          {type !== "movie" && (
            <label className="flex min-h-10 cursor-pointer items-center gap-2 self-end rounded-lg border border-input bg-background px-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={draftFilters.includeDailyShows}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, includeDailyShows: event.target.checked }))
                }
                className="size-4 accent-primary"
              />
              {t("includeDailyShows")}
            </label>
          )}
        </div>
        {scope === "upcoming" && (
          <fieldset className="mt-5 space-y-2">
            <legend className="text-sm font-medium">{t("originalLanguages")}</legend>
            <p className="text-xs leading-5 text-muted-foreground">{t("originalLanguagesHelp")}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {languageOptions.map((language) => (
                <label
                  key={language.code}
                  className={`flex min-h-9 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm transition-colors ${
                    draftFilters.languages.includes(language.code)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-input bg-background text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={draftFilters.languages.includes(language.code)}
                    onChange={() => toggleLanguage(language.code)}
                    className="size-4 accent-primary"
                  />
                  {language.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </FilterPanel>

      {loadError && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {t("loadFailed")}
        </div>
      )}
      {!replacingResults && (
        <p className="text-sm text-muted-foreground">
          {t(filtersActive ? "showingFiltered" : "showing", {
            count: filteredResults.length,
            total: result.results.length,
          })}
        </p>
      )}
      {!replacingResults && filteredResults.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {t("noMatches")}
        </div>
      )}
      {replacingResults ? (
        <ExploreLoading label={t("loadingResults")} />
      ) : (
        <MediaGrid density="compact">
          {filteredResults.map((item) => (
            <MediaCard
              key={`${item.type}:${item.id}`}
              href={`/title/${item.type}/${item.id}`}
              posterPath={item.imagePath}
              title={item.title}
              contentRatingAge={item.contentRatingAge}
              restrictedReason={item.restricted ? t("restricted") : undefined}
              topLeft={
                item.rating > 0 ? (
                  <PosterBadge>
                    <Star className="size-3 fill-current text-primary" />
                    {item.rating.toFixed(1)}
                  </PosterBadge>
                ) : undefined
              }
              badges={
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
              }
              meta={
                scope === "upcoming" && item.upcomingDate ? (
                  <span className="inline-flex items-center gap-1 font-medium text-foreground">
                    <CalendarDays className="size-3.5 text-primary" />
                    {t(item.type === "movie" ? "releasesOn" : "nextEpisodeOn", {
                      date: formatReleaseDate(item.upcomingDate, locale),
                    })}
                  </span>
                ) : item.date ? (
                  <span>{item.date.slice(0, 4)}</span>
                ) : undefined
              }
              secondary={item.overview}
              footer={
                <div
                  className={`grid ${requestable[item.type] || (strmEnabled && item.m3uAvailable) ? "grid-cols-2" : "grid-cols-1"}`}
                >
                  <FollowButton
                    targetType={item.type}
                    tmdbId={item.id}
                    initialFollowing={result.following[`${item.type}:${item.id}`] ?? false}
                    iconOnly
                  />
                  {(requestable[item.type] || (strmEnabled && item.m3uAvailable)) && (
                    <div className="border-l border-border/60">
                      <RequestButton
                        type={item.type}
                        tmdbId={item.id}
                        compact
                        iconOnly
                        actionCell
                        tooltip={t("request")}
                        allowOptions={allowRequestOptions}
                        arrAvailable={requestable[item.type]}
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
                          item.available ? "available" : (result.requestStates[`${item.type}:${item.id}`] ?? "idle")
                        }
                      />
                    </div>
                  )}
                </div>
              }
            />
          ))}
        </MediaGrid>
      )}
      {result.page < result.totalPages && (
        <div className="flex justify-center">
          <ShowMoreButton
            onShowMore={() => load(scope, type, result.page + 1, true, appliedFilters)}
            loading={loading}
            label={t("showMore")}
            loadingLabel={t("loading")}
          />
        </div>
      )}
    </div>
  );
}

function uniqueGenres(items: Array<Pick<ExploreItem, "genres">>, locale: string) {
  return [...new Map(items.flatMap((item) => item.genres).map((item) => [item.id, item])).values()].sort((a, b) =>
    a.name.localeCompare(b.name, locale),
  );
}

function defaultFilters(scope: Scope, preferredLanguages: string[]): ExploreFilters {
  return {
    watch: "all",
    genre: "all",
    minimumRating: "all",
    includeDailyShows: false,
    sort: scope === "upcoming" ? "popularity" : "feed",
    languages: scope === "upcoming" ? preferredLanguages : [],
  };
}

function sameLanguages(left: string[], right: string[]) {
  return [...left].sort().join(",") === [...right].sort().join(",");
}

function ExploreLoading({ label }: { label: string }) {
  return (
    <div aria-live="polite" aria-busy="true" className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        {label}
      </div>
      <MediaGrid density="compact">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card">
            <div className="aspect-2/3 animate-pulse bg-muted" />
            <div className="space-y-2 p-3">
              <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            </div>
            <div className="mt-auto h-10 animate-pulse border-t border-border/60 bg-muted/50" />
          </div>
        ))}
      </MediaGrid>
    </div>
  );
}

function formatReleaseDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 min-w-0 rounded-lg border border-input bg-background px-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {children}
      </select>
    </label>
  );
}
