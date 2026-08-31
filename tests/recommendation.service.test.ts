import { describe, expect, it, vi } from "vitest";
import { RecommendationService, selectSimilaritySeeds } from "@/server/application/recommendation.service";
import type { RecommendationSignal } from "@/server/application/recommendation-scoring";
import type { TmdbMetadataService } from "@/server/application/tmdb-metadata.service";
import type { RecommendationRepository } from "@/server/db/repositories/recommendation.repository";
import type { TmdbRepository } from "@/server/db/repositories/tmdb.repository";
import type { AiEnhancementService } from "@/server/application/ai-enhancement.service";

describe("RecommendationService", () => {
  it("allows a non-personalized refresh before taste signals exist", async () => {
    const repository = {
      hasTasteSignals: vi.fn().mockResolvedValue(false),
      getLatestRun: vi.fn().mockResolvedValue({ id: "failed-run", status: "failed", error: "No positive taste signals were found for recommendation discovery" }),
      getRefreshState: vi.fn().mockResolvedValue(undefined),
    } as unknown as RecommendationRepository;
    const service = new RecommendationService(repository, {} as TmdbRepository, {} as TmdbMetadataService);

    await expect(service.getStatus("user")).resolves.toEqual({ run: undefined, needsRefresh: true, canRefresh: true, personalized: false });
  });

  it("keeps current recommendations during the configured quiet period", async () => {
    const repository = {
      hasTasteSignals: vi.fn().mockResolvedValue(true),
      getLatestRun: vi.fn().mockResolvedValue(undefined),
      getRefreshState: vi.fn().mockResolvedValue({ signalFingerprint: "pending", refreshedAt: new Date(0), refreshAfter: new Date(Date.now() + 60_000) }),
    } as unknown as RecommendationRepository;

    await expect(new RecommendationService(repository, {} as TmdbRepository, {} as TmdbMetadataService).getStatus("user")).resolves.toMatchObject({ needsRefresh: false });
  });

  it("resets the refresh timer using the active AI provider setting", async () => {
    const repository = { invalidateRefresh: vi.fn() } as unknown as RecommendationRepository;
    const enhancement = { getRefreshDelayMinutes: vi.fn().mockResolvedValue(15) } as unknown as AiEnhancementService;
    const before = Date.now();

    await new RecommendationService(repository, {} as TmdbRepository, {} as TmdbMetadataService, enhancement).invalidate("user");

    const refreshAfter = vi.mocked(repository.invalidateRefresh).mock.calls[0]![1]!;
    expect(refreshAfter.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000);
    expect(refreshAfter.getTime()).toBeLessThanOrEqual(Date.now() + 15 * 60_000);
  });

  it("uses general TMDB discovery when no taste signals exist", async () => {
    const repository = { getSignals: vi.fn().mockResolvedValue([]), getPositiveFeedback: vi.fn().mockResolvedValue([]), getRefreshState: vi.fn(), getExistingScores: vi.fn().mockResolvedValue(new Map()), getWatchedTitles: vi.fn().mockResolvedValue([]), saveRecommendations: vi.fn(), setRefreshState: vi.fn() } as unknown as RecommendationRepository;
    const candidate = (id: number, type: "movie" | "series") => ({ id, type, title: `${type} title`, overview: "", genreIds: [], rating: 8, voteCount: 500, popularity: 30 });
    const metadata = { discover: vi.fn((type: "movie" | "series") => Promise.resolve({ page: 1, totalPages: 1, results: [candidate(type === "movie" ? 1 : 2, type)] })) } as unknown as TmdbMetadataService;
    await new RecommendationService(repository, {} as TmdbRepository, metadata).refresh("user", "en");
    expect(metadata.discover).toHaveBeenCalledWith("movie", [], "en");
    expect(repository.saveRecommendations).toHaveBeenCalledWith("user", expect.arrayContaining([expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })]));
  });

  it("mixes highest-rated, newly rated and recently watched similarity seeds", () => {
    const signal = (tmdbId: number, type: "movie" | "series", rating: number | null, feedbackUpdatedAt?: Date, lastPlayedAt?: Date): RecommendationSignal => ({
      tmdbId, type, rating, ...(feedbackUpdatedAt ? { feedbackUpdatedAt } : {}), ...(lastPlayedAt ? { lastPlayedAt } : {}), tags: [], played: true, playedPercentage: 100, excluded: false, genres: [],
    });
    const oldestFiveStar = signal(1, "movie", 5, new Date("2025-01-01"));
    const newestFourStar = signal(2, "series", 4, new Date("2026-08-27"));
    const recentUnratedWatch = signal(3, "movie", null, undefined, new Date("2026-08-26"));
    const ignoredLowRating = signal(4, "movie", 2, new Date("2026-08-27"));

    expect(selectSimilaritySeeds([newestFourStar, ignoredLowRating, oldestFiveStar, recentUnratedWatch], 3)).toEqual([
      oldestFiveStar,
      newestFourStar,
      recentUnratedWatch,
    ]);
  });

  it("reserves similarity seeds for rated series when movies are more numerous", () => {
    const signals: RecommendationSignal[] = [
      ...Array.from({ length: 10 }, (_, index): RecommendationSignal => ({ tmdbId: index + 1, type: "movie", rating: 5, tags: [], played: true, playedPercentage: 100, excluded: false, genres: [] })),
      { tmdbId: 100, type: "series", rating: 5, tags: [], played: true, playedPercentage: 100, excluded: false, genres: [] },
      { tmdbId: 101, type: "series", rating: 4, tags: [], played: true, playedPercentage: 100, excluded: false, genres: [] },
    ];
    const selected = selectSimilaritySeeds(signals);
    expect(selected.filter((signal) => signal.type === "series").map((signal) => signal.tmdbId)).toEqual([100, 101]);
  });

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
