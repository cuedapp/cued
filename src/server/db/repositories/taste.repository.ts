import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import { mediaItems, userMediaFeedback, userMediaStates } from "@/server/db/schema";

export class TasteRepository {
  async getHistory(userId: string) {
    const series = alias(mediaItems, "history_series");
    return db
      .select({
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
        seriesName: series.name,
        seriesTmdbId: series.tmdbId,
      })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .leftJoin(
        series,
        and(
          eq(series.integrationId, mediaItems.integrationId),
          eq(series.jellyfinItemId, mediaItems.seriesJellyfinId),
          eq(series.kind, "series"),
        ),
      )
      .leftJoin(
        userMediaFeedback,
        and(eq(userMediaFeedback.userId, userId), eq(userMediaFeedback.mediaItemId, mediaItems.id)),
      )
      .where(and(eq(userMediaStates.userId, userId), inArray(mediaItems.kind, ["movie", "series", "season"])))
      .orderBy(desc(userMediaStates.lastPlayedAt), desc(userMediaStates.updatedAt));
  }

  async getSeriesEpisodes(userId: string, seriesJellyfinId: string) {
    const rows = await db
      .select({
        premiereDate: mediaItems.premiereDate,
        raw: mediaItems.raw,
        played: userMediaStates.played,
        playedPercentage: userMediaStates.playedPercentage,
        lastPlayedAt: userMediaStates.lastPlayedAt,
      })
      .from(mediaItems)
      .leftJoin(
        userMediaStates,
        and(eq(userMediaStates.mediaItemId, mediaItems.id), eq(userMediaStates.userId, userId)),
      )
      .where(
        and(
          eq(mediaItems.kind, "episode"),
          eq(mediaItems.seriesJellyfinId, seriesJellyfinId),
          sql`coalesce(${mediaItems.raw}->>'ParentIndexNumber', '1') <> '0'`,
        ),
      );
    const episodes = rows.map((row) => {
      const premiereDate = resolvePremiereDate(row.premiereDate, row.raw);
      const payload = row.raw as Record<string, unknown>;
      return {
        episodeKey: `${payload.ParentIndexNumber ?? "0"}:${payload.IndexNumber ?? ""}`,
        ...(premiereDate ? { premiereDate } : {}),
        played: (row.played ?? false) || (row.playedPercentage ?? 0) >= 100,
        lastPlayedAt: row.lastPlayedAt,
      };
    });
    return dedupeEpisodes(episodes);
  }

  async getSeasonEpisodes(userId: string, seasonJellyfinId: string) {
    const rows = await db
      .select({
        premiereDate: mediaItems.premiereDate,
        raw: mediaItems.raw,
        played: userMediaStates.played,
        playedPercentage: userMediaStates.playedPercentage,
        lastPlayedAt: userMediaStates.lastPlayedAt,
      })
      .from(mediaItems)
      .leftJoin(
        userMediaStates,
        and(eq(userMediaStates.mediaItemId, mediaItems.id), eq(userMediaStates.userId, userId)),
      )
      .where(and(eq(mediaItems.kind, "episode"), eq(mediaItems.seasonJellyfinId, seasonJellyfinId)));
    return rows.map((row) => {
      const premiereDate = resolvePremiereDate(row.premiereDate, row.raw);
      const payload = row.raw as Record<string, unknown>;
      return {
        episodeKey: `${payload.ParentIndexNumber ?? "0"}:${payload.IndexNumber ?? ""}`,
        ...(premiereDate ? { premiereDate } : {}),
        played: (row.played ?? false) || (row.playedPercentage ?? 0) >= 100,
        lastPlayedAt: row.lastPlayedAt,
      };
    });
  }

  async saveFeedback(
    userId: string,
    mediaItemId: string,
    input: { rating?: number; feedback?: string; tags: string[]; excluded: boolean },
  ) {
    const now = new Date();
    const values = {
      rating: input.rating ?? null,
      feedback: input.feedback ?? null,
      tags: input.tags,
      excluded: input.excluded,
    };
    const [saved] = await db
      .insert(userMediaFeedback)
      .values({ userId, mediaItemId, ...values, updatedAt: now })
      .onConflictDoUpdate({
        target: [userMediaFeedback.userId, userMediaFeedback.mediaItemId],
        set: { ...values, updatedAt: now },
      })
      .returning();
    if (!saved) throw new Error("Feedback could not be saved");
    return saved;
  }

  async isInUserHistory(userId: string, mediaItemId: string) {
    const state = await db.query.userMediaStates.findFirst({
      where: and(eq(userMediaStates.userId, userId), eq(userMediaStates.mediaItemId, mediaItemId)),
    });
    return Boolean(state);
  }

  async getJellyfinItemIdForUser(userId: string, mediaItemId: string) {
    const [item] = await db
      .select({ jellyfinItemId: mediaItems.jellyfinItemId })
      .from(userMediaStates)
      .innerJoin(mediaItems, eq(userMediaStates.mediaItemId, mediaItems.id))
      .where(and(eq(userMediaStates.userId, userId), eq(mediaItems.id, mediaItemId), isNull(mediaItems.removedAt)));
    return item?.jellyfinItemId;
  }
}

export const tasteRepository = new TasteRepository();

function resolvePremiereDate(value: Date | null, raw: unknown) {
  if (value) return value;
  if (!raw || typeof raw !== "object") return undefined;
  const candidate = (raw as Record<string, unknown>).PremiereDate;
  if (typeof candidate !== "string") return undefined;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function dedupeEpisodes<T extends { episodeKey: string; played: boolean; lastPlayedAt: Date | null }>(episodes: T[]) {
  const result = new Map<string, T>();
  for (const episode of episodes) {
    const key = episode.episodeKey || String(result.size);
    const current = result.get(key);
    if (!current) {
      result.set(key, episode);
      continue;
    }
    result.set(key, {
      ...current,
      played: current.played || episode.played,
      lastPlayedAt:
        current.lastPlayedAt && episode.lastPlayedAt
          ? current.lastPlayedAt > episode.lastPlayedAt
            ? current.lastPlayedAt
            : episode.lastPlayedAt
          : (current.lastPlayedAt ?? episode.lastPlayedAt),
    });
  }
  return [...result.values()];
}
