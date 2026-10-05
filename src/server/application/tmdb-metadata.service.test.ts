import { afterEach, describe, expect, it, vi } from "vitest";
import { TmdbMetadataService } from "./tmdb-metadata.service";
import type { TmdbCandidate, TmdbCandidatePage, TmdbProvider } from "@/server/integrations/tmdb/provider";

afterEach(() => vi.useRealTimers());

describe("TmdbMetadataService", () => {
  it("re-sorts cached collection parts so undated titles come last", async () => {
    const repository = {
      getCached: vi.fn().mockResolvedValue({
        id: 10,
        name: "Example collection",
        overview: "",
        parts: [
          { id: 3, type: "movie", title: "Undated" },
          { id: 2, type: "movie", title: "Second", date: "2002-01-01" },
          { id: 1, type: "movie", title: "First", date: "2001-01-01" },
        ],
      }),
      getAvailableTitles: vi.fn().mockResolvedValue({
        available: new Set<string>(),
        strmAvailable: new Set<string>(),
        watched: new Set<string>(),
        partiallyWatched: new Set<string>(),
      }),
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(null),
    };
    const service = new TmdbMetadataService(repository as never, {} as never, {} as never);
    vi.spyOn(service, "getTitleMetadata").mockResolvedValue({
      type: "movie",
      contentRatingAge: null,
      genres: [],
    } as never);

    const collection = await service.getCollectionForUser("user-1", 10, "en");

    expect(collection.parts.map((part) => part.title)).toEqual(["First", "Second", "Undated"]);
  });
  it("includes M3U-only titles in available seasonal results and marks pending STRM status", async () => {
    const candidate = (id: number, title: string) => ({ id, type: "movie", title, popularity: 10 - id });
    const repository = {
      getCached: vi.fn(async (key: string) =>
        key.startsWith("seasonal-keyword:")
          ? { results: [{ id: 7, name: "Halloween" }] }
          : { page: 1, totalPages: 1, results: [candidate(1, "M3U title"), candidate(2, "Unavailable title")] },
      ),
      setCached: vi.fn(),
      getAvailableTitles: vi.fn().mockResolvedValue({
        available: new Set<string>(),
        strmAvailable: new Set<string>(),
        watched: new Set<string>(),
        partiallyWatched: new Set<string>(),
      }),
    };
    const m3uEditor = {
      getAccessibleMappedLibraries: vi.fn().mockResolvedValue({ movie: new Set<string>(), series: new Set<string>() }),
      getAvailable: vi.fn().mockResolvedValue(new Set(["movie:1"])),
      getPendingTitles: vi.fn().mockResolvedValue(new Set(["movie:1"])),
    };
    const service = new TmdbMetadataService(repository as never, {} as never, {} as never, m3uEditor as never);
    vi.spyOn(service, "getContentGuidance").mockResolvedValue(new Map());

    const result = await service.getSeasonalForUser("user-1", "Halloween", "en", "movie", 1, {
      library: "all",
      watch: "all",
      availability: "available",
    });

    expect(result.results.map((item) => item.id)).toEqual([1]);
    expect(result.results[0]).toMatchObject({ m3uAvailable: true, strmPending: true, inLibrary: false });
  });
});

const allFilters = { library: "all", watch: "all", availability: "all" } as const;

function seasonalHarness(pages: Record<number, TmdbCandidatePage>) {
  const cache = new Map<string, unknown>();
  const repository = {
    getCached: vi.fn(async (key: string, language: string) => cache.get(`${language}:${key}`)),
    setCached: vi.fn(
      async (key: string, language: string, _resource: string, _id: string | undefined, value: unknown) => {
        cache.set(`${language}:${key}`, value);
      },
    ),
    getAvailableTitles: vi.fn().mockResolvedValue({
      available: new Set(["movie:1"]),
      strmAvailable: new Set(["movie:2"]),
      watched: new Set(["movie:1"]),
      partiallyWatched: new Set(["movie:3"]),
    }),
  };
  const provider = {
    searchKeywords: vi.fn(async (_token: string, query: string) => [
      { id: query === "Christmas" ? 8 : 7, name: query },
    ]),
    trending: vi.fn(async (_token: string, _type: string, _language: string, page: number) => pages[page]),
    discoverByKeyword: vi
      .fn<TmdbProvider["discoverByKeyword"]>()
      .mockImplementation(async (_token, _type, _id, _language, page = 1) => pages[page]),
    getKeywords: vi.fn(async (_token: string, _type: string, id: number) => [{ id: id === 2 ? 8 : 7, name: "Theme" }]),
  };
  const integration = { execute: async <T>(callback: (token: string) => Promise<T>) => callback("token") };
  const service = new TmdbMetadataService(repository as never, integration as never, provider as never);
  const guidance = vi.spyOn(service, "getContentGuidance").mockResolvedValue(new Map());
  return { service, provider, repository, guidance };
}

