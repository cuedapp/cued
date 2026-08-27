import { describe, expect, it, vi } from "vitest";
import { RecommendationService } from "@/server/application/recommendation.service";
import type { TmdbMetadataService } from "@/server/application/tmdb-metadata.service";
import type { RecommendationRepository } from "@/server/db/repositories/recommendation.repository";
import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";

describe("RecommendationService", () => {
  it("generates separate persisted movie and series candidates from private taste signals", async () => {
    const repository = {
      getSignals: vi.fn().mockResolvedValue([{ tmdbId: 1, type: "movie", played: true, playedPercentage: 100, rating: 5, excluded: false }]),
      getPositiveFeedback: vi.fn().mockResolvedValue([]),
      getRefreshState: vi.fn().mockResolvedValue(undefined),
      getExistingScores: vi.fn().mockResolvedValue(new Map()),
      getWatchedTitles: vi.fn().mockResolvedValue([{ tmdbId: 10, type: "movie" }]),
      saveRecommendations: vi.fn(),
      setRefreshState: vi.fn(),
    } as unknown as RecommendationRepository;
    const metadata = {
      getTitleMetadata: vi.fn().mockResolvedValue({ genres: [{ id: 28, name: "Action" }] }),
      discover: vi.fn().mockImplementation((type: "movie" | "series") => Promise.resolve({ page: 1, totalPages: 1, results: [
        { id: type === "movie" ? 10 : 20, type, title: `${type} candidate`, overview: "", genreIds: [28], rating: 7.5, voteCount: 500, popularity: 20 },
      ] })),
      getRecommendations: vi.fn().mockResolvedValue({ page: 1, totalPages: 1, results: [] }),
    } as unknown as TmdbMetadataService;
    const service = new RecommendationService(repository, {} as TmdbRepository, metadata);

    await service.refresh("user", "en");

    expect(metadata.discover).toHaveBeenCalledWith("movie", [28], "en");
    expect(metadata.discover).toHaveBeenCalledWith("series", [28], "en");
    expect(repository.saveRecommendations).toHaveBeenCalledWith("user", expect.arrayContaining([
      expect.objectContaining({ id: 20, type: "series" }),
    ]));
    expect(repository.saveRecommendations).not.toHaveBeenCalledWith("user", expect.arrayContaining([
      expect.objectContaining({ id: 10, type: "movie" }),
    ]));
    expect(repository.setRefreshState).toHaveBeenCalledWith("user", expect.any(String), "en");
  });

  it("keeps recommendations stable while signals and locale remain unchanged", async () => {
    let state: { signalFingerprint: string; locale: string; refreshedAt: Date } | undefined;
    const repository = {
      getSignals: vi.fn().mockResolvedValue([{ tmdbId: 1, type: "movie", played: true, playedPercentage: 100, rating: 5, excluded: false }]),
      getPositiveFeedback: vi.fn().mockResolvedValue([]),
      getRefreshState: vi.fn(() => Promise.resolve(state)),
      getExistingScores: vi.fn().mockResolvedValue(new Map()),
      getWatchedTitles: vi.fn().mockResolvedValue([]),
      saveRecommendations: vi.fn(),
      setRefreshState: vi.fn((_userId: string, signalFingerprint: string, locale: string) => { state = { signalFingerprint, locale, refreshedAt: new Date() }; }),
    } as unknown as RecommendationRepository;
    const metadata = {
      getTitleMetadata: vi.fn().mockResolvedValue({ genres: [{ id: 28, name: "Action" }] }),
      discover: vi.fn().mockImplementation((type: "movie" | "series") => Promise.resolve({ page: 1, totalPages: 1, results: [
        { id: type === "movie" ? 10 : 20, type, title: `${type} candidate`, overview: "", genreIds: [28], rating: 7.5, voteCount: 500, popularity: 20 },
      ] })),
      getRecommendations: vi.fn().mockResolvedValue({ page: 1, totalPages: 1, results: [] }),
    } as unknown as TmdbMetadataService;
    const service = new RecommendationService(repository, {} as TmdbRepository, metadata);

    await service.refresh("user", "en");
    await service.refresh("user", "en");

    expect(metadata.discover).toHaveBeenCalledTimes(2);
    expect(repository.setRefreshState).toHaveBeenCalledOnce();
  });
});
