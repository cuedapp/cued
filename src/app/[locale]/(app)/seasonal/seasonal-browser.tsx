"use client";

import { useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { FilterPanel } from "@/components/filter-panel";
import { FilterSelect } from "@/components/filter-select";
import { MediaGrid } from "@/components/media-grid";
import { DiscoveryCard, type DiscoveryCardOptions } from "@/components/discovery-card";
import { ShowMoreButton } from "@/components/show-more-button";
import { EmptyState } from "@/components/empty-state";
import { InlineError } from "@/components/inline-error";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  defaultSeasonalFilters,
  sortSeasonalItems,
  type SeasonalSelection,
  type SeasonalBrowseResult,
} from "@/lib/seasonal-browsing";
import { seasonalThemes } from "@/lib/seasonal-themes";

export function SeasonalBrowser({
  locale,
  dateFormat,
  initialSelection,
  initial,
  initialError,
  cardOptions,
  genreCatalog,
}: {
  locale: string;
  dateFormat: string;
  initialSelection: SeasonalSelection;
  initial: SeasonalBrowseResult;
  initialError: boolean;
  cardOptions: DiscoveryCardOptions;
  genreCatalog: { movie: Array<{ id: number; name: string }>; series: Array<{ id: number; name: string }> };
}) {
  const t = useTranslations("Seasonal");
  const exploreT = useTranslations("Explore");
  const recommendationsT = useTranslations("Recommendations");
  const [selection, setSelection] = useState(initialSelection);
  const [draft, setDraft] = useState(initialSelection);
  const [result, setResult] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [loadError, setLoadError] = useState(initialError);
  const requestSequence = useRef(0);
  const activeCount = countActiveFilters(selection);
  const availableGenres = useMemo(() => {
    const genres =
      selection.type === "all" ? [...genreCatalog.movie, ...genreCatalog.series] : genreCatalog[selection.type];
    return [...new Map(genres.map((genre) => [genre.id, genre])).values()].sort((left, right) =>
      left.name.localeCompare(right.name, locale),
    );
  }, [genreCatalog, selection.type, locale]);
  const displayedResults = useMemo(
    () => sortSeasonalItems([...result.results], selection.sort, selection.scope),
    [result.results, selection.sort, selection.scope],
  );

  async function load(nextSelection: SeasonalSelection, page = 1, append = false) {
    const requestId = ++requestSequence.current;
    setSelection(nextSelection);
    setLoading(true);
    setReplacing(!append);
    setLoadError(false);
    if (!append) setResult({ page: 1, totalPages: 0, results: [], following: {}, requestStates: {} });
    const query = new URLSearchParams(nextSelection);
    window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
    query.set("locale", locale);
    query.set("page", String(page));
    try {
      const response = await fetch(`/api/seasonal?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load seasonal results");
      const next = (await response.json()) as SeasonalBrowseResult;
      if (requestId !== requestSequence.current) return;
      setResult((current) => {
        if (!append) return next;
        const existing = new Set(current.results.map((item) => `${item.type}:${item.id}`));
        return {
          ...next,
          following: { ...current.following, ...next.following },
          requestStates: { ...current.requestStates, ...next.requestStates },
          results: [...current.results, ...next.results.filter((item) => !existing.has(`${item.type}:${item.id}`))],
        };
      });
    } catch {
      if (requestId === requestSequence.current) setLoadError(true);
    } finally {
      if (requestId === requestSequence.current) {
        setLoading(false);
        setReplacing(false);
      }
    }
  }

  function changeSelection(next: SeasonalSelection) {
    setDraft(next);
    void load(next);
  }
  function changeType(type: SeasonalSelection["type"]) {
    const genres = type === "all" ? [...genreCatalog.movie, ...genreCatalog.series] : genreCatalog[type];
    const genre = genres.some((item) => String(item.id) === selection.genre) ? selection.genre : "all";
    changeSelection({ ...selection, type, genre });
  }

  return (
    <section aria-label={t("resultsTitle")} className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label={t("themeFilter")}
          value={selection.theme}
          onChange={(theme) => changeSelection({ ...selection, theme: theme as SeasonalSelection["theme"] })}
        >
          {seasonalThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {t(`themes.${theme.id}`)}
            </option>
          ))}
        </FilterSelect>
        <SegmentedControl
          label={exploreT("scopeLabel")}
          value={selection.scope}
          onValueChange={(scope) => changeSelection({ ...selection, scope })}
          options={[
            { value: "all", label: t("allTitles") },
            { value: "trending", label: exploreT("trending") },
            { value: "upcoming", label: exploreT("upcoming") },
          ]}
        />
        <SegmentedControl
          label={exploreT("typeLabel")}
          value={selection.type}
          onValueChange={changeType}
          options={[
            { value: "all", label: exploreT("all") },
            { value: "movie", label: exploreT("movies") },
            { value: "series", label: exploreT("series") },
          ]}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {t(
          selection.scope === "trending"
            ? "trendingDescription"
            : selection.scope === "upcoming"
              ? "upcomingDescription"
              : "resultsDescription",
        )}
      </p>
      <FilterPanel
        title={exploreT("filterTitle")}
        help={t("filterHelp")}
        activeLabel={activeCount > 0 ? exploreT("activeFilters", { count: activeCount }) : undefined}
        clearLabel={exploreT("clearFilters")}
        clearDisabled={activeCount === 0 && countActiveFilters(draft) === 0}
        onClear={() => changeSelection({ ...selection, ...defaultSeasonalFilters })}
        footer={
          <Button onClick={() => changeSelection(draft)} disabled={loading} className="w-full sm:w-auto">
            {exploreT(loading ? "applyingFilters" : "applyFilters")}
          </Button>
        }
      >
        <p className="mb-4 text-sm leading-6 text-muted-foreground">{t("libraryHelp")}</p>
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <FilterSelect
            label={exploreT("genre")}
            value={draft.genre}
            onChange={(genre) => setDraft({ ...draft, genre })}
          >
            <option value="all">{exploreT("allGenres")}</option>
            {availableGenres.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={exploreT("rating")}
            value={draft.minimumRating}
            onChange={(minimumRating) => setDraft({ ...draft, minimumRating })}
          >
            <option value="all">{exploreT("allRatings")}</option>
            {[9, 8, 7, 6, 5].map((rating) => (
              <option key={rating} value={rating}>
                {exploreT("ratingAtLeast", { rating })}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label={exploreT("sort")}
            value={draft.sort}
            onChange={(sort) => setDraft({ ...draft, sort: sort as SeasonalSelection["sort"] })}
          >
            <option value="feed">{exploreT("sortFeed")}</option>
            <option value="popularity">{exploreT("sortPopularity")}</option>
            <option value="rating">{exploreT("sortRating")}</option>
            <option value="releaseAsc">{exploreT("sortReleaseAsc")}</option>
            <option value="releaseDesc">{exploreT("sortReleaseDesc")}</option>
          </FilterSelect>
          <FilterSelect
            label={t("library")}
            value={draft.library}
            onChange={(library) => setDraft({ ...draft, library: library as SeasonalSelection["library"] })}
          >
            <option value="all">{t("allTitles")}</option>
            <option value="in">{t("inLibrary")}</option>
            <option value="out">{t("outsideLibrary")}</option>
          </FilterSelect>
          <FilterSelect
            label={exploreT("watchLabel")}
            value={draft.watch}
            onChange={(watch) => setDraft({ ...draft, watch: watch as SeasonalSelection["watch"] })}
          >
            <option value="all">{exploreT("watchAll")}</option>
            <option value="watched">{exploreT("watchWatched")}</option>
            <option value="unwatched">{exploreT("watchUnwatched")}</option>
          </FilterSelect>
          <FilterSelect
            label={recommendationsT("availability")}
            value={draft.availability}
            onChange={(availability) =>
              setDraft({ ...draft, availability: availability as SeasonalSelection["availability"] })
            }
          >
            <option value="all">{recommendationsT("allAvailability")}</option>
            <option value="jellyfin">{recommendationsT("jellyfinAvailable")}</option>
            {cardOptions.strmEnabled && (
              <>
                <option value="strm">{recommendationsT("strmAvailable")}</option>
                <option value="m3u">{recommendationsT("m3uAvailable")}</option>
              </>
            )}
            <option value="unavailable">{recommendationsT("notAvailable")}</option>
          </FilterSelect>
        </div>
      </FilterPanel>
      {loadError && <InlineError>{t("loadFailed")}</InlineError>}
      {replacing ? (
        <div aria-live="polite" aria-busy="true" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          {exploreT("loadingResults")}
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("showing", { count: result.results.length })}
          </p>
          {!loadError && result.results.length === 0 && <EmptyState>{t("emptyResults")}</EmptyState>}
          <MediaGrid density="compact">
            {displayedResults.map((item) => (
              <DiscoveryCard
                key={`${item.type}:${item.id}`}
                item={item}
                posterPath={item.posterPath}
                locale={locale}
                dateFormat={dateFormat}
                options={cardOptions}
                following={result.following[`${item.type}:${item.id}`] ?? false}
                requestState={result.requestStates[`${item.type}:${item.id}`] ?? "idle"}
                upcoming={selection.scope === "upcoming"}
                premiere
              />
            ))}
          </MediaGrid>
        </>
      )}
      {result.page < result.totalPages && (
        <div className="flex justify-center">
          <ShowMoreButton
            onShowMore={() => load(selection, result.page + 1, true)}
            loading={loading}
            label={exploreT("showMore")}
            loadingLabel={exploreT("loading")}
          />
        </div>
      )}
    </section>
  );
}

function countActiveFilters(selection: SeasonalSelection) {
  return (Object.keys(defaultSeasonalFilters) as Array<keyof typeof defaultSeasonalFilters>).filter(
    (key) => selection[key] !== defaultSeasonalFilters[key],
  ).length;
}
