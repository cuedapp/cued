import { describe, expect, it, vi } from "vitest";
import { TmdbMetadataService } from "@/server/application/tmdb-metadata.service";
import type { TmdbIntegrationService } from "@/server/application/tmdb-integration.service";
import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import type {
  TmdbCandidatePage,
  TmdbPersonDetails,
  TmdbProvider,
  TmdbSearchPage,
  TmdbTitleDetails,
} from "@/server/integrations/tmdb/provider";

describe("TmdbMetadataService", () => {
  it("marks titles above a user's content guidance as restricted", async () => {
    const repository = {
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(11),
      getCached: vi.fn().mockImplementation((key: string) =>
        Promise.resolve({
          id: Number(key.split(":").at(-1)),
          type: "movie",
          title: "Example",
          originalTitle: "Example",
          overview: "",
          genres: [],
          rating: 0,
          productionCountries: [],
          networks: [],
          cast: [],
          crew: [],
          videos: [],
          contentRatingAge: key.endsWith(":20") ? 18 : 7,
        }),
      ),
    } as unknown as TmdbRepository;
    const service = new TmdbMetadataService(repository, {} as TmdbIntegrationService, {} as TmdbProvider);

    const result = await service.getContentGuidance(
      "user",
      [
        { id: 10, type: "movie" },
        { id: 20, type: "movie" },
      ],
      "en",
    );

    expect(result.get("movie:10")).toEqual({
      contentRatingAge: 7,
      restricted: false,
      genres: [],
      dailyShow: false,
    });
    expect(result.get("movie:20")).toEqual({
      contentRatingAge: 18,
      restricted: true,
      genres: [],
      dailyShow: false,
    });
  });

  it("enforces a user's content limit using the Jellyfin rating when available", async () => {
    const title: TmdbTitleDetails = {
      id: 10,
      type: "movie",
      title: "Example",
      originalTitle: "Example",
      overview: "",
      genres: [],
      rating: 0,
      productionCountries: [],
      networks: [],
      cast: [],
      crew: [],
      videos: [],
      contentRating: "NC-17",
      contentRatingAge: 18,
    };
    const repository = {
      getCached: vi.fn().mockResolvedValue(title),
      getAvailableTitles: vi.fn().mockResolvedValue({ available: new Set(), strmAvailable: new Set() }),
      getAccessibleContentRating: vi.fn().mockResolvedValue({ contentRating: "SE-15", contentRatingAge: 16 }),
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(12),
    } as unknown as TmdbRepository;
    const service = new TmdbMetadataService(repository, {} as TmdbIntegrationService, {} as TmdbProvider);

    await expect(service.getTitle("user", "movie", 10, "sv")).rejects.toThrow("content-rating limit");
  });

  it("returns the provider rating when a title is within the user's limit", async () => {
    const title: TmdbTitleDetails = {
      id: 10,
      type: "movie",
      title: "Example",
      originalTitle: "Example",
      overview: "",
      genres: [],
      rating: 0,
      productionCountries: [],
      networks: [],
      cast: [],
      crew: [],
      videos: [],
      contentRating: "PG-13",
      contentRatingAge: 12,
    };
    const repository = {
      getCached: vi.fn().mockResolvedValue(title),
      getAvailableTitles: vi.fn().mockResolvedValue({ available: new Set(), strmAvailable: new Set() }),
      getAccessibleContentRating: vi.fn().mockResolvedValue(undefined),
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(12),
    } as unknown as TmdbRepository;
    const service = new TmdbMetadataService(repository, {} as TmdbIntegrationService, {} as TmdbProvider);

    await expect(service.getTitle("user", "movie", 10, "en")).resolves.toMatchObject({
      contentRating: "PG-13",
      contentRatingAge: 12,
    });
  });

  it("caches localized searches and marks only type-matched Jellyfin titles", async () => {
    let searchCached = false;
    const page: TmdbSearchPage = {
      page: 1,
      totalPages: 1,
      totalResults: 2,
      results: [
        { id: 10, type: "movie", title: "Movie", popularity: 2, genreIds: [] },
        { id: 10, type: "series", title: "Series", popularity: 1, genreIds: [] },
      ],
    };
    const repository = {
      getCached: vi.fn((key: string) => Promise.resolve(key.startsWith("search:") && searchCached ? page : undefined)),
      setCached: vi.fn((key: string) => {
        if (key.startsWith("search:")) searchCached = true;
      }),
      recordSearch: vi.fn(),
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(null),
      getAvailableTitles: vi
        .fn()
        .mockResolvedValue({ available: new Set(["movie:10"]), strmAvailable: new Set<string>() }),
    } as unknown as TmdbRepository;
    const integration = {
      execute: vi.fn((operation: (accessToken: string) => Promise<unknown>) => operation("token")),
    } as unknown as TmdbIntegrationService;
    const provider = { search: vi.fn().mockResolvedValue(page) } as unknown as TmdbProvider;
    const service = new TmdbMetadataService(repository, integration, provider);

    const first = await service.search("user", "  The   query ", "sv");
    const second = await service.search("user", "The query", "sv");

    expect(provider.search).toHaveBeenCalledOnce();
    expect(provider.search).toHaveBeenCalledWith("token", "The query", "sv-SE", 1);
    expect(repository.setCached).toHaveBeenCalledOnce();
    expect(repository.recordSearch).toHaveBeenCalledTimes(2);
    expect(first.results.map((item) => item.available)).toEqual([true, false]);
    expect(second.results.map((item) => item.available)).toEqual([true, false]);
  });

  it("combines two TMDB pages into one denser search page", async () => {
    const pages: TmdbSearchPage[] = [
      {
        page: 1,
        totalPages: 3,
        totalResults: 42,
        results: [
          { id: 10, type: "movie", title: "First", popularity: 2, genreIds: [] },
          { id: 20, type: "series", title: "Shared", popularity: 1, genreIds: [] },
        ],
      },
      {
        page: 2,
        totalPages: 3,
        totalResults: 42,
        results: [
          { id: 20, type: "series", title: "Shared duplicate", popularity: 1, genreIds: [] },
          { id: 30, type: "movie", title: "Last", popularity: 1, genreIds: [] },
        ],
      },
    ];
    const repository = {
      getCached: vi.fn().mockResolvedValue(undefined),
      setCached: vi.fn(),
      recordSearch: vi.fn(),
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(null),
      getAvailableTitles: vi.fn().mockResolvedValue({ available: new Set(), strmAvailable: new Set() }),
    } as unknown as TmdbRepository;
    const integration = {
      execute: vi.fn((operation: (accessToken: string) => Promise<unknown>) => operation("token")),
    } as unknown as TmdbIntegrationService;
    const provider = {
      search: vi.fn().mockResolvedValueOnce(pages[0]).mockResolvedValueOnce(pages[1]),
    } as unknown as TmdbProvider;
    const service = new TmdbMetadataService(repository, integration, provider);

    const result = await service.search("user", "query", "en", 1);

    expect(provider.search).toHaveBeenNthCalledWith(1, "token", "query", "en-US", 1);
    expect(provider.search).toHaveBeenNthCalledWith(2, "token", "query", "en-US", 2);
    expect(result).toMatchObject({ page: 1, totalPages: 2, totalResults: 42 });
    expect(result.results.map((item) => item.title)).toEqual(["First", "Shared", "Last"]);
  });

  it("returns a user's private recent searches", async () => {
    const repository = {
      getRecentSearches: vi.fn().mockResolvedValue([{ query: "The Movie" }]),
    } as unknown as TmdbRepository;
    const service = new TmdbMetadataService(repository, {} as TmdbIntegrationService, {} as TmdbProvider);

    await expect(service.getRecentSearches("user")).resolves.toEqual([{ query: "The Movie" }]);
    expect(repository.getRecentSearches).toHaveBeenCalledWith("user");
  });

  it("combines roles from cached person credits before rendering", async () => {
    const person: TmdbPersonDetails = {
      id: 976,
      name: "Example Person",
      biography: "",
      credits: [
        { id: 25, type: "movie", title: "Example Film", role: "Lead" },
        { id: 25, type: "movie", title: "Example Film", role: "Producer" },
      ],
    };
    const repository = {
      getCached: vi.fn().mockResolvedValue(person),
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(null),
      getAvailableTitles: vi
        .fn()
        .mockResolvedValue({ available: new Set(["movie:25"]), strmAvailable: new Set<string>() }),
    } as unknown as TmdbRepository;
    const service = new TmdbMetadataService(repository, {} as TmdbIntegrationService, {} as TmdbProvider);

    const result = await service.getPerson("user", 976, "en");

    expect(result.credits).toEqual([expect.objectContaining({ id: 25, role: "Lead · Producer", available: true })]);
    expect(repository.getAvailableTitles).toHaveBeenCalledWith("user", [{ id: 25, type: "movie" }], {
      movie: new Set(),
      series: new Set(),
    });
  });

  it("caches discovery candidates with normalized genre keys", async () => {
    const page: TmdbCandidatePage = { page: 1, totalPages: 1, results: [] };
    const repository = {
      getCached: vi.fn().mockResolvedValue(undefined),
      setCached: vi.fn(),
    } as unknown as TmdbRepository;
    const integration = {
      execute: vi.fn((operation: (accessToken: string) => Promise<unknown>) => operation("token")),
    } as unknown as TmdbIntegrationService;
    const provider = { discover: vi.fn().mockResolvedValue(page) } as unknown as TmdbProvider;
    const service = new TmdbMetadataService(repository, integration, provider);
    await service.discover("movie", [28, 12, 28], "en");
    expect(repository.getCached).toHaveBeenCalledWith("discover:movie:12,28:1", "en-US");
    expect(provider.discover).toHaveBeenCalledWith("token", "movie", [12, 28], "en-US", 1);
  });

  it("keeps only future regional movie and series releases in the upcoming feed", async () => {
    const date = (offset: number) => {
      const value = new Date();
      value.setUTCDate(value.getUTCDate() + offset);
      return value.toISOString().slice(0, 10);
    };
    const candidate = (
      id: number,
      type: "movie" | "series",
      releaseDate: string,
    ): TmdbCandidatePage["results"][number] => ({
      id,
      type,
      title: `Title ${id}`,
      overview: "",
      date: releaseDate,
      genreIds: [],
      rating: 7,
      voteCount: 100,
      popularity: 10,
    });
    const title = (id: number, type: "movie" | "series", nextAirDate?: string): TmdbTitleDetails => ({
      id,
      type,
      title: `Title ${id}`,
      originalTitle: `Title ${id}`,
      overview: "",
      genres: [],
      rating: 7,
      productionCountries: [],
      networks: [],
      cast: [],
      crew: [],
      videos: [],
      ...(nextAirDate ? { nextAirDate } : {}),
    });
    const repository = {
      getCached: vi.fn((key: string) => {
        if (key === "explore:v4:upcoming:movie:1:all:all:feed:all")
          return Promise.resolve({
            page: 1,
            totalPages: 1,
            results: [candidate(1, "movie", date(-1)), candidate(2, "movie", date(1))],
          });
        if (key === "explore:v4:upcoming:series:1:all:all:feed:all")
          return Promise.resolve({ page: 1, totalPages: 1, results: [candidate(3, "series", date(2))] });
        if (key === "title:v5:movie:1") return Promise.resolve(title(1, "movie"));
        if (key === "title:v5:movie:2") return Promise.resolve(title(2, "movie"));
        if (key === "title:v5:series:3")
          return Promise.resolve({ ...title(3, "series", date(2)), showType: "Talk Show" });
        return Promise.resolve(undefined);
      }),
      getMaximumContentRatingAge: vi.fn().mockResolvedValue(null),
      getAvailableTitles: vi.fn().mockResolvedValue({ available: new Set(), strmAvailable: new Set() }),
    } as unknown as TmdbRepository;
    const service = new TmdbMetadataService(repository, {} as TmdbIntegrationService, {} as TmdbProvider);

    const result = await service.getExploreForUser("user", "en", "upcoming", "all");

    expect(result.results.map((item) => item.id)).toEqual([2, 3]);
    expect(result.results.find((item) => item.id === 3)?.upcomingDate).toBe(date(2));
    expect(result.results.find((item) => item.id === 3)?.dailyShow).toBe(true);
  });
});
