import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import type {
  TmdbCandidatePage,
  TmdbCollectionDetails,
  TmdbMediaType,
  TmdbPersonCredit,
  TmdbPersonDetails,
  TmdbProvider,
  TmdbSearchPage,
  TmdbSeasonDetails,
  TmdbTitleDetails,
} from "@/server/integrations/tmdb/provider";
import type { TmdbIntegrationService } from "./tmdb-integration.service";
import type { M3uEditorIntegrationService } from "./m3u-editor-integration.service";

const searchTtlMs = 15 * 60 * 1_000;
const detailTtlMs = 24 * 60 * 60 * 1_000;
const discoveryTtlMs = 6 * 60 * 60 * 1_000;

export class TmdbMetadataService {
  constructor(
    private readonly repository: TmdbRepository,
    private readonly integrationService: TmdbIntegrationService,
    private readonly provider: TmdbProvider,
    private readonly m3uEditor?: M3uEditorIntegrationService,
  ) {}

  async search(userId: string, query: string, locale: string, page = 1) {
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    if (!normalizedQuery) return { page: 1, totalPages: 0, totalResults: 0, results: [] };
    const language = tmdbLanguage(locale);
    const firstProviderPage = (page - 1) * 2 + 1;
    const first = await this.getSearchPage(normalizedQuery, locale, language, firstProviderPage);
    const second =
      firstProviderPage < first.totalPages
        ? await this.getSearchPage(normalizedQuery, locale, language, firstProviderPage + 1)
        : undefined;
    const combinedResults = [...first.results, ...(second?.results ?? [])];
    const result = {
      page,
      totalPages: Math.ceil(first.totalPages / 2),
      totalResults: first.totalResults,
      results: uniqueSearchResults(combinedResults),
    };
    await this.repository.recordSearch(userId, normalizedQuery);
    const titles = result.results.flatMap((item) => (item.type === "person" ? [] : [{ id: item.id, type: item.type }]));
    const [libraryAvailability, m3uTitles, pendingTitles] = await Promise.all([
      this.getLibraryAvailability(userId, titles),
      this.getM3uAvailability(userId, titles),
      this.getPendingStrmTitles(titles),
    ]);
    return {
      ...result,
      results: result.results.map((item) => ({
        ...item,
        available: item.type !== "person" && libraryAvailability.available.has(`${item.type}:${item.id}`),
        strmAvailable: item.type !== "person" && libraryAvailability.strmAvailable.has(`${item.type}:${item.id}`),
        strmPending:
          item.type !== "person" &&
          m3uTitles.has(`${item.type}:${item.id}`) &&
          pendingTitles.has(`${item.type}:${item.id}`),
        m3uAvailable: item.type !== "person" && m3uTitles.has(`${item.type}:${item.id}`),
      })),
    };
  }

  private async getSearchPage(query: string, locale: string, language: string, page: number) {
    const cacheKey = `search:${query.toLocaleLowerCase(locale)}:${page}`;
    let result = await this.repository.getCached<TmdbSearchPage>(cacheKey, language);
    if (!result) {
      result = await this.integrationService.execute((accessToken) =>
        this.provider.search(accessToken, query, language, page),
      );
      await this.repository.setCached(
        cacheKey,
        language,
        "search",
        undefined,
        result as unknown as Record<string, unknown>,
        searchTtlMs,
      );
    }
    return result;
  }

  async getRecentSearches(userId: string) {
    return this.repository.getRecentSearches(userId);
  }

  async getTitle(userId: string, type: TmdbMediaType, id: number, locale: string) {
    const title = await this.getTitleMetadata(type, id, locale);
    const [libraryAvailability, m3uTitles, pendingTitles] = await Promise.all([
      this.getLibraryAvailability(userId, [{ id, type }]),
      this.getM3uAvailability(userId, [{ id, type }]),
      this.getPendingStrmTitles([{ id, type }]),
    ]);
    return {
      ...title,
      available: libraryAvailability.available.has(`${type}:${id}`),
      strmAvailable: libraryAvailability.strmAvailable.has(`${type}:${id}`),
      strmPending: m3uTitles.has(`${type}:${id}`) && pendingTitles.has(`${type}:${id}`),
      m3uAvailable: m3uTitles.has(`${type}:${id}`),
    };
  }

