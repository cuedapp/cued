import "server-only";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mediaItems, userMediaFeedback, userMediaStates } from "@/server/db/schema";

export class TasteRepository {
  async getHistory(userId: string) {
    return db.select({
      id: mediaItems.id,
      jellyfinItemId: mediaItems.jellyfinItemId,
      kind: mediaItems.kind,
      name: mediaItems.name,
      premiereDate: mediaItems.premiereDate,
      tmdbId: mediaItems.tmdbId,
      removedAt: mediaItems.removedAt,
      played: userMediaStates.played,
      playedPercentage: userMediaStates.playedPercentage,
      playCount: userMediaStates.playCount,
      lastPlayedAt: userMediaStates.lastPlayedAt,
      rating: userMediaFeedback.rating,
      feedback: userMediaFeedback.feedback,
      tags: userMediaFeedback.tags,
      excluded: userMediaFeedback.excluded,
    }).from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .leftJoin(userMediaFeedback, and(eq(userMediaFeedback.userId, userId), eq(userMediaFeedback.mediaItemId, mediaItems.id)))
      .where(and(eq(userMediaStates.userId, userId), inArray(mediaItems.kind, ["movie", "series", "season"])))
      .orderBy(desc(userMediaStates.lastPlayedAt), desc(userMediaStates.updatedAt));
  }

  async getSeriesEpisodes(userId: string, seriesJellyfinId: string) {
    const rows = await db.select({ premiereDate: mediaItems.premiereDate, played: userMediaStates.played, lastPlayedAt: userMediaStates.lastPlayedAt }).from(mediaItems)
      .leftJoin(userMediaStates, and(eq(userMediaStates.mediaItemId, mediaItems.id), eq(userMediaStates.userId, userId)))
      .where(and(eq(mediaItems.kind, "episode"), eq(mediaItems.seriesJellyfinId, seriesJellyfinId)));
    return rows.map((row) => ({ ...(row.premiereDate ? { premiereDate: row.premiereDate } : {}), played: row.played ?? false, lastPlayedAt: row.lastPlayedAt }));
  }

  async saveFeedback(userId: string, mediaItemId: string, input: { rating?: number; feedback?: string; tags: string[]; excluded: boolean }) {
    const now = new Date();
    const values = { rating: input.rating ?? null, feedback: input.feedback ?? null, tags: input.tags, excluded: input.excluded };
    const [saved] = await db.insert(userMediaFeedback).values({ userId, mediaItemId, ...values, updatedAt: now }).onConflictDoUpdate({
      target: [userMediaFeedback.userId, userMediaFeedback.mediaItemId],
      set: { ...values, updatedAt: now },
    }).returning();
    if (!saved) throw new Error("Feedback could not be saved");
    return saved;
  }

  async isInUserHistory(userId: string, mediaItemId: string) {
    const state = await db.query.userMediaStates.findFirst({ where: and(eq(userMediaStates.userId, userId), eq(userMediaStates.mediaItemId, mediaItemId)) });
    return Boolean(state);
  }

  async getJellyfinItemIdForUser(userId: string, mediaItemId: string) {
    const [item] = await db.select({ jellyfinItemId: mediaItems.jellyfinItemId }).from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .where(and(eq(userMediaStates.userId, userId), eq(mediaItems.id, mediaItemId), isNull(mediaItems.removedAt)));
    return item?.jellyfinItemId;
  }

}

export const tasteRepository = new TasteRepository();
