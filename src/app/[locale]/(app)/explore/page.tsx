import { getLocale, getTranslations } from "next-intl/server";
import { PageIntro } from "@/components/page-intro";
import { getDiscoveryCardOptions, getDiscoveryCardStates } from "@/server/application/discovery-card.service";
import { tmdbMetadataService } from "@/server/application/services";
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
  const [cardOptions, cardStates] = await Promise.all([
    getDiscoveryCardOptions(user ?? null),
    user ? getDiscoveryCardStates(user.id, initial.results) : { following: {}, requestStates: {} },
  ]);
  return (
    <div className="space-y-8">
      <PageIntro eyebrow={t("eyebrow")} title={t("title")} description={t("description")} />
      <ExploreBrowser
        locale={locale}
        dateFormat={user?.dateFormat ?? "yyyy-mm-dd"}
        languageOptions={originalLanguageCodes.map((code) => ({
          code,
          name: new Intl.DisplayNames(locale, { type: "language" }).of(code) ?? code,
        }))}
        preferredLanguages={preferredLanguages}
        initialScope={scope}
        initialType={type}
        initialFilters={initialFilters}
        initial={{ ...initial, ...cardStates }}
        {...cardOptions}
      />
    </div>
  );
}