  async getCollectionForUser(userId: string, id: number, locale: string) {
    const collection = await this.getCollectionMetadata(id, locale);
    const titles = collection.parts.map((item) => ({ id: item.id, type: item.type }));
    const [libraryAvailability, m3uTitles, pendingTitles] = await Promise.all([
      this.getLibraryAvailability(userId, titles),
      this.getM3uAvailability(userId, titles),
      this.getPendingStrmTitles(titles),
    ]);
    return {
      ...collection,
      parts: collection.parts.map((item) => {
        const key = `${item.type}:${item.id}`;
        return {
          ...item,
          available: libraryAvailability.available.has(key),
          strmAvailable: libraryAvailability.strmAvailable.has(key),
          strmPending: m3uTitles.has(key) && pendingTitles.has(key),
          m3uAvailable: m3uTitles.has(key),
        };
      }),
    };
  }

  async getCollectionMetadata(id: number, locale: string, refresh = false) {
    const language = tmdbLanguage(locale);
    const cacheKey = `collection:${id}`;
    let collection = refresh ? undefined : await this.repository.getCached<TmdbCollectionDetails>(cacheKey, language);
    if (!collection) {
      collection = await this.integrationService.execute((accessToken) => this.provider.getCollection(accessToken, id, language));
      await this.repository.setCached(
        cacheKey,
        language,
        "collection",
        String(id),
        collection as unknown as Record<string, unknown>,
        detailTtlMs,
      );
    }
    return collection;
  }

  refreshCollectionMetadata(id: number, locale: string) {
    return this.getCollectionMetadata(id, locale, true);
  }

  async getSeasonForUser(userId: string, seriesId: number, seasonNumber: number, locale: string) {
    const language = tmdbLanguage(locale);
    const cacheKey = `season:v1:${seriesId}:${seasonNumber}`;
    let season = await this.repository.getCached<TmdbSeasonDetails>(cacheKey, language);
    if (!season) {
      season = await this.integrationService.execute((accessToken) =>
        this.provider.getSeason(accessToken, seriesId, seasonNumber, language),
      );
      await this.repository.setCached(
        cacheKey,
        language,
        "season",
        `${seriesId}:${seasonNumber}`,
        season as unknown as Record<string, unknown>,
        detailTtlMs,
      );
    }
    const states = await this.repository.getEpisodeStates(userId, seriesId, seasonNumber);
    return {
      ...season,
      episodes: season.episodes.map((episode) => ({
        ...episode,
        ...(states.get(episode.number) ?? { played: false, progress: 0 }),
      })),
    };
  }

  getAccessibleJellyfinItemId(userId: string, type: TmdbMediaType, id: number) {
    return this.repository.getAccessibleJellyfinItemId(userId, type, id);
  }

  async getTitleMetadata(type: TmdbMediaType, id: number, locale: string) {
    const language = tmdbLanguage(locale);
    const cacheKey = `title:v2:${type}:${id}`;
    let title = await this.repository.getCached<TmdbTitleDetails>(cacheKey, language);
    if (!title) {
      title = await this.integrationService.execute((accessToken) =>
        this.provider.getTitle(accessToken, type, id, language),
      );
      await this.repository.setCached(
        cacheKey,
        language,
        "title",
        String(id),
        title as unknown as Record<string, unknown>,
        detailTtlMs,
      );
    }
    return title;
  }

  async refreshTitleMetadata(type: TmdbMediaType, id: number, locale: string) {
    const language = tmdbLanguage(locale);
    const title = await this.integrationService.execute((accessToken) =>
      this.provider.getTitle(accessToken, type, id, language),
    );
    await this.repository.setCached(
      `title:v2:${type}:${id}`,
      language,
      "title",
      String(id),
      title as unknown as Record<string, unknown>,
      detailTtlMs,
    );
    return title;
  }

