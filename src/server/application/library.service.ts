import type { LibraryFilters, LibraryRepository } from "@/server/db/repositories/library.repository";

export class LibraryService {
  constructor(private readonly repository: LibraryRepository) {}

  async list(userId: string, filters: LibraryFilters, requestedPage: number, pageSize = 24) {
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    let result = await this.repository.list(userId, filters, page, pageSize);
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    const resolvedPage = Math.min(page, totalPages);
    if (resolvedPage !== page) result = await this.repository.list(userId, filters, resolvedPage, pageSize);
    return {
      page: resolvedPage,
      totalPages,
      total: result.total,
      items: result.items.map((item, index) => ({
        id: item.id,
        tmdbId: item.tmdbId,
        mediaType: item.kind as "movie" | "series",
        title: item.name,
        year: item.premiereDate?.getFullYear(),
        overview: stringValue(item.raw.Overview),
        reasons: stringArray(item.raw.Genres),
        genreIds: [],
        matchPercent: 0,
        score: result.items.length - index,
        rating: item.selectedRating,
        removedAt: item.removedAt?.toISOString() ?? null,
      })),
    };
  }

  listGenres(userId: string) {
    return this.repository.listGenres(userId);
  }

  getAccessibleJellyfinItemId(userId: string, mediaItemId: string) {
    return this.repository.getAccessibleJellyfinItemId(userId, mediaItemId);
  }

  getAvailableKeys(userId: string, titles: Array<{ type: "movie" | "series"; tmdbId: number }>) {
    return this.repository.getAvailableKeys(userId, titles);
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}