function seasonalCandidate(id: number, overrides: Partial<TmdbCandidate> = {}): TmdbCandidate {
  return {
    id,
    type: "movie",
    title: `Title ${id}`,
    overview: "",
    genreIds: [],
    rating: 0,
    voteCount: 0,
    popularity: id,
    ...overrides,
  };
}

describe("seasonal feed scopes", () => {
  it("keeps weekly trending rank and provider paging through theme-empty pages, sharing raw membership across users and themes", async () => {
    const { service, provider, guidance } = seasonalHarness({
      1: { page: 1, totalPages: 3, results: [seasonalCandidate(2)] },
      2: { page: 2, totalPages: 3, results: [seasonalCandidate(3), seasonalCandidate(4, { popularity: 100 })] },
    });
    expect(await service.getSeasonalForUser("adult", "Halloween", "en", "movie", 1, allFilters, "trending")).toEqual({
      page: 1,
      totalPages: 3,
      results: [],
    });
    const next = await service.getSeasonalForUser("adult", "Halloween", "en", "movie", 2, allFilters, "trending");
    expect(next.results.map((item) => item.id)).toEqual([3, 4]);
    guidance.mockResolvedValue(
      new Map([["movie:3", { contentRatingAge: 18, restricted: true, genres: [], dailyShow: false }]]),
    );
    const child = await service.getSeasonalForUser("child", "Halloween", "sv", "movie", 2, allFilters, "trending");
    expect(child.results.map((item) => item.id)).toEqual([4]);
    const christmas = await service.getSeasonalForUser("adult", "Christmas", "en", "movie", 1, allFilters, "trending");
    expect(christmas.results.map((item) => item.id)).toEqual([2]);
    expect(provider.getKeywords).toHaveBeenCalledTimes(3);
    expect(provider.discoverByKeyword).not.toHaveBeenCalled();
  });

  it("retains today's low-vote premieres, excludes earlier/undated releases and isolates scope and UTC date caches", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-02T23:59:00Z"));
    const candidates = [
      seasonalCandidate(1, { date: "2026-10-01" }),
      seasonalCandidate(2, { date: "2026-10-03" }),
      seasonalCandidate(3, { date: "2026-10-02" }),
      seasonalCandidate(4),
    ];
    const { service, provider } = seasonalHarness({ 1: { page: 1, totalPages: 4, results: candidates } });
    provider.discoverByKeyword.mockImplementation(async (_token, _type, _id, _language, page = 1, from) => ({
      page,
      totalPages: 4,
      results:
        from === "2026-10-03"
          ? [seasonalCandidate(6, { date: "2026-10-04" })]
          : from
            ? [...candidates, seasonalCandidate(5, { date: "2026-10-04" })]
            : candidates,
    }));
    const all = await service.getSeasonalForUser("user", "Halloween", "en", "movie", 1, allFilters);
    expect(all.results.map((item) => item.id)).toEqual([4, 3, 2, 1]);
    const upcoming = await service.getSeasonalForUser("user", "Halloween", "en", "movie", 1, allFilters, "upcoming");
    expect(upcoming.results.map((item) => [item.id, item.upcomingDate, item.voteCount])).toEqual([
      [3, "2026-10-02", 0],
      [2, "2026-10-03", 0],
      [5, "2026-10-04", 0],
    ]);
    expect(upcoming.totalPages).toBe(4);
    vi.setSystemTime(new Date("2026-10-03T00:01:00Z"));
    const tomorrow = await service.getSeasonalForUser("user", "Halloween", "en", "movie", 1, allFilters, "upcoming");
    expect(tomorrow.results.map((item) => [item.id, item.upcomingDate])).toEqual([[6, "2026-10-04"]]);
  });

  it.each([
    [{ library: "in" }, [1]],
    [{ library: "out" }, [2, 3, 4]],
    [{ watch: "watched" }, [1]],
    [{ watch: "unwatched" }, [2, 4]],
    [{ availability: "available" }, [1, 2]],
    [{ availability: "unavailable" }, [3, 4]],
  ] as const)("applies personal filters %j without changing raw pagination", async (filter, expected) => {
    const { service } = seasonalHarness({
      2: { page: 2, totalPages: 7, results: [1, 2, 3, 4].map((id) => seasonalCandidate(id)) },
    });
    const result = await service.getSeasonalForUser("user", "Halloween", "en", "movie", 2, {
      ...allFilters,
      ...filter,
    });
    expect(result.results.map((item) => item.id).sort()).toEqual(expected);
    expect(result).toMatchObject({ page: 2, totalPages: 7 });
  });

  it("preserves a provider's zero page count rather than advertising an extra page", async () => {
    const { service } = seasonalHarness({ 1: { page: 1, totalPages: 0, results: [] } });
    expect(await service.getSeasonalForUser("user", "Halloween", "en", "movie", 1, allFilters)).toEqual({
      page: 1,
      totalPages: 0,
      results: [],
    });
  });
});
