import "server-only";
import { and, asc, desc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { jobRuns, mediaItems, mediaRatingRefreshStates, mediaRatings } from "@/server/db/schema";

export type RatingSource = "tmdb" | "imdb" | "rottenTomatoes" | "metacritic" | "trakt";
export type RatingValue = { source: RatingSource; value: number; scale: number; normalizedScore: number; votes: number | null };

export class MediaRatingRepository {
  async hasDue(staleBefore: Date) {
    const rows = await this.dueQuery(or(isNull(mediaRatingRefreshStates.id), lt(mediaRatingRefreshStates.lastAttemptAt, staleBefore))).limit(1);
    return rows.length > 0;
  }

  async listForRun(runStartedAt: Date, retryBefore: Date, limit: number) {
    return this.mapTitles(await this.dueQuery(or(
      isNull(mediaRatingRefreshStates.id),
      lt(mediaRatingRefreshStates.lastAttemptAt, runStartedAt),
      and(isNotNull(mediaRatingRefreshStates.error), lt(mediaRatingRefreshStates.lastAttemptAt, retryBefore)),
    )).limit(limit));
  }

  async hasRemaining(runStartedAt: Date) {
    const rows = await this.dueQuery(or(
      isNull(mediaRatingRefreshStates.id),
      lt(mediaRatingRefreshStates.lastAttemptAt, runStartedAt),
      isNotNull(mediaRatingRefreshStates.error),
    )).limit(1);
    return rows.length > 0;
  }

  async getActiveRun() {
    return db.query.jobRuns.findFirst({ where: and(eq(jobRuns.jobName, "media-rating-sync"), eq(jobRuns.status, "running")), orderBy: desc(jobRuns.startedAt) });
  }

  async startRun(startedAt: Date) {
    const [run] = await db.insert(jobRuns).values({ jobName: "media-rating-sync", status: "running", startedAt }).returning();
    return run!;
  }

  async completeRun(id: number, finishedAt: Date) {
    await db.update(jobRuns).set({ status: "completed", finishedAt }).where(eq(jobRuns.id, id));
  }

  getRefreshState(mediaType: "movie" | "series", tmdbId: number) {
    return db.query.mediaRatingRefreshStates.findFirst({ where: and(eq(mediaRatingRefreshStates.mediaType, mediaType), eq(mediaRatingRefreshStates.tmdbId, tmdbId)) });
  }

  async getRatings(mediaType: "movie" | "series", tmdbId: number): Promise<RatingValue[]> {
    const rows = await db.select({ source: mediaRatings.source, value: mediaRatings.value, scale: mediaRatings.scale, normalizedScore: mediaRatings.normalizedScore, votes: mediaRatings.votes })
      .from(mediaRatings)
      .where(and(eq(mediaRatings.mediaType, mediaType), eq(mediaRatings.tmdbId, tmdbId)));
    return rows.flatMap((row) => isRatingSource(row.source) ? [{ ...row, source: row.source }] : []);
  }

  private dueQuery(refreshCondition: ReturnType<typeof or>) {
    return db.selectDistinct({ mediaType: mediaItems.kind, tmdbId: mediaItems.tmdbId, lastAttemptAt: mediaRatingRefreshStates.lastAttemptAt })
      .from(mediaItems)
      .leftJoin(mediaRatingRefreshStates, and(
        eq(mediaRatingRefreshStates.mediaType, mediaItems.kind),
        eq(mediaRatingRefreshStates.tmdbId, mediaItems.tmdbId),
      ))
      .where(and(
        inArray(mediaItems.kind, ["movie", "series"]),
        isNotNull(mediaItems.tmdbId),
        isNull(mediaItems.removedAt),
        refreshCondition,
      ))
      .orderBy(asc(mediaRatingRefreshStates.lastAttemptAt));
  }

  private mapTitles(rows: Array<{ mediaType: string; tmdbId: number | null }>): Array<{ mediaType: "movie" | "series"; tmdbId: number }> {
    return rows.flatMap((row) => row.tmdbId !== null && (row.mediaType === "movie" || row.mediaType === "series")
      ? [{ mediaType: row.mediaType as "movie" | "series", tmdbId: row.tmdbId }]
      : []);
  }

  async save(mediaType: "movie" | "series", tmdbId: number, ratings: RatingValue[], attemptedAt: Date, error?: string) {
    if (ratings.length > 0) {
      await db.insert(mediaRatings).values(ratings.map((rating) => ({
        mediaType,
        tmdbId,
        source: rating.source,
        value: rating.value,
        scale: rating.scale,
        normalizedScore: rating.normalizedScore,
        votes: rating.votes,
        fetchedAt: attemptedAt,
        updatedAt: attemptedAt,
      }))).onConflictDoUpdate({
        target: [mediaRatings.mediaType, mediaRatings.tmdbId, mediaRatings.source],
        set: {
          value: sql`excluded.value`,
          scale: sql`excluded.scale`,
          normalizedScore: sql`excluded.normalized_score`,
          votes: sql`excluded.votes`,
          fetchedAt: attemptedAt,
          updatedAt: attemptedAt,
        },
      });
    }
    await db.insert(mediaRatingRefreshStates).values({
      mediaType,
      tmdbId,
      lastAttemptAt: attemptedAt,
      lastSuccessAt: ratings.length > 0 ? attemptedAt : null,
      error: error ?? null,
    }).onConflictDoUpdate({
      target: [mediaRatingRefreshStates.mediaType, mediaRatingRefreshStates.tmdbId],
      set: {
        lastAttemptAt: attemptedAt,
        ...(ratings.length > 0 ? { lastSuccessAt: attemptedAt } : {}),
        error: error ?? null,
      },
    });
  }
}

function isRatingSource(value: string): value is RatingSource {
  return value === "tmdb" || value === "imdb" || value === "rottenTomatoes" || value === "metacritic" || value === "trakt";
}

export const mediaRatingRepository = new MediaRatingRepository();
