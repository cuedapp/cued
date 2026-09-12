import { getLocale, getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import {
  acquisitionService,
  followService,
  m3uEditorIntegrationService,
  radarrIntegrationService,
  sonarrIntegrationService,
  tmdbMetadataService,
} from "@/server/application/services";
import { getCurrentUser } from "@/server/auth/session";
import { ExploreBrowser } from "./explore-browser";
import { defaultOriginalLanguages, originalLanguageCodes } from "@/lib/original-languages";

type ExploreParams = {
  scope?: string;
  type?: string;
  genre?: string;
  rating?: string;
  sort?: string;
  languages?: string;
  daily?: string;
  watch?: string;
};

export default async function ExplorePage({ searchParams }: { searchParams: Promise<ExploreParams> }) {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const t = await getTranslations("Explore");
  const params = await searchParams;
  const preferredLanguages = user?.preferredOriginalLanguages?.length
    ? user.preferredOriginalLanguages.filter((language) => originalLanguageCodes.some((code) => code === language))
    : defaultOriginalLanguages(user?.locale ?? locale);
  const scope = params.scope === "upcoming" ? "upcoming" : "trending";
  const type = params.type === "movie" || params.type === "series" ? params.type : "all";
  const genreId = Number(params.genre);
  const minimumRating = Number(params.rating);
  const defaultSort = scope === "upcoming" ? "popularity" : "feed";
  const sort = ["feed", "popularity", "rating", "releaseAsc", "releaseDesc"].includes(params.sort ?? "")
    ? (params.sort as "feed" | "popularity" | "rating" | "releaseAsc" | "releaseDesc")
    : defaultSort;
  const selectedLanguages =
    scope !== "upcoming"
      ? []
      : params.languages === "all"
        ? []
        : params.languages
          ? params.languages.split(",").filter((language) => originalLanguageCodes.some((code) => code === language))
          : preferredLanguages;
  const watch: "all" | "watched" | "unwatched" =
    params.watch === "watched" || params.watch === "unwatched" ? params.watch : "all";
  const initialFilters = {
    watch,
    genre: Number.isSafeInteger(genreId) && genreId > 0 ? String(genreId) : "all",
    minimumRating: minimumRating >= 5 && minimumRating <= 9 ? String(minimumRating) : "all",
    includeDailyShows: params.daily === "1" && type !== "movie",
    sort,
    languages: selectedLanguages,
  };
  const initial = user
    ? await tmdbMetadataService
        .getExploreForUser(user.id, locale, scope, type, 1, {
          ...(initialFilters.genre !== "all" ? { genreId: Number(initialFilters.genre) } : {}),
          ...(initialFilters.minimumRating !== "all" ? { minimumRating: Number(initialFilters.minimumRating) } : {}),
          sort: initialFilters.sort,
          ...(scope === "upcoming" && selectedLanguages.length ? { originalLanguages: selectedLanguages } : {}),
        })
        .catch(() => ({
          page: 1,
          totalPages: 1,
          results: [],
        }))
    : { page: 1, totalPages: 1, results: [] };
  const [radarr, sonarr, m3uEditor, accessibleStrmLibraries, follows, requestStates] = await Promise.all([
    radarrIntegrationService.getOverview(),
    sonarrIntegrationService.getOverview(),
    m3uEditorIntegrationService.getOverview(),
    user
      ? m3uEditorIntegrationService.getAccessibleMappedLibraries(user.id)
      : { movie: new Set<string>(), series: new Set<string>() },
    user ? followService.list(user.id) : [],
    user
      ? acquisitionService
          .getStates(initial.results.map((item) => ({ type: item.type, tmdbId: item.id })))
          .catch(() => ({}) as Record<string, "idle" | "pending" | "existing">)
      : {},
  ]);
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
  const strmEnabled =
    m3uEditor.configured &&
    m3uEditor.status === "healthy" &&
    (accessibleStrmLibraries.movie.size > 0 || accessibleStrmLibraries.series.size > 0);
  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <ExploreBrowser
        locale={locale}
        languageOptions={originalLanguageCodes.map((code) => ({
          code,
          name: new Intl.DisplayNames(locale, { type: "language" }).of(code) ?? code,
        }))}
        preferredLanguages={preferredLanguages}
        initialScope={scope}
        initialType={type}
        initialFilters={initialFilters}
        initial={{
          ...initial,
          following: Object.fromEntries(follows.map((follow) => [`${follow.targetType}:${follow.tmdbId}`, true])),
          requestStates,
        }}
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
      />
    </div>
  );
}
