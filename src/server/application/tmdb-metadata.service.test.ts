import { afterEach, describe, expect, it, vi } from "vitest";
import { TmdbMetadataService } from "./tmdb-metadata.service";
import type { TmdbCandidate, TmdbCandidatePage, TmdbProvider } from "@/server/integrations/tmdb/provider";
import { defaultSeasonalFilters, parseSeasonalSelection, sortSeasonalItems } from "@/lib/seasonal-browsing";
import { TmdbClient } from "@/server/integrations/tmdb/client";

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
  it("includes M3U-only titles and marks pending STRM status without claiming library membership", async () => {
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
      ...defaultSeasonalFilters,
      availability: "m3u",
    });

    expect(result.results.map((item) => item.id)).toEqual([1]);
    expect(result.results[0]).toMatchObject({ m3uAvailable: true, strmPending: true, inLibrary: false });
  });
});

const allFilters = defaultSeasonalFilters;

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
    [{ library: "in" }, [1, 2]],
    [{ library: "out" }, [3, 4]],
    [{ watch: "watched" }, [1]],
    [{ watch: "unwatched" }, [2, 4]],
    [{ availability: "jellyfin" }, [1]],
    [{ availability: "strm" }, [2]],
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

describe("seasonal sorting and URL filters", () => {
  const candidates = [
    seasonalCandidate(5, { rating: 9, popularity: 50 }),
    seasonalCandidate(3, { rating: 8, popularity: 10, date: "2026-10-05" }),
    seasonalCandidate(2, { rating: 8, popularity: 20, date: "2026-10-02" }),
    seasonalCandidate(1, { rating: 8, popularity: 20, date: "2026-10-02" }),
    seasonalCandidate(4, { rating: 7, popularity: 30, date: "" }),
  ];
  it.each([
    ["feed", "trending", [5, 3, 2, 1, 4]],
    ["feed", "all", [5, 4, 1, 2, 3]],
    ["feed", "upcoming", [1, 2, 3, 5, 4]],
    ["rating", "trending", [5, 1, 2, 3, 4]],
    ["popularity", "upcoming", [5, 4, 1, 2, 3]],
    ["releaseAsc", "all", [1, 2, 3, 5, 4]],
    ["releaseDesc", "all", [3, 1, 2, 5, 4]],
  ] as const)("sorts %s in %s with undated releases last and deterministic ties", (sort, scope, expected) => {
    expect(sortSeasonalItems([...candidates], sort, scope).map((item) => item.id)).toEqual(expected);
  });

  it("parses complete bookmark filters and rejects unsupported values", () => {
    const parsed = parseSeasonalSelection(
      new URLSearchParams(
        "genre=0027&minimumRating=8&sort=releaseDesc&availability=strm&library=in&watch=unwatched&scope=trending&type=series",
      ),
    );
    expect(parsed).toMatchObject({
      genre: "27",
      minimumRating: "8",
      sort: "releaseDesc",
      availability: "strm",
      library: "in",
      watch: "unwatched",
      scope: "trending",
      type: "series",
    });
    for (const genre of ["0", "-2", "3.5", "2e1", "Infinity", "9007199254740992"]) {
      expect(parseSeasonalSelection(new URLSearchParams({ genre })).genre).toBe("all");
    }
    expect(
      parseSeasonalSelection(new URLSearchParams("minimumRating=4&sort=unknown&availability=available")),
    ).toMatchObject(defaultSeasonalFilters);
    expect(parseSeasonalSelection(new URLSearchParams("minimumRating=8.5")).minimumRating).toBe("all");
  });
});

