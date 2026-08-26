import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import type { TmdbMediaType, TmdbPersonDetails, TmdbProvider, TmdbSearchPage, TmdbTitleDetails } from "@/server/integrations/tmdb/provider";
import type { TmdbIntegrationService } from "./tmdb-integration.service";

const searchTtlMs = 15 * 60 * 1_000;
const detailTtlMs = 24 * 60 * 60 * 1_000;

export class TmdbMetadataService {
  constructor(
    private readonly repository: TmdbRepository,
    private readonly integrationService: TmdbIntegrationService,
    private readonly provider: TmdbProvider,
  ) {}

  async search(userId: string, query: string, locale: string, page = 1) {
    const normalizedQuery = query.trim().replace(/\s+/g, " ");
    if (!normalizedQuery) return { page: 1, totalPages: 0, totalResults: 0, results: [] };
    const language = tmdbLanguage(locale);
    const cacheKey = `search:${normalizedQuery.toLocaleLowerCase(locale)}:${page}`;
    let result = await this.repository.getCached<TmdbSearchPage>(cacheKey, language);
    if (!result) {
      result = await this.integrationService.execute((accessToken) => this.provider.search(accessToken, normalizedQuery, language, page));
      await this.repository.setCached(cacheKey, language, "search", undefined, result as unknown as Record<string, unknown>, searchTtlMs);
    }
    await this.repository.recordSearch(userId, normalizedQuery);
    const titles = result.results.flatMap((item) => item.type === "person" ? [] : [{ id: item.id, type: item.type }]);
    const availableTitles = await this.repository.getAvailableTitles(userId, titles);
    return { ...result, results: result.results.map((item) => ({ ...item, available: item.type !== "person" && availableTitles.has(`${item.type}:${item.id}`) })) };
  }

  async getRecentSearches(userId: string) {
    return this.repository.getRecentSearches(userId);
  }

  async getTitle(userId: string, type: TmdbMediaType, id: number, locale: string) {
    const language = tmdbLanguage(locale);
    const cacheKey = `title:${type}:${id}`;
    let title = await this.repository.getCached<TmdbTitleDetails>(cacheKey, language);
    if (!title) {
      title = await this.integrationService.execute((accessToken) => this.provider.getTitle(accessToken, type, id, language));
      await this.repository.setCached(cacheKey, language, "title", String(id), title as unknown as Record<string, unknown>, detailTtlMs);
    }
    const availableTitles = await this.repository.getAvailableTitles(userId, [{ id, type }]);
    return { ...title, available: availableTitles.has(`${type}:${id}`) };
  }

  async getPerson(userId: string, id: number, locale: string) {
    const language = tmdbLanguage(locale);
    const cacheKey = `person:${id}`;
    let person = await this.repository.getCached<TmdbPersonDetails>(cacheKey, language);
    if (!person) {
      person = await this.integrationService.execute((accessToken) => this.provider.getPerson(accessToken, id, language));
      await this.repository.setCached(cacheKey, language, "person", String(id), person as unknown as Record<string, unknown>, detailTtlMs);
    }
    const credits = combinePersonCredits(person.credits);
    const availableTitles = await this.repository.getAvailableTitles(userId, credits.map((credit) => ({ id: credit.id, type: credit.type })));
    return { ...person, credits: credits.map((credit) => ({ ...credit, available: availableTitles.has(`${credit.type}:${credit.id}`) })) };
  }
}

export function tmdbLanguage(locale: string) {
  if (locale === "sv") return "sv-SE";
  if (locale === "nl") return "nl-NL";
  return "en-US";
}

function combinePersonCredits<T extends { id: number; type: string; role: string }>(credits: T[]) {
  const byTitle = new Map<string, T>();
  for (const credit of credits) {
    const key = `${credit.type}:${credit.id}`;
    const current = byTitle.get(key);
    if (!current) {
      byTitle.set(key, { ...credit });
      continue;
    }
    const roles = new Set([...current.role.split(" · "), ...credit.role.split(" · ")]);
    byTitle.set(key, { ...current, role: [...roles].join(" · ") });
  }
  return [...byTitle.values()];
}
