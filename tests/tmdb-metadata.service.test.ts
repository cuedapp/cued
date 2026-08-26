import { describe, expect, it, vi } from "vitest";
import { TmdbMetadataService } from "@/server/application/tmdb-metadata.service";
import type { TmdbIntegrationService } from "@/server/application/tmdb-integration.service";
import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import type { TmdbPersonDetails, TmdbProvider, TmdbSearchPage } from "@/server/integrations/tmdb/provider";

describe("TmdbMetadataService", () => {
  it("caches localized searches and marks only type-matched Jellyfin titles", async () => {
    const page: TmdbSearchPage = { page: 1, totalPages: 1, totalResults: 2, results: [
      { id: 10, type: "movie", title: "Movie", popularity: 2 },
      { id: 10, type: "series", title: "Series", popularity: 1 },
    ] };
    const repository = {
      getCached: vi.fn().mockResolvedValueOnce(undefined).mockResolvedValueOnce(page),
      setCached: vi.fn(),
      recordSearch: vi.fn(),
      getAvailableTitles: vi.fn().mockResolvedValue(new Set(["movie:10"])),
    } as unknown as TmdbRepository;
    const integration = { execute: vi.fn((operation: (accessToken: string) => Promise<unknown>) => operation("token")) } as unknown as TmdbIntegrationService;
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
      getAvailableTitles: vi.fn().mockResolvedValue(new Set(["movie:25"])),
    } as unknown as TmdbRepository;
    const service = new TmdbMetadataService(repository, {} as TmdbIntegrationService, {} as TmdbProvider);

    const result = await service.getPerson("user", 976, "en");

    expect(result.credits).toEqual([expect.objectContaining({ id: 25, role: "Lead · Producer", available: true })]);
    expect(repository.getAvailableTitles).toHaveBeenCalledWith("user", [{ id: 25, type: "movie" }]);
  });
});
