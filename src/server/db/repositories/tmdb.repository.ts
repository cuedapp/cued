import "server-only";
import { and, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/server/db/client";
import {
  integrations,
  mediaItems,
  mediaLibraries,
  metadataCacheEntries,
  userLibraryAccess,
  userMediaStates,
  userSearches,
  users,
} from "@/server/db/schema";

export class TmdbRepository {
  async getIntegration() {
    return db.query.integrations.findFirst({ where: eq(integrations.provider, "tmdb") });
  }

  async saveIntegration(encryptedAccessToken: string) {
    const now = new Date();
    const [saved] = await db
      .insert(integrations)
      .values({
        provider: "tmdb",
        baseUrl: "https://api.themoviedb.org/3",
        encryptedApiKey: encryptedAccessToken,
        serverName: "TMDB",
        status: "healthy",
        lastCheckedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: integrations.provider,
        set: {
          encryptedApiKey: encryptedAccessToken,
          status: "healthy",
          lastCheckedAt: now,
          lastError: null,
          updatedAt: now,
        },
      })
      .returning();
    if (!saved) throw new Error("TMDB integration could not be saved");
    return saved;
  }

  async setHealth(integrationId: string, status: "healthy" | "degraded", error?: string) {
    const now = new Date();
    await db
      .update(integrations)
      .set(
        status === "healthy"
          ? {
              status,
              lastCheckedAt: now,
              lastError: null,
              consecutiveFailures: 0,
              failureStartedAt: null,
              updatedAt: now,
            }
          : {
              status,
              lastCheckedAt: now,
              lastError: error ?? null,
              consecutiveFailures: sql`${integrations.consecutiveFailures} + 1`,
              failureStartedAt: sql`coalesce(${integrations.failureStartedAt}, ${now.toISOString()})`,
              updatedAt: now,
            },
      )
      .where(eq(integrations.id, integrationId));
  }

  async getCached<T>(cacheKey: string, locale: string): Promise<T | undefined> {
    const entry = await db.query.metadataCacheEntries.findFirst({
      where: and(
        eq(metadataCacheEntries.provider, "tmdb"),
        eq(metadataCacheEntries.cacheKey, cacheKey),
        eq(metadataCacheEntries.locale, locale),
        gt(metadataCacheEntries.expiresAt, new Date()),
      ),
    });
    return entry?.payload as T | undefined;
  }

  async setCached(
    cacheKey: string,
    locale: string,
    resourceType: string,
    externalId: string | undefined,
    payload: Record<string, unknown>,
    ttlMs: number,
  ) {
    const now = new Date();
    await db
      .insert(metadataCacheEntries)
      .values({
        provider: "tmdb",
        cacheKey,
        locale,
        resourceType,
        externalId,
        payload,
        expiresAt: new Date(now.getTime() + ttlMs),
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [metadataCacheEntries.provider, metadataCacheEntries.cacheKey, metadataCacheEntries.locale],
        set: { payload, expiresAt: new Date(now.getTime() + ttlMs), updatedAt: now },
      });
  }

  async recordSearch(userId: string, query: string) {
    const now = new Date();
    const normalizedQuery = query.toLocaleLowerCase();
    await db
      .insert(userSearches)
      .values({ userId, query, normalizedQuery, lastSearchedAt: now })
      .onConflictDoUpdate({
        target: [userSearches.userId, userSearches.normalizedQuery],
        set: { query, lastSearchedAt: now },
      });
  }

  async getRecentSearches(userId: string, limit = 6) {
    return db
      .select({ query: userSearches.query })
      .from(userSearches)
      .where(eq(userSearches.userId, userId))
      .orderBy(desc(userSearches.lastSearchedAt))
      .limit(limit);
  }

  async getAvailableTitles(
    userId: string,
    titles: Array<{ id: number; type: "movie" | "series" }>,
    strmLibraries: { movie: Set<string>; series: Set<string> } = { movie: new Set(), series: new Set() },
  ) {
    const movieIds = titles.filter((title) => title.type === "movie").map((title) => title.id);
    const seriesIds = titles.filter((title) => title.type === "series").map((title) => title.id);
    if (movieIds.length === 0 && seriesIds.length === 0)
      return {
        available: new Set<string>(),
        strmAvailable: new Set<string>(),
        watched: new Set<string>(),
        partiallyWatched: new Set<string>(),
      };
    const mediaScope = or(
      ...(movieIds.length > 0 ? [and(eq(mediaItems.kind, "movie"), inArray(mediaItems.tmdbId, movieIds))] : []),
      ...(seriesIds.length > 0 ? [and(eq(mediaItems.kind, "series"), inArray(mediaItems.tmdbId, seriesIds))] : []),
    );
    const rows = await db
      .select({
        tmdbId: mediaItems.tmdbId,
        kind: mediaItems.kind,
        libraryId: mediaLibraries.id,
        played: userMediaStates.played,
        playedPercentage: userMediaStates.playedPercentage,
      })
      .from(mediaItems)
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaItems.integrationId, mediaLibraries.integrationId),
          eq(mediaItems.jellyfinLibraryId, mediaLibraries.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        userLibraryAccess,
        and(
          eq(userLibraryAccess.libraryId, mediaLibraries.id),
          eq(userLibraryAccess.userId, userId),
          eq(userLibraryAccess.accessible, true),
        ),
      )
      .innerJoin(users, eq(users.id, userId))
      .leftJoin(
        userMediaStates,
        and(eq(userMediaStates.mediaItemId, mediaItems.id), eq(userMediaStates.userId, userId)),
      )
      .where(
        and(
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          or(
            isNull(users.maximumContentRatingAge),
            isNull(mediaItems.contentRatingAge),
            lte(mediaItems.contentRatingAge, users.maximumContentRatingAge),
          ),
          mediaScope,
        ),
      );
    const available = new Set<string>();
    const strmAvailable = new Set<string>();
    const watched = new Set<string>();
    const partiallyWatched = new Set<string>();
    for (const row of rows) {
      if (row.tmdbId === null || (row.kind !== "movie" && row.kind !== "series")) continue;
      const key = `${row.kind}:${row.tmdbId}`;
      if (strmLibraries[row.kind].has(row.libraryId)) strmAvailable.add(key);
      else available.add(key);
      if (row.played || (row.playedPercentage ?? 0) >= 100) watched.add(key);
      else if ((row.playedPercentage ?? 0) > 0) partiallyWatched.add(key);
    }
    return { available, strmAvailable, watched, partiallyWatched };
  }

  async getAccessibleJellyfinItemId(userId: string, type: "movie" | "series", tmdbId: number) {
    const [item] = await db
      .select({ jellyfinItemId: mediaItems.jellyfinItemId })
      .from(mediaItems)
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaLibraries.integrationId, mediaItems.integrationId),
          eq(mediaLibraries.jellyfinLibraryId, mediaItems.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        userLibraryAccess,
        and(
          eq(userLibraryAccess.libraryId, mediaLibraries.id),
          eq(userLibraryAccess.userId, userId),
          eq(userLibraryAccess.accessible, true),
        ),
      )
      .innerJoin(users, eq(users.id, userId))
      .where(
        and(
          eq(mediaItems.kind, type),
          eq(mediaItems.tmdbId, tmdbId),
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
          or(
            isNull(users.maximumContentRatingAge),
            isNull(mediaItems.contentRatingAge),
            lte(mediaItems.contentRatingAge, users.maximumContentRatingAge),
          ),
        ),
      )
      .limit(1);
    return item?.jellyfinItemId;
  }

  async getAccessibleContentRating(userId: string, type: "movie" | "series", tmdbId: number) {
    const [item] = await db
      .select({ contentRating: mediaItems.contentRating, contentRatingAge: mediaItems.contentRatingAge })
      .from(mediaItems)
      .innerJoin(
        mediaLibraries,
        and(
          eq(mediaItems.integrationId, mediaLibraries.integrationId),
          eq(mediaItems.jellyfinLibraryId, mediaLibraries.jellyfinLibraryId),
        ),
      )
      .innerJoin(
        userLibraryAccess,
        and(
          eq(userLibraryAccess.libraryId, mediaLibraries.id),
          eq(userLibraryAccess.userId, userId),
          eq(userLibraryAccess.accessible, true),
        ),
      )
      .where(
        and(
          eq(mediaItems.kind, type),
          eq(mediaItems.tmdbId, tmdbId),
          eq(mediaLibraries.selected, true),
          isNull(mediaItems.removedAt),
        ),
      )
      .limit(1);
    return item;
  }

  async getMaximumContentRatingAge(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { maximumContentRatingAge: true },
    });
    return user?.maximumContentRatingAge ?? null;
  }

  async getPreferredOriginalLanguages(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { preferredOriginalLanguages: true },
    });
    return user?.preferredOriginalLanguages ?? null;
  }

  async getEpisodeStates(userId: string, seriesTmdbId: number, seasonNumber: number) {
    const series = alias(mediaItems, "episode_state_series");
    const rows = await db
      .select({
        episodeNumber: sql<number | null>`nullif(${mediaItems.raw}->>'IndexNumber', '')::integer`,
        played: userMediaStates.played,
        progress: userMediaStates.playedPercentage,
        lastPlayedAt: userMediaStates.lastPlayedAt,
      })
      .from(mediaItems)
      .innerJoin(
        series,
        and(
          eq(series.integrationId, mediaItems.integrationId),
          eq(series.jellyfinItemId, mediaItems.seriesJellyfinId),
          eq(series.kind, "series"),
          eq(series.tmdbId, seriesTmdbId),
        ),
      )
      .leftJoin(
        userMediaStates,
        and(eq(userMediaStates.mediaItemId, mediaItems.id), eq(userMediaStates.userId, userId)),
      )
      .where(
        and(
          eq(mediaItems.kind, "episode"),
          sql`coalesce(${mediaItems.raw}->>'ParentIndexNumber', '0') = ${String(seasonNumber)}`,
        ),
      );
    const states = new Map<number, { played: boolean; progress: number; lastPlayedAt: Date | null }>();
    for (const row of rows) {
      if (row.episodeNumber === null) continue;
      const next = {
        played: (row.played ?? false) || (row.progress ?? 0) >= 100,
        progress: row.progress ?? 0,
        lastPlayedAt: row.lastPlayedAt,
      };
      const current = states.get(row.episodeNumber);
      states.set(row.episodeNumber, {
        played: Boolean(current?.played || next.played),
        progress: Math.max(current?.progress ?? 0, next.progress),
        lastPlayedAt:
          current?.lastPlayedAt && next.lastPlayedAt
            ? current.lastPlayedAt > next.lastPlayedAt
              ? current.lastPlayedAt
              : next.lastPlayedAt
            : (current?.lastPlayedAt ?? next.lastPlayedAt),
      });
    }
    return states;
  }
}

export const tmdbRepository = new TmdbRepository();