describe("seasonal filter boundaries", () => {
  it("distinguishes STRM library entries, M3U-only sources and restricted titles across overlapping sources", async () => {
    const { service, guidance, repository } = seasonalHarness({
      1: { page: 1, totalPages: 1, results: [1, 2, 3, 4, 5].map((id) => seasonalCandidate(id)) },
    });
    repository.getAvailableTitles.mockResolvedValue({
      available: new Set(["movie:1", "movie:5"]),
      strmAvailable: new Set(["movie:2"]),
      watched: new Set(),
      partiallyWatched: new Set(),
    });
    vi.spyOn(service, "getM3uAvailability").mockResolvedValue(new Set(["movie:1", "movie:2", "movie:3", "movie:5"]));
    guidance.mockResolvedValue(
      new Map([["movie:5", { contentRatingAge: 18, restricted: true, genres: [], dailyShow: false }]]),
    );
    const browse = async (filters: Partial<typeof allFilters>) =>
      (await service.getSeasonalForUser("child", "Halloween", "en", "movie", 1, { ...allFilters, ...filters })).results;
    expect((await browse({ library: "in" })).map((item) => [item.id, item.inLibrary])).toEqual([
      [2, true],
      [1, true],
    ]);
    expect((await browse({ library: "out" })).map((item) => item.id)).toEqual([4, 3]);
    expect((await browse({ availability: "m3u" })).map((item) => [item.id, item.inLibrary])).toEqual([[3, false]]);
    expect((await browse({ availability: "strm" })).map((item) => item.id)).toEqual([2]);
    expect((await browse({ availability: "jellyfin" })).map((item) => item.id)).toEqual([1]);
    expect((await browse({ availability: "unavailable" })).map((item) => item.id)).toEqual([4]);
  });

  it("filters and sorts genuine trending candidates without changing the default rank", async () => {
    const { service } = seasonalHarness({
      1: {
        page: 1,
        totalPages: 2,
        results: [
          seasonalCandidate(1, { genreIds: [27], rating: 8, popularity: 1 }),
          seasonalCandidate(3, { genreIds: [35], rating: 9, popularity: 20 }),
          seasonalCandidate(4, { genreIds: [27], rating: 6, popularity: 30 }),
          seasonalCandidate(5, { genreIds: [27], rating: 9, popularity: 10 }),
        ],
      },
    });
    const filtered = { ...allFilters, genre: "27", minimumRating: "8" };
    const feed = await service.getSeasonalForUser("user", "Halloween", "en", "movie", 1, filtered, "trending");
    expect(feed.results.map((item) => item.id)).toEqual([1, 5]);
    const rated = await service.getSeasonalForUser(
      "user",
      "Halloween",
      "en",
      "movie",
      1,
      { ...filtered, sort: "rating" },
      "trending",
    );
    expect(rated.results.map((item) => item.id)).toEqual([5, 1]);
  });

  it("applies catalogue genre, rating and ordering before pagination and isolates all three cache dimensions", async () => {
    const catalogue = [
      { id: 1, title: "Popular comedy", genre_ids: [35], vote_average: 9, popularity: 100, release_date: "2020-01-01" },
      {
        id: 2,
        title: "Low-rated horror",
        genre_ids: [27],
        vote_average: 5,
        popularity: 90,
        release_date: "2021-01-01",
      },
      { id: 3, title: "Popular horror", genre_ids: [27], vote_average: 8, popularity: 80, release_date: "2022-01-01" },
      { id: 4, title: "Rated horror", genre_ids: [27], vote_average: 9, popularity: 70, release_date: "2023-01-01" },
      { id: 5, title: "Newest horror", genre_ids: [27], vote_average: 8, popularity: 60, release_date: "2024-01-01" },
    ];
    const transport = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === "/3/search/keyword") return Response.json({ results: [{ id: 7, name: "Halloween" }] });
      const params = url.searchParams;
      const filtered = catalogue.filter(
        (item) =>
          (!params.has("with_genres") || item.genre_ids.includes(Number(params.get("with_genres")))) &&
          (!params.has("vote_average.gte") || item.vote_average >= Number(params.get("vote_average.gte"))),
      );
      filtered.sort((left, right) => {
        switch (params.get("sort_by")) {
          case "vote_average.desc":
            return right.vote_average - left.vote_average || right.popularity - left.popularity;
          case "primary_release_date.desc":
            return right.release_date.localeCompare(left.release_date);
          default:
            return right.popularity - left.popularity;
        }
      });
      const page = Number(params.get("page"));
      return Response.json({
        page,
        total_pages: Math.ceil(filtered.length / 2),
        results: filtered.slice((page - 1) * 2, page * 2),
      });
    });
    const { repository } = seasonalHarness({});
    const service = new TmdbMetadataService(
      repository as never,
      { execute: async <T>(callback: (token: string) => Promise<T>) => callback("token") } as never,
      new TmdbClient(transport),
    );
    vi.spyOn(service, "getContentGuidance").mockResolvedValue(new Map());
    const browse = async (filters: Partial<typeof allFilters>) => {
      const result = await service.getSeasonalForUser("user", "Halloween", "en", "movie", 1, {
        ...allFilters,
        ...filters,
      });
      return [result.totalPages, result.results.map((item) => item.id)];
    };
    expect(await browse({})).toEqual([3, [1, 2]]);
    expect(await browse({ genre: "27" })).toEqual([2, [2, 3]]);
    expect(await browse({ genre: "27", minimumRating: "8" })).toEqual([2, [3, 4]]);
    expect(await browse({ genre: "27", minimumRating: "8", sort: "rating" })).toEqual([2, [4, 3]]);
    expect(await browse({ genre: "27", minimumRating: "8", sort: "releaseDesc" })).toEqual([2, [5, 4]]);
    catalogue.splice(0);
    expect(await browse({ genre: "27", minimumRating: "8", sort: "rating" })).toEqual([2, [4, 3]]);
  });

  it("keeps full movie and series genre catalogues independently cached per locale", async () => {
    let revision = 0;
    const transport = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      const movie = url.pathname === "/3/genre/movie/list";
      const swedish = url.searchParams.get("language") === "sv-SE";
      const genres = movie
        ? [
            { id: 27, name: swedish ? "Skräck" : "Horror" },
            { id: 35, name: swedish ? "Komedi" : "Comedy" },
          ]
        : [{ id: 10765, name: swedish ? "Sci-Fi & Fantasy" : "Science Fiction & Fantasy" }];
      return Response.json({ genres: genres.map((genre) => ({ ...genre, name: revision ? "Changed" : genre.name })) });
    });
    const { repository } = seasonalHarness({});
    const service = new TmdbMetadataService(
      repository as never,
      { execute: async <T>(callback: (token: string) => Promise<T>) => callback("token") } as never,
      new TmdbClient(transport),
    );
    expect(await service.getGenreCatalog("sv")).toEqual({
      movie: [
        { id: 27, name: "Skräck" },
        { id: 35, name: "Komedi" },
      ],
      series: [{ id: 10765, name: "Sci-Fi & Fantasy" }],
    });
    expect(await service.getGenreCatalog("en")).toEqual({
      movie: [
        { id: 27, name: "Horror" },
        { id: 35, name: "Comedy" },
      ],
      series: [{ id: 10765, name: "Science Fiction & Fantasy" }],
    });
    revision++;
    expect((await service.getGenreCatalog("sv")).movie[0].name).toBe("Skräck");
    expect((await service.getGenreCatalog("en")).series[0].name).toBe("Science Fiction & Fantasy");
    expect((await service.getGenreCatalog("nl")).movie[0].name).toBe("Changed");
  });
});
