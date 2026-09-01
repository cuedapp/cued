import type { ArrIntegrationService } from "./arr-integration.service";
import type { TmdbMetadataService } from "./tmdb-metadata.service";
import type {
  MediaRatingRepository,
  RatingSource,
  RatingValue,
} from "@/server/db/repositories/media-rating.repository";

const refreshIntervalMs = 7 * 24 * 60 * 60 * 1_000;
const failureRetryMs = 60 * 60 * 1_000;
const defaultBatchSize = 50;
const defaultConcurrency = 5;

export class MediaRatingService {
  constructor(
    private readonly repository: MediaRatingRepository,
    private readonly tmdb: TmdbMetadataService,
    private readonly radarr: ArrIntegrationService,
  ) {}

  async enrichDue(now = new Date(), limit = defaultBatchSize, concurrency = defaultConcurrency) {
    let run = await this.repository.getActiveRun();
    if (!run) {
      const due = await this.repository.hasDue(new Date(now.getTime() - refreshIntervalMs));
      if (!due) return { checked: 0, enriched: 0, failed: 0, completed: false };
      run = await this.repository.startRun(now);
    }
    const titles = await this.repository.listForRun(run.startedAt, new Date(now.getTime() - failureRetryMs), limit);
    const results = await mapWithConcurrency(titles, concurrency, async (title) => {
      const { ratings, failures } = await this.collect(title.mediaType, title.tmdbId);
      const unique = [...new Map(ratings.map((entry) => [entry.source, entry])).values()];
      await this.repository.save(
        title.mediaType,
        title.tmdbId,
        unique,
        now,
        failures.length > 0 ? failures.join("; ") : undefined,
      );
      return { enriched: unique.length > 0, failed: failures.length > 0 };
    });
    const remaining = await this.repository.hasRemaining(run.startedAt);
    if (!remaining) await this.repository.completeRun(run.id, now);
    return {
      checked: titles.length,
      enriched: results.filter((result) => result.enriched).length,
      failed: results.filter((result) => result.failed).length,
      completed: !remaining,
    };
  }

  async getTitleRatings(
    mediaType: "movie" | "series",
    tmdbId: number,
    tmdbRating: number,
    tmdbVotes?: number,
    now = new Date(),
  ) {
    const state = await this.repository.getRefreshState(mediaType, tmdbId);
    const refreshAfter = state?.error ? failureRetryMs : refreshIntervalMs;
    if (!state || now.getTime() - state.lastAttemptAt.getTime() >= refreshAfter) {
      const { ratings, failures } = await this.collect(
        mediaType,
        tmdbId,
        tmdbRating > 0 ? rating("tmdb", tmdbRating, 10, tmdbVotes) : undefined,
      );
      const unique = [...new Map(ratings.map((entry) => [entry.source, entry])).values()];
      await this.repository.save(mediaType, tmdbId, unique, now, failures.length > 0 ? failures.join("; ") : undefined);
    }
    return sortRatings(await this.repository.getRatings(mediaType, tmdbId));
  }

  private async collect(mediaType: "movie" | "series", tmdbId: number, knownTmdb?: RatingValue) {
    const ratings: RatingValue[] = knownTmdb ? [knownTmdb] : [];
    const failures: string[] = [];
    if (!knownTmdb) {
      try {
        const metadata = await this.tmdb.getTitleMetadata(mediaType, tmdbId, "en");
        if (metadata.rating > 0) ratings.push(rating("tmdb", metadata.rating, 10, metadata.voteCount));
      } catch {
        failures.push("TMDB unavailable");
      }
    }
    if (mediaType === "movie") {
      try {
        const movie = await this.radarr.lookupMetadata(tmdbId);
        ratings.push(...ratingsFromRadarr(movie?.raw));
      } catch {
        failures.push("Radarr unavailable");
      }
    }
    return { ratings, failures };
  }
}

export function ratingsFromRadarr(raw: Record<string, unknown> | undefined): RatingValue[] {
  if (!raw) return [];
  const providerRatings = raw.ratings;
  if (!record(providerRatings)) return [];
  const definitions: Array<[string, RatingSource, number]> = [
    ["imdb", "imdb", 10],
    ["tmdb", "tmdb", 10],
    ["rottenTomatoes", "rottenTomatoes", 100],
    ["metacritic", "metacritic", 100],
    ["trakt", "trakt", 10],
  ];
  return definitions.flatMap(([key, source, scale]) => {
    const item = providerRatings[key];
    if (!record(item) || typeof item.value !== "number" || !Number.isFinite(item.value) || item.value <= 0) return [];
    return [rating(source, item.value, scale, typeof item.votes === "number" ? item.votes : undefined)];
  });
}

function rating(source: RatingSource, value: number, scale: number, votes?: number): RatingValue {
  return {
    source,
    value,
    scale,
    normalizedScore: Math.round((value / scale) * 1_000) / 100,
    votes: votes !== undefined && votes > 0 ? Math.round(votes) : null,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortRatings(ratings: RatingValue[]) {
  const order: RatingSource[] = ["imdb", "rottenTomatoes", "metacritic", "tmdb", "trakt"];
  return ratings.sort((left, right) => order.indexOf(left.source) - order.indexOf(right.source));
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, task: (item: T) => Promise<R>) {
  const results: R[] = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]!);
    }
  });
  await Promise.all(workers);
  return results;
}
