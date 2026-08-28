import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mediaItems, recommendationRefreshStates, recommendationRuns, recommendations, userMediaFeedback, userMediaStates } from "@/server/db/schema";
import type { ScoredRecommendation } from "@/server/application/recommendation-scoring";

export class RecommendationRepository {
  async getWatchedTitles(userId: string) {
    return db.select({ tmdbId: mediaItems.tmdbId, type: mediaItems.kind })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .where(and(
        eq(userMediaStates.userId, userId),
        eq(userMediaStates.played, true),
        isNotNull(mediaItems.tmdbId),
        inArray(mediaItems.kind, ["movie", "series"]),
      ));
  }

  async getSignals(userId: string) {
    return db.select({
      tmdbId: mediaItems.tmdbId,
      type: mediaItems.kind,
      played: userMediaStates.played,
      playedPercentage: userMediaStates.playedPercentage,
      rating: userMediaFeedback.rating,
      tags: userMediaFeedback.tags,
      feedback: userMediaFeedback.feedback,
      excluded: userMediaFeedback.excluded,
      feedbackUpdatedAt: userMediaFeedback.updatedAt,
      title: mediaItems.name,
      lastPlayedAt: userMediaStates.lastPlayedAt,
    }).from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .leftJoin(userMediaFeedback, and(eq(userMediaFeedback.userId, userId), eq(userMediaFeedback.mediaItemId, mediaItems.id)))
      .where(and(
        eq(userMediaStates.userId, userId),
        inArray(mediaItems.kind, ["movie", "series"]),
        or(
          isNotNull(userMediaFeedback.rating),
          eq(userMediaFeedback.excluded, true),
          eq(userMediaStates.played, true),
          gte(userMediaStates.playedPercentage, 20),
        ),
      ))
      .orderBy(sql`${userMediaFeedback.updatedAt} desc nulls last`, sql`${userMediaStates.lastPlayedAt} desc nulls last`, desc(userMediaFeedback.rating));
  }

  async getRecommendations(userId: string, hidden = false, limit = 24) {
    return db.query.recommendations.findMany({
      where: hidden ? and(eq(recommendations.userId, userId), isNotNull(recommendations.hiddenAt)) : and(eq(recommendations.userId, userId), isNull(recommendations.hiddenAt)),
      orderBy: [
        sql`case when jsonb_array_length(${recommendations.sourceTitles}) > 0 then 2 when ${recommendations.aiScore} is not null then 1 else 0 end desc`,
        desc(recommendations.matchPercent),
        desc(recommendations.score),
        desc(recommendations.generatedAt),
      ],
      limit,
    });
  }

  async getRecommendation(userId: string, type: "movie" | "series", tmdbId: number) {
    return db.query.recommendations.findFirst({ where: and(eq(recommendations.userId, userId), eq(recommendations.mediaType, type), eq(recommendations.tmdbId, tmdbId), isNull(recommendations.hiddenAt)) });
  }

  async getExistingScores(userId: string) {
    const rows = await db.select({ mediaType: recommendations.mediaType, tmdbId: recommendations.tmdbId, score: recommendations.score }).from(recommendations).where(eq(recommendations.userId, userId));
    return new Map(rows.map((row) => [`${row.mediaType}:${row.tmdbId}`, row.score]));
  }

  async saveRecommendations(userId: string, items: ScoredRecommendation[]) {
    if (items.length === 0) return;
    const now = new Date();
    for (const item of items) {
      await db.insert(recommendations).values({
        userId,
        mediaType: item.type,
        tmdbId: item.id,
        title: item.title,
        overview: item.overview,
        posterPath: item.posterPath,
        releaseDate: item.date,
        genreIds: item.genreIds,
        score: item.score,
        matchPercent: item.matchPercent,
        reasons: item.reasons,
        sourceTitles: item.sourceTitles,
        aiScore: item.aiScore,
        aiExplanation: item.aiExplanation,
        generatedAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [recommendations.userId, recommendations.mediaType, recommendations.tmdbId],
        set: { title: item.title, overview: item.overview, posterPath: item.posterPath ?? null, releaseDate: item.date ?? null, genreIds: item.genreIds, score: item.score, matchPercent: item.matchPercent, reasons: item.reasons, sourceTitles: item.sourceTitles, aiScore: item.aiScore ?? null, aiExplanation: item.aiExplanation ?? null, generatedAt: now, updatedAt: now },
      });
    }
  }

  async clearRecommendations(userId: string) {
    await db.delete(recommendations).where(eq(recommendations.userId, userId));
    await this.invalidateRefresh(userId);
  }

  async getRefreshState(userId: string) {
    return db.query.recommendationRefreshStates.findFirst({ where: eq(recommendationRefreshStates.userId, userId) });
  }

  async getPositiveFeedback(userId: string) {
    return db.select({ tmdbId: recommendations.tmdbId, type: recommendations.mediaType, title: recommendations.title, genreIds: recommendations.genreIds }).from(recommendations)
      .where(and(eq(recommendations.userId, userId), eq(recommendations.feedback, "moreLikeThis")));
  }

  async setRefreshState(userId: string, signalFingerprint: string, locale: string) {
    const now = new Date();
    await db.insert(recommendationRefreshStates).values({ userId, signalFingerprint, locale, refreshedAt: now, updatedAt: now }).onConflictDoUpdate({
      target: recommendationRefreshStates.userId,
      set: { signalFingerprint, locale, refreshedAt: now, updatedAt: now },
    });
  }

  async getDueRefreshes(before: Date) {
    return db.select({ userId: recommendationRefreshStates.userId, locale: recommendationRefreshStates.locale }).from(recommendationRefreshStates).where(lt(recommendationRefreshStates.refreshedAt, before));
  }

  async invalidateRefresh(userId: string) {
    await db.delete(recommendationRefreshStates).where(eq(recommendationRefreshStates.userId, userId));
  }

  async getLatestRun(userId: string) {
    return db.query.recommendationRuns.findFirst({ where: eq(recommendationRuns.userId, userId), orderBy: (run, { desc }) => desc(run.startedAt) });
  }

  async startRun(userId: string) {
    const active = await db.query.recommendationRuns.findFirst({ where: and(eq(recommendationRuns.userId, userId), eq(recommendationRuns.status, "running")) });
    if (active) return undefined;
    const [run] = await db.insert(recommendationRuns).values({ userId }).returning();
    return run;
  }

  async updateRun(runId: string, values: { phase?: string; processedItems?: number; totalItems?: number }) {
    await db.update(recommendationRuns).set({ ...values, updatedAt: new Date() }).where(eq(recommendationRuns.id, runId));
  }

  async completeRun(runId: string) {
    await db.update(recommendationRuns).set({ status: "completed", phase: "completed", finishedAt: new Date(), updatedAt: new Date() }).where(eq(recommendationRuns.id, runId));
  }

  async failRun(runId: string, error: string) {
    await db.update(recommendationRuns).set({ status: "failed", phase: "failed", error, finishedAt: new Date(), updatedAt: new Date() }).where(eq(recommendationRuns.id, runId));
  }

  async setFeedback(userId: string, recommendationId: string, feedback: "moreLikeThis" | "notInterested" | null) {
    await db.update(recommendations).set({ feedback, hiddenAt: feedback === "notInterested" ? new Date() : null, updatedAt: new Date() }).where(and(eq(recommendations.id, recommendationId), eq(recommendations.userId, userId)));
  }
}

export const recommendationRepository = new RecommendationRepository();
