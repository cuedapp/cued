import { describe, expect, it, vi } from "vitest";
import { MediaRatingService, ratingsFromRadarr } from "@/server/application/media-rating.service";
import type { MediaRatingRepository } from "@/server/db/repositories/media-rating.repository";
import type { TmdbMetadataService } from "@/server/application/tmdb-metadata.service";
import type { ArrIntegrationService } from "@/server/application/arr-integration.service";

describe("MediaRatingService", () => {
  it("normalizes Radarr rating scales while retaining original values and votes", () => {
    expect(ratingsFromRadarr({ ratings: {
      imdb: { value: 7.8, votes: 1234 },
      rottenTomatoes: { value: 91, votes: 50 },
      metacritic: { value: 68 },
      trakt: { value: 7.2, votes: 400 },
    } })).toEqual([
      { source: "imdb", value: 7.8, scale: 10, normalizedScore: 7.8, votes: 1234 },
      { source: "rottenTomatoes", value: 91, scale: 100, normalizedScore: 9.1, votes: 50 },
      { source: "metacritic", value: 68, scale: 100, normalizedScore: 6.8, votes: null },
      { source: "trakt", value: 7.2, scale: 10, normalizedScore: 7.2, votes: 400 },
    ]);
  });

  it("enriches series from TMDB and movies from TMDB plus Radarr", async () => {
    const repository = {
      getActiveRun: vi.fn().mockResolvedValue(undefined),
      hasDue: vi.fn().mockResolvedValue(true),
      startRun: vi.fn().mockImplementation((startedAt: Date) => ({ id: 1, startedAt })),
      listForRun: vi.fn().mockResolvedValue([{ mediaType: "series", tmdbId: 10 }, { mediaType: "movie", tmdbId: 20 }]),
      hasRemaining: vi.fn().mockResolvedValue(false),
      completeRun: vi.fn(),
      save: vi.fn(),
    } as unknown as MediaRatingRepository;
    const tmdb = { getTitleMetadata: vi.fn().mockImplementation((type: string) => Promise.resolve({ rating: type === "series" ? 8.4 : 7.1, voteCount: 900 })) } as unknown as TmdbMetadataService;
    const radarr = { lookupMetadata: vi.fn().mockResolvedValue({ raw: { ratings: { imdb: { value: 7.5, votes: 1000 }, tmdb: { value: 7.2, votes: 800 } } } }) } as unknown as ArrIntegrationService;
    const now = new Date("2026-08-31T12:00:00.000Z");

    await expect(new MediaRatingService(repository, tmdb, radarr).enrichDue(now)).resolves.toEqual({ checked: 2, enriched: 2, failed: 0, completed: true });
    expect(repository.listForRun).toHaveBeenCalledWith(now, new Date("2026-08-31T11:00:00.000Z"), 50);
    expect(repository.completeRun).toHaveBeenCalledWith(1, now);
    expect(radarr.lookupMetadata).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenNthCalledWith(1, "series", 10, [
      { source: "tmdb", value: 8.4, scale: 10, normalizedScore: 8.4, votes: 900 },
    ], now, undefined);
    expect(repository.save).toHaveBeenNthCalledWith(2, "movie", 20, [
      { source: "tmdb", value: 7.2, scale: 10, normalizedScore: 7.2, votes: 800 },
      { source: "imdb", value: 7.5, scale: 10, normalizedScore: 7.5, votes: 1000 },
    ], now, undefined);
  });

  it("does no work when no weekly refresh is due", async () => {
    const repository = { getActiveRun: vi.fn().mockResolvedValue(undefined), hasDue: vi.fn().mockResolvedValue(false) } as unknown as MediaRatingRepository;
    const service = new MediaRatingService(repository, {} as TmdbMetadataService, {} as ArrIntegrationService);

    await expect(service.enrichDue(new Date("2026-08-31T12:00:00.000Z"))).resolves.toEqual({ checked: 0, enriched: 0, failed: 0, completed: false });
  });

  it("refreshes a detail page on demand and returns ratings in display order", async () => {
    const repository = {
      getRefreshState: vi.fn().mockResolvedValue(undefined),
      save: vi.fn(),
      getRatings: vi.fn().mockResolvedValue([
        { source: "tmdb", value: 7.2, scale: 10, normalizedScore: 7.2, votes: 800 },
        { source: "rottenTomatoes", value: 91, scale: 100, normalizedScore: 9.1, votes: 50 },
        { source: "imdb", value: 7.5, scale: 10, normalizedScore: 7.5, votes: 1000 },
      ]),
    } as unknown as MediaRatingRepository;
    const radarr = { lookupMetadata: vi.fn().mockResolvedValue({ raw: { ratings: { imdb: { value: 7.5, votes: 1000 }, rottenTomatoes: { value: 91, votes: 50 } } } }) } as unknown as ArrIntegrationService;
    const now = new Date("2026-08-31T12:00:00.000Z");

    const result = await new MediaRatingService(repository, {} as TmdbMetadataService, radarr).getTitleRatings("movie", 20, 7.2, 800, now);

    expect(repository.save).toHaveBeenCalledWith("movie", 20, [
      { source: "tmdb", value: 7.2, scale: 10, normalizedScore: 7.2, votes: 800 },
      { source: "imdb", value: 7.5, scale: 10, normalizedScore: 7.5, votes: 1000 },
      { source: "rottenTomatoes", value: 91, scale: 100, normalizedScore: 9.1, votes: 50 },
    ], now, undefined);
    expect(result.map((rating) => rating.source)).toEqual(["imdb", "rottenTomatoes", "tmdb"]);
  });
});
