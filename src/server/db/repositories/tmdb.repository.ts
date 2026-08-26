import "server-only";
import { and, desc, eq, gt, inArray, or } from "drizzle-orm";
import { db } from "@/server/db/client";
import { integrations, mediaItems, mediaLibraries, metadataCacheEntries, userLibraryAccess, userSearches } from "@/server/db/schema";

export class TmdbRepository {
  async getIntegration() {
    return db.query.integrations.findFirst({ where: eq(integrations.provider, "tmdb") });
  }

  async saveIntegration(encryptedAccessToken: string) {
    const now = new Date();
    const [saved] = await db.insert(integrations).values({
      provider: "tmdb",
      baseUrl: "https://api.themoviedb.org/3",
      encryptedApiKey: encryptedAccessToken,
      serverName: "TMDB",
      status: "healthy",
      lastCheckedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: integrations.provider,
      set: {
        encryptedApiKey: encryptedAccessToken,
        status: "healthy",
        lastCheckedAt: now,
        lastError: null,
        updatedAt: now,
      },
    }).returning();
    if (!saved) throw new Error("TMDB integration could not be saved");
    return saved;
  }

  async setHealth(integrationId: string, status: "healthy" | "degraded", error?: string) {
    await db.update(integrations).set({ status, lastCheckedAt: new Date(), lastError: error ?? null, updatedAt: new Date() }).where(eq(integrations.id, integrationId));
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

  async setCached(cacheKey: string, locale: string, resourceType: string, externalId: string | undefined, payload: Record<string, unknown>, ttlMs: number) {
    const now = new Date();
    await db.insert(metadataCacheEntries).values({
      provider: "tmdb",
      cacheKey,
      locale,
      resourceType,
      externalId,
      payload,
      expiresAt: new Date(now.getTime() + ttlMs),
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [metadataCacheEntries.provider, metadataCacheEntries.cacheKey, metadataCacheEntries.locale],
      set: { payload, expiresAt: new Date(now.getTime() + ttlMs), updatedAt: now },
    });
  }

  async recordSearch(userId: string, query: string) {
    const now = new Date();
    const normalizedQuery = query.toLocaleLowerCase();
    await db.insert(userSearches).values({ userId, query, normalizedQuery, lastSearchedAt: now }).onConflictDoUpdate({
      target: [userSearches.userId, userSearches.normalizedQuery],
      set: { query, lastSearchedAt: now },
    });
  }

  async getRecentSearches(userId: string, limit = 6) {
    return db.select({ query: userSearches.query }).from(userSearches)
      .where(eq(userSearches.userId, userId))
      .orderBy(desc(userSearches.lastSearchedAt))
      .limit(limit);
  }

  async getAvailableTitles(userId: string, titles: Array<{ id: number; type: "movie" | "series" }>) {
    const movieIds = titles.filter((title) => title.type === "movie").map((title) => title.id);
    const seriesIds = titles.filter((title) => title.type === "series").map((title) => title.id);
    if (movieIds.length === 0 && seriesIds.length === 0) return new Set<string>();
    const mediaScope = or(
      ...(movieIds.length > 0 ? [and(eq(mediaItems.kind, "movie"), inArray(mediaItems.tmdbId, movieIds))] : []),
      ...(seriesIds.length > 0 ? [and(eq(mediaItems.kind, "series"), inArray(mediaItems.tmdbId, seriesIds))] : []),
    );
    const rows = await db.select({ tmdbId: mediaItems.tmdbId, kind: mediaItems.kind }).from(mediaItems)
      .innerJoin(mediaLibraries, and(
        eq(mediaItems.integrationId, mediaLibraries.integrationId),
        eq(mediaItems.jellyfinLibraryId, mediaLibraries.jellyfinLibraryId),
      ))
      .innerJoin(userLibraryAccess, and(
        eq(userLibraryAccess.libraryId, mediaLibraries.id),
        eq(userLibraryAccess.userId, userId),
        eq(userLibraryAccess.accessible, true),
      ))
      .where(and(
        eq(mediaLibraries.selected, true),
        mediaScope,
      ));
    return new Set(rows.flatMap((row) => row.tmdbId === null || (row.kind !== "movie" && row.kind !== "series") ? [] : [`${row.kind}:${row.tmdbId}`]));
  }
}

export const tmdbRepository = new TmdbRepository();