  async getPerson(userId: string, id: number, locale: string) {
    const language = tmdbLanguage(locale);
    const cacheKey = `person:v2:${id}`;
    let person = await this.repository.getCached<TmdbPersonDetails>(cacheKey, language);
    if (!person) {
      person = await this.integrationService.execute((accessToken) =>
        this.provider.getPerson(accessToken, id, language),
      );
      await this.repository.setCached(
        cacheKey,
        language,
        "person",
        String(id),
        person as unknown as Record<string, unknown>,
        detailTtlMs,
      );
    }
    const credits = combinePersonCredits(person.credits);
    const titles = credits.map((credit) => ({ id: credit.id, type: credit.type }));
    const [libraryAvailability, m3uTitles, pendingTitles] = await Promise.all([
      this.getLibraryAvailability(userId, titles),
      this.getM3uAvailability(userId, titles),
      this.getPendingStrmTitles(titles),
    ]);
    return {
      ...person,
      credits: credits.map((credit) => ({
        ...credit,
        available: libraryAvailability.available.has(`${credit.type}:${credit.id}`),
        strmAvailable: libraryAvailability.strmAvailable.has(`${credit.type}:${credit.id}`),
        strmPending: m3uTitles.has(`${credit.type}:${credit.id}`) && pendingTitles.has(`${credit.type}:${credit.id}`),
        m3uAvailable: m3uTitles.has(`${credit.type}:${credit.id}`),
      })),
    };
  }

  async getPersonMetadata(id: number, locale: string, refresh = false) {
    const language = tmdbLanguage(locale);
    const cacheKey = `person:v2:${id}`;
    let person = refresh ? undefined : await this.repository.getCached<TmdbPersonDetails>(cacheKey, language);
    if (!person) {
      person = await this.integrationService.execute((accessToken) =>
        this.provider.getPerson(accessToken, id, language),
      );
      await this.repository.setCached(
        cacheKey,
        language,
        "person",
        String(id),
        person as unknown as Record<string, unknown>,
        detailTtlMs,
      );
    }
    return { ...person, credits: combinePersonCredits(person.credits) };
  }

  async discover(type: TmdbMediaType, genreIds: number[], locale: string, page = 1) {
    const language = tmdbLanguage(locale);
    const normalizedGenres = [...new Set(genreIds)].sort((a, b) => a - b);
    const cacheKey = `discover:${type}:${normalizedGenres.join(",") || "all"}:${page}`;
    let result = await this.repository.getCached<TmdbCandidatePage>(cacheKey, language);
    if (!result) {
      result = await this.integrationService.execute((accessToken) =>
        this.provider.discover(accessToken, type, normalizedGenres, language, page),
      );
      await this.repository.setCached(
        cacheKey,
        language,
        "discover",
        undefined,
        result as unknown as Record<string, unknown>,
        discoveryTtlMs,
      );
    }
    return result;
  }

  async getPopularForUser(userId: string, locale: string) {
    const language = tmdbLanguage(locale);
    const [movies, series] = await Promise.all(
      (["movie", "series"] as const).map(async (type) => {
        const cacheKey = `popular:${type}:1`;
        let result = await this.repository.getCached<TmdbCandidatePage>(cacheKey, language);
        if (!result) {
          result = await this.integrationService.execute((accessToken) =>
            this.provider.popular(accessToken, type, language),
          );
          await this.repository.setCached(
            cacheKey,
            language,
            "discover",
            undefined,
            result as unknown as Record<string, unknown>,
            discoveryTtlMs,
          );
        }
        return result.results;
      }),
    );
    const results = [...movies, ...series];
    const titles = results.map((item) => ({ id: item.id, type: item.type }));
    const [libraryAvailability, m3uTitles, pendingTitles] = await Promise.all([
      this.getLibraryAvailability(userId, titles),
      this.getM3uAvailability(userId, titles),
      this.getPendingStrmTitles(titles),
    ]);
    return {
      page: 1,
      totalPages: 1,
      totalResults: results.length,
      results: results.map((item) => {
        const key = `${item.type}:${item.id}`;
        return {
          ...item,
          imagePath: item.posterPath,
          available: libraryAvailability.available.has(key),
          strmAvailable: libraryAvailability.strmAvailable.has(key),
          strmPending: m3uTitles.has(key) && pendingTitles.has(key),
          m3uAvailable: m3uTitles.has(key),
        };
      }),
    };
  }

