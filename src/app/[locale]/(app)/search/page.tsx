import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  acquisitionService,
  followService,
  m3uEditorIntegrationService,
  radarrIntegrationService,
  sonarrIntegrationService,
  tmdbMetadataService,
} from "@/server/application/services";
import { SearchForm } from "./search-form";
import type { SearchFilterValues } from "./search-filters";
import { SearchResults } from "./search-results";

type SearchParams = {
  q?: string;
  page?: string;
  type?: string;
  availability?: string;
  rating?: string;
  genre?: string;
  decade?: string;
  sort?: string;
};

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const t = await getTranslations("Search");
  const locale = await getLocale();
  const user = await getCurrentUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const parsedPage = Number(params.page ?? "1");
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const filters: SearchFilterValues = {
    type: member(params.type, ["all", "movie", "series", "person"] as const, "all"),
    availability: member(params.availability, ["all", "jellyfin", "strm", "unavailable", "no-source"] as const, "all"),
    rating: member(params.rating, ["all", "5", "6", "7", "8", "9"] as const, "all"),
    genre: member(
      params.genre,
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
    decade: params.decade === "all" || /^\d{4}$/.test(params.decade ?? "") ? (params.decade ?? "all") : "all",
    sort: member(params.sort, ["relevance", "rating", "year", "popularity"] as const, "relevance"),
  };
  let result: Awaited<ReturnType<typeof tmdbMetadataService.search>> | undefined;
  let unavailable = false;
  if (query && user) {
    try {
      result = await tmdbMetadataService.search(user.id, query, locale, page);
    } catch {
      unavailable = true;
    }
  }
  const [recentSearches, radarr, sonarr, follows, m3uEditor, accessibleStrmLibraries] = await Promise.all([
    user ? tmdbMetadataService.getRecentSearches(user.id) : [],
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    user ? followService.list(user.id) : [],
    m3uEditorIntegrationService.getOverview(),
    user
      ? m3uEditorIntegrationService.getAccessibleMappedLibraries(user.id)
      : { movie: new Set<string>(), series: new Set<string>() },
  ]);
  const strmEnabled =
    m3uEditor.configured &&
    m3uEditor.status === "healthy" &&
    (accessibleStrmLibraries.movie.size > 0 || accessibleStrmLibraries.series.size > 0);
  const visibleFilters: SearchFilterValues =
    !strmEnabled && (filters.availability === "strm" || filters.availability === "no-source")
      ? { ...filters, availability: "all" }
      : filters;
  const following = Object.fromEntries(follows.map((follow) => [`${follow.targetType}:${follow.tmdbId}`, true]));
  const allowRequestOptions = Boolean(user && (user.role === "admin" || !user.requestsRequireApproval));
  const [radarrOptions, sonarrOptions] = allowRequestOptions
    ? await Promise.all([
        radarr.configured
          ? radarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
          : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
        sonarr.configured
          ? sonarrIntegrationService.getOptions().catch(() => ({ rootFolders: [], qualityProfiles: [], tags: [] }))
          : Promise.resolve({ rootFolders: [], qualityProfiles: [], tags: [] }),
      ])
    : [
        { rootFolders: [], qualityProfiles: [], tags: [] },
        { rootFolders: [], qualityProfiles: [], tags: [] },
      ];
  const requestStates =
    user && result
      ? await acquisitionService
          .getStates(
            result.results
              .filter(
                (item): item is typeof item & { type: "movie" | "series" } =>
                  item.type === "movie" || item.type === "series",
              )
              .map((item) => ({ type: item.type, tmdbId: item.id })),
          )
          .catch(() => ({}) as Record<string, "idle" | "pending" | "existing">)
      : {};
  return (
    <div className="space-y-8">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t("eyebrow")}</p>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tighter">{t("title")}</h1>
        <p className="mt-4 leading-7 text-muted-foreground">{t("intro")}</p>
      </header>
      <SearchForm query={query} recentSearches={recentSearches.map(({ query: recentQuery }) => recentQuery)} />

      {!query && (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {t("empty")}
        </div>
      )}
      {unavailable && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5 text-destructive">
          <div className="font-medium">{t("unavailableTitle")}</div>
          <div className="mt-1 text-sm">{t("unavailableBody")}</div>
        </div>
      )}
      {result && result.results.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center text-muted-foreground">
          {t("noResults", { query })}
        </div>
      )}
      {result && result.results.length > 0 && (
        <SearchResults
          key={`${query}:${page}:${visibleFilters.type}:${visibleFilters.availability}:${visibleFilters.rating}:${visibleFilters.genre}:${visibleFilters.decade}:${visibleFilters.sort}`}
          query={query}
          items={result.results}
          totalResults={result.totalResults}
          page={page}
          totalPages={result.totalPages}
          initialFilters={visibleFilters}
          strmEnabled={strmEnabled}
          requestable={{ movie: radarr.configured, series: sonarr.configured }}
          requestOptions={{
            movie: {
              rootFolders: radarrOptions.rootFolders,
              profiles: radarrOptions.qualityProfiles,
              defaultRootFolderPath: radarr.rootFolderPath,
              defaultProfileId: radarr.qualityProfileId,
            },
            series: {
              rootFolders: sonarrOptions.rootFolders,
              profiles: sonarrOptions.qualityProfiles,
              defaultRootFolderPath: sonarr.rootFolderPath,
              defaultProfileId: sonarr.qualityProfileId,
            },
          }}
          allowRequestOptions={allowRequestOptions}
          requestStates={requestStates}
          following={following}
        />
      )}
    </div>
  );
}

function member<const T extends readonly string[]>(
  value: string | undefined,
  values: T,
  fallback: T[number],
): T[number] {
  return values.includes(value ?? "") ? (value as T[number]) : fallback;
}
