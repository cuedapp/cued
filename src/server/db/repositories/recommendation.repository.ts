import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  mediaItems,
  recommendationRefreshStates,
  recommendationRuns,
  recommendations,
  userMediaFeedback,
  userMediaStates,
} from "@/server/db/schema";
import type { ScoredRecommendation } from "@/server/application/recommendation-scoring";

export class RecommendationRepository {
  async getWatchedTitles(userId: string) {
    return db
      .select({ tmdbId: mediaItems.tmdbId, type: mediaItems.kind })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .where(
        and(
          eq(userMediaStates.userId, userId),
          eq(userMediaStates.played, true),
          isNotNull(mediaItems.tmdbId),
          inArray(mediaItems.kind, ["movie", "series"]),
        ),
      );
  }

  async getSignals(userId: string) {
    return db
      .select({
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
      })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .leftJoin(
        userMediaFeedback,
        and(eq(userMediaFeedback.userId, userId), eq(userMediaFeedback.mediaItemId, mediaItems.id)),
      )
      .where(
        and(
          eq(userMediaStates.userId, userId),
          inArray(mediaItems.kind, ["movie", "series"]),
          or(
            isNotNull(userMediaFeedback.rating),
            eq(userMediaFeedback.excluded, true),
            eq(userMediaStates.played, true),
            gte(userMediaStates.playedPercentage, 20),
          ),
        ),
      )
      .orderBy(
        sql`${userMediaFeedback.updatedAt} desc nulls last`,
        sql`${userMediaStates.lastPlayedAt} desc nulls last`,
        desc(userMediaFeedback.rating),
      );
  }

  async hasTasteSignals(userId: string) {
    const [mediaSignal, recommendationSignal] = await Promise.all([
      db
        .select({ id: mediaItems.id })
        .from(userMediaStates)
        .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
        .leftJoin(
          userMediaFeedback,
          and(eq(userMediaFeedback.userId, userId), eq(userMediaFeedback.mediaItemId, mediaItems.id)),
        )
        .where(
          and(
            eq(userMediaStates.userId, userId),
            isNotNull(mediaItems.tmdbId),
            inArray(mediaItems.kind, ["movie", "series"]),
            or(isNull(userMediaFeedback.excluded), eq(userMediaFeedback.excluded, false)),
            or(
              gte(userMediaFeedback.rating, 3),
              eq(userMediaStates.played, true),
              gte(userMediaStates.playedPercentage, 20),
            ),
          ),
        )
        .limit(1),
      db
        .select({ id: recommendations.id })
        .from(recommendations)
        .where(and(eq(recommendations.userId, userId), eq(recommendations.feedback, "moreLikeThis")))
        .limit(1),
    ]);
    return mediaSignal.length > 0 || recommendationSignal.length > 0;
  }