  async getRecommendations(type: TmdbMediaType, id: number, locale: string, page = 1) {
    const language = tmdbLanguage(locale);
    const cacheKey = `recommendations:${type}:${id}:${page}`;
    let result = await this.repository.getCached<TmdbCandidatePage>(cacheKey, language);
    if (!result) {
      result = await this.integrationService.execute((accessToken) =>
        this.provider.getRecommendations(accessToken, type, id, language, page),
      );
      await this.repository.setCached(
        cacheKey,
        language,
        "recommendations",
        String(id),
        result as unknown as Record<string, unknown>,
        discoveryTtlMs,
      );
    }
    return result;
  }

  async getRecommendationsForUser(userId: string, type: TmdbMediaType, id: number, locale: string, page = 1) {
    const result = await this.getRecommendations(type, id, locale, page);
    const titles = result.results.map((item) => ({ id: item.id, type: item.type }));
    const [libraryAvailability, m3uTitles, pendingTitles] = await Promise.all([
      this.getLibraryAvailability(userId, titles),
      this.getM3uAvailability(userId, titles),
      this.getPendingStrmTitles(titles),
    ]);
    return {
      ...result,
      results: result.results.map((item) => {
        const key = `${item.type}:${item.id}`;
        return {
          ...item,
          available: libraryAvailability.available.has(key),
          strmAvailable: libraryAvailability.strmAvailable.has(key),
          strmPending: m3uTitles.has(key) && pendingTitles.has(key),
          m3uAvailable: m3uTitles.has(key),
        };
      }),
    };
  }

  getM3uAvailability(userId: string, titles: Array<{ id: number; type: "movie" | "series" }>) {
    return (
      this.m3uEditor?.getAvailable(userId, titles).catch(() => new Set<string>()) ?? Promise.resolve(new Set<string>())
    );
  }
  getPendingStrmTitles(titles: Array<{ id: number; type: "movie" | "series" }>) {
    return (
      this.m3uEditor?.getPendingTitles(titles).catch(() => new Set<string>()) ?? Promise.resolve(new Set<string>())
    );
  }
  async getLibraryAvailability(userId: string, titles: Array<{ id: number; type: "movie" | "series" }>) {
    const libraries = (await this.m3uEditor
      ?.getAccessibleMappedLibraries(userId)
      .catch(() => ({ movie: new Set<string>(), series: new Set<string>() }))) ?? {
      movie: new Set<string>(),
      series: new Set<string>(),
    };
    return this.repository.getAvailableTitles(userId, titles, libraries);
  }
}

function uniqueSearchResults(results: TmdbSearchPage["results"]) {
  const seen = new Set<string>();
  return results.filter((item) => {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function tmdbLanguage(locale: string) {
  if (locale === "sv") return "sv-SE";
  if (locale === "nl") return "nl-NL";
  return "en-US";
}

function combinePersonCredits(credits: TmdbPersonCredit[]) {
  const byTitle = new Map<string, TmdbPersonCredit>();
  for (const credit of credits) {
    const key = `${credit.type}:${credit.id}`;
    const current = byTitle.get(key);
    if (!current) {
      byTitle.set(key, { ...credit });
      continue;
    }
    const roles = new Set([...current.role.split(" · "), ...credit.role.split(" · ")]);
    byTitle.set(key, {
      ...current,
      role: [...roles].join(" · "),
      roleKinds: [...new Set([...(current.roleKinds ?? []), ...(credit.roleKinds ?? [])])],
    });
  }
  return [...byTitle.values()];
}