  async getRecommendations(userId: string, hidden = false, limit = 24) {
    return db.query.recommendations.findMany({
      where: hidden
        ? and(eq(recommendations.userId, userId), isNotNull(recommendations.hiddenAt))
        : and(eq(recommendations.userId, userId), isNull(recommendations.hiddenAt)),
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
    return db.query.recommendations.findFirst({
      where: and(
        eq(recommendations.userId, userId),
        eq(recommendations.mediaType, type),
        eq(recommendations.tmdbId, tmdbId),
        isNull(recommendations.hiddenAt),
      ),
    });
  }

  async getExistingScores(userId: string) {
    const rows = await db
      .select({ mediaType: recommendations.mediaType, tmdbId: recommendations.tmdbId, score: recommendations.score })
      .from(recommendations)
      .where(eq(recommendations.userId, userId));
    return new Map(rows.map((row) => [`${row.mediaType}:${row.tmdbId}`, row.score]));
  }

  async saveRecommendations(userId: string, items: ScoredRecommendation[]) {
    if (items.length === 0) return;
    const now = new Date();
    for (const item of items) {
      await db
        .insert(recommendations)
        .values({
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
        })
        .onConflictDoUpdate({
          target: [recommendations.userId, recommendations.mediaType, recommendations.tmdbId],
          set: {
            title: item.title,
            overview: item.overview,
            posterPath: item.posterPath ?? null,
            releaseDate: item.date ?? null,
            genreIds: item.genreIds,
            score: item.score,
            matchPercent: item.matchPercent,
            reasons: item.reasons,
            sourceTitles: item.sourceTitles,
            aiScore: item.aiScore ?? null,
            aiExplanation: item.aiExplanation ?? null,
            generatedAt: now,
            updatedAt: now,
          },
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
    return db
      .select({
        tmdbId: recommendations.tmdbId,
        type: recommendations.mediaType,
        title: recommendations.title,
        genreIds: recommendations.genreIds,
      })
      .from(recommendations)
      .where(and(eq(recommendations.userId, userId), eq(recommendations.feedback, "moreLikeThis")));
  }

  async getFeedbackByTitles(userId: string, titles: Array<{ type: "movie" | "series"; tmdbId: number }>) {
    if (titles.length === 0) return new Map<string, string | null>();
    const conditions = titles.map((title) =>
      and(eq(recommendations.mediaType, title.type), eq(recommendations.tmdbId, title.tmdbId)),
    );
    const rows = await db
      .select({
        mediaType: recommendations.mediaType,
        tmdbId: recommendations.tmdbId,
        feedback: recommendations.feedback,
      })
      .from(recommendations)
      .where(and(eq(recommendations.userId, userId), or(...conditions)));
    return new Map(rows.map((row) => [`${row.mediaType}:${row.tmdbId}`, row.feedback]));
  }

  async setTitleFeedback(
    userId: string,
    item: {
      type: "movie" | "series";
      tmdbId: number;
      title: string;
      overview: string;
      posterPath?: string;
      releaseDate?: string;
      genreIds: number[];
    },
    feedback: "moreLikeThis" | "notInterested" | null,
  ) {
    const now = new Date();
    await db
      .insert(recommendations)
      .values({
        userId,
        mediaType: item.type,
        tmdbId: item.tmdbId,
        title: item.title,
        overview: item.overview,
        posterPath: item.posterPath,
        releaseDate: item.releaseDate,
        genreIds: item.genreIds,
        score: 0,
        matchPercent: 0,
        reasons: [],
        sourceTitles: [],
        feedback,
        hiddenAt: feedback === "notInterested" ? now : null,
        generatedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [recommendations.userId, recommendations.mediaType, recommendations.tmdbId],
        set: { feedback, hiddenAt: feedback === "notInterested" ? now : null, updatedAt: now },
      });
  }

  async setRefreshState(userId: string, signalFingerprint: string, locale: string) {
    const now = new Date();
    await db
      .insert(recommendationRefreshStates)
      .values({ userId, signalFingerprint, locale, refreshedAt: now, refreshAfter: null, updatedAt: now })
      .onConflictDoUpdate({
        target: recommendationRefreshStates.userId,
        set: { signalFingerprint, locale, refreshedAt: now, refreshAfter: null, updatedAt: now },
      });
  }

  async getDueRefreshes(before: Date, now = new Date()) {
    return db
      .select({ userId: recommendationRefreshStates.userId, locale: recommendationRefreshStates.locale })
      .from(recommendationRefreshStates)
      .where(
        or(
          and(isNull(recommendationRefreshStates.refreshAfter), lt(recommendationRefreshStates.refreshedAt, before)),
          lte(recommendationRefreshStates.refreshAfter, now),
        ),
      );
  }

  async invalidateRefresh(userId: string, refreshAfter = new Date()) {
    const now = new Date();
    const signalFingerprint = `pending:${now.toISOString()}`;
    await db
      .insert(recommendationRefreshStates)
      .values({ userId, signalFingerprint, refreshAfter, updatedAt: now })
      .onConflictDoUpdate({
        target: recommendationRefreshStates.userId,
        set: { signalFingerprint, refreshAfter, updatedAt: now },
      });
  }

  async getLatestRun(userId: string) {
    return db.query.recommendationRuns.findFirst({
      where: eq(recommendationRuns.userId, userId),
      orderBy: (run, { desc }) => desc(run.startedAt),
    });
  }

  async startRun(userId: string) {
    // Partial unique index (recommendation_runs_user_running_idx) enforces one running run per user at the DB level.
    const [run] = await db
      .insert(recommendationRuns)
      .values({ userId })
      .onConflictDoNothing({ target: recommendationRuns.userId, where: sql`${recommendationRuns.status} = 'running'` })
      .returning();
    return run;
  }

  async updateRun(runId: string, values: { phase?: string; processedItems?: number; totalItems?: number }) {
    await db
      .update(recommendationRuns)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(recommendationRuns.id, runId));
  }

  async completeRun(runId: string) {
    await db
      .update(recommendationRuns)
      .set({ status: "completed", phase: "completed", finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(recommendationRuns.id, runId));
  }

  async failRun(runId: string, error: string) {
    await db
      .update(recommendationRuns)
      .set({ status: "failed", phase: "failed", error, finishedAt: new Date(), updatedAt: new Date() })
      .where(eq(recommendationRuns.id, runId));
  }

  async setFeedback(userId: string, recommendationId: string, feedback: "moreLikeThis" | "notInterested" | null) {
    const [updated] = await db
      .update(recommendations)
      .set({ feedback, hiddenAt: feedback === "notInterested" ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(recommendations.id, recommendationId), eq(recommendations.userId, userId)))
      .returning({ id: recommendations.id });
    return Boolean(updated);
  }
}

export const recommendationRepository = new RecommendationRepository();
