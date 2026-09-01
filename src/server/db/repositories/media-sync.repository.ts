import "server-only";
import { and, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  integrationSyncRuns,
  mediaItems,
  mediaLibraries,
  userLibraryAccess,
  userMediaFeedback,
  userMediaStates,
  users,
} from "@/server/db/schema";
import type { MediaServerItem, MediaServerUser } from "@/server/integrations/media-server-provider";
import { AuthRepository } from "./auth.repository";

export class MediaSyncRepository {
  private readonly authRepository = new AuthRepository();

  async startRun(
    integrationId: string,
    trigger: "manual" | "login" | "scheduled",
    mode: "full" | "updates",
    requestedByUserId?: string,
  ) {
    const [run] = await db
      .insert(integrationSyncRuns)
      .values({ integrationId, trigger, mode, requestedByUserId })
      .returning();
    if (!run) throw new Error("Sync run could not be started");
    return run;
  }

  async completeRun(
    runId: string,
    counts: { librariesProcessed: number; itemsProcessed: number; usersProcessed: number },
  ) {
    await db
      .update(integrationSyncRuns)
      .set({
        status: "completed",
        phase: "completed",
        currentLabel: null,
        finishedAt: new Date(),
        updatedAt: new Date(),
        ...counts,
      })
      .where(eq(integrationSyncRuns.id, runId));
  }

  async failRun(runId: string, error: string) {
    await db
      .update(integrationSyncRuns)
      .set({
        status: "failed",
        phase: "failed",
        currentLabel: null,
        finishedAt: new Date(),
        updatedAt: new Date(),
        error,
      })
      .where(eq(integrationSyncRuns.id, runId));
  }

  async updateRunProgress(
    runId: string,
    progress: {
      phase?: "preparing" | "libraries" | "users";
      currentLabel?: string | null;
      librariesProcessed?: number;
      librariesTotal?: number;
      itemsProcessed?: number;
      usersProcessed?: number;
      usersTotal?: number;
    },
  ) {
    await db
      .update(integrationSyncRuns)
      .set({ ...progress, updatedAt: new Date() })
      .where(eq(integrationSyncRuns.id, runId));
  }

  async upsertUser(integrationId: string, user: MediaServerUser) {
    return this.authRepository.upsertUser(integrationId, user, false);
  }

  async syncUserLibraryAccess(userId: string, integrationId: string, user: MediaServerUser) {
    const libraries = await db.query.mediaLibraries.findMany({
      where: eq(mediaLibraries.integrationId, integrationId),
    });
    for (const library of libraries) {
      const accessible = user.hasAccessToAllLibraries || user.enabledLibraryIds.includes(library.jellyfinLibraryId);
      await db
        .insert(userLibraryAccess)
        .values({ userId, libraryId: library.id, accessible, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: [userLibraryAccess.userId, userLibraryAccess.libraryId],
          set: { accessible, updatedAt: new Date() },
        });
    }
  }

  async upsertItems(integrationId: string, libraryId: string, items: MediaServerItem[]) {
    let changed = 0;
    const batchSize = 250;
    for (let offset = 0; offset < items.length; offset += batchSize) {
      const now = new Date();
      const batch = items.slice(offset, offset + batchSize);
      const saved = await db
        .insert(mediaItems)
        .values(
          batch.map((item) => ({
            integrationId,
            jellyfinItemId: item.id,
            jellyfinLibraryId: libraryId,
            kind: item.kind,
            name: item.name,
            tmdbId: parseExternalId(item.externalIds?.Tmdb),
            seriesJellyfinId: item.seriesId,
            seasonJellyfinId: item.seasonId,
            parentJellyfinId: item.parentId,
            premiereDate: item.premiereDate,
            runtimeTicks: item.runtimeTicks,
            raw: item.raw,
            removedAt: null,
            updatedAt: now,
          })),
        )
        .onConflictDoUpdate({
          target: [mediaItems.integrationId, mediaItems.jellyfinItemId],
          set: {
            jellyfinLibraryId: libraryId,
            kind: sql`excluded.kind`,
            name: sql`excluded.name`,
            tmdbId: sql`excluded.tmdb_id`,
            seriesJellyfinId: sql`excluded.series_jellyfin_id`,
            seasonJellyfinId: sql`excluded.season_jellyfin_id`,
            parentJellyfinId: sql`excluded.parent_jellyfin_id`,
            premiereDate: sql`excluded.premiere_date`,
            runtimeTicks: sql`excluded.runtime_ticks`,
            raw: sql`excluded.raw`,
            removedAt: null,
            updatedAt: now,
          },
          setWhere: sql`${mediaItems.raw} IS DISTINCT FROM excluded.raw OR ${mediaItems.jellyfinLibraryId} IS DISTINCT FROM excluded.jellyfin_library_id OR ${mediaItems.tmdbId} IS DISTINCT FROM excluded.tmdb_id OR ${mediaItems.removedAt} IS NOT NULL`,
        })
        .returning({ id: mediaItems.id });
      changed += saved.length;
    }
    return { changed };
  }

  async reconcileItems(integrationId: string, libraryId: string, jellyfinItemIds: string[]) {
    const scope = and(eq(mediaItems.integrationId, integrationId), eq(mediaItems.jellyfinLibraryId, libraryId));
    await db
      .update(mediaItems)
      .set({ removedAt: new Date(), updatedAt: new Date() })
      .where(jellyfinItemIds.length === 0 ? scope : and(scope, notInArray(mediaItems.jellyfinItemId, jellyfinItemIds)));
  }

  async removeItemsOutsideLibraries(integrationId: string, jellyfinLibraryIds: string[]) {
    await db
      .update(mediaItems)
      .set({ removedAt: new Date(), updatedAt: new Date() })
      .where(
        jellyfinLibraryIds.length === 0
          ? eq(mediaItems.integrationId, integrationId)
          : and(
              eq(mediaItems.integrationId, integrationId),
              or(isNull(mediaItems.jellyfinLibraryId), notInArray(mediaItems.jellyfinLibraryId, jellyfinLibraryIds)),
            ),
      );
  }

  async syncUserStates(userId: string, integrationId: string, items: MediaServerItem[]) {
    for (const item of items) {
      if (!item.userData) continue;
      const mediaItem = await db.query.mediaItems.findFirst({
        where: and(eq(mediaItems.integrationId, integrationId), eq(mediaItems.jellyfinItemId, item.id)),
      });
      if (!mediaItem) continue;
      await db
        .insert(userMediaStates)
        .values({
          userId,
          mediaItemId: mediaItem.id,
          played: item.userData.played,
          playCount: item.userData.playCount,
          playedPercentage: item.userData.playedPercentage,
          playbackPositionTicks: item.userData.playbackPositionTicks,
          lastPlayedAt: item.userData.lastPlayedAt,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [userMediaStates.userId, userMediaStates.mediaItemId],
          set: {
            played: item.userData.played,
            playCount: item.userData.playCount,
            playedPercentage: item.userData.playedPercentage,
            playbackPositionTicks: item.userData.playbackPositionTicks,
            lastPlayedAt: item.userData.lastPlayedAt,
            updatedAt: new Date(),
          },
        });
    }
  }

  async removeUserStatesOutsideLibraries(userId: string, integrationId: string, accessibleLibraryIds: string[]) {
    const outsideScope = db
      .select({ id: mediaItems.id })
      .from(mediaItems)
      .where(
        accessibleLibraryIds.length === 0
          ? eq(mediaItems.integrationId, integrationId)
          : and(
              eq(mediaItems.integrationId, integrationId),
              or(isNull(mediaItems.jellyfinLibraryId), notInArray(mediaItems.jellyfinLibraryId, accessibleLibraryIds)),
            ),
      );
    const explicitlyRated = db
      .select({ mediaItemId: userMediaFeedback.mediaItemId })
      .from(userMediaFeedback)
      .where(eq(userMediaFeedback.userId, userId));
    await db
      .delete(userMediaStates)
      .where(
        and(
          eq(userMediaStates.userId, userId),
          inArray(userMediaStates.mediaItemId, outsideScope),
          eq(userMediaStates.played, false),
          or(isNull(userMediaStates.playedPercentage), eq(userMediaStates.playedPercentage, 0)),
          notInArray(userMediaStates.mediaItemId, explicitlyRated),
        ),
      );
  }

  async reconcileUsers(integrationId: string, jellyfinUserIds: string[]) {
    await db
      .delete(users)
      .where(
        jellyfinUserIds.length === 0
          ? eq(users.integrationId, integrationId)
          : and(eq(users.integrationId, integrationId), notInArray(users.jellyfinUserId, jellyfinUserIds)),
      );
  }

  async getUsersWithLibraryAccess(integrationId: string) {
    const localUsers = await db.query.users.findMany({
      where: eq(users.integrationId, integrationId),
      orderBy: (user, { asc }) => asc(user.displayName),
    });
    const libraries = await db.query.mediaLibraries.findMany({
      where: eq(mediaLibraries.integrationId, integrationId),
      orderBy: (library, { asc }) => asc(library.name),
    });
    const access = await db
      .select({
        userId: userLibraryAccess.userId,
        libraryId: userLibraryAccess.libraryId,
        accessible: userLibraryAccess.accessible,
      })
      .from(userLibraryAccess)
      .innerJoin(mediaLibraries, eq(userLibraryAccess.libraryId, mediaLibraries.id))
      .where(eq(mediaLibraries.integrationId, integrationId));
    return { users: localUsers, libraries, access };
  }

  async getRecentRuns(integrationId: string, limit = 10) {
    return db.query.integrationSyncRuns.findMany({
      where: eq(integrationSyncRuns.integrationId, integrationId),
      orderBy: (run, { desc }) => desc(run.startedAt),
      limit,
    });
  }

  async getLatestRun(integrationId: string) {
    return db.query.integrationSyncRuns.findFirst({
      where: eq(integrationSyncRuns.integrationId, integrationId),
      orderBy: (run, { desc }) => desc(run.startedAt),
    });
  }

  async getLatestCompletedRun(integrationId: string) {
    return db.query.integrationSyncRuns.findFirst({
      where: and(eq(integrationSyncRuns.integrationId, integrationId), eq(integrationSyncRuns.status, "completed")),
      orderBy: (run, { desc }) => desc(run.startedAt),
    });
  }

  async needsGenreMetadataBackfill(integrationId: string) {
    const [item] = await db
      .select({ id: mediaItems.id })
      .from(mediaItems)
      .where(
        and(
          eq(mediaItems.integrationId, integrationId),
          inArray(mediaItems.kind, ["movie", "series"]),
          isNull(mediaItems.removedAt),
          sql`not (${mediaItems.raw} ? 'Genres')`,
        ),
      )
      .limit(1);
    return Boolean(item);
  }

  async getSeriesEpisodes(userId: string, seriesJellyfinId: string) {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return [];
    const rows = await db
      .select({ premiereDate: mediaItems.premiereDate, played: userMediaStates.played })
      .from(mediaItems)
      .leftJoin(
        userMediaStates,
        and(eq(userMediaStates.mediaItemId, mediaItems.id), eq(userMediaStates.userId, userId)),
      )
      .where(
        and(
          eq(mediaItems.integrationId, user.integrationId),
          eq(mediaItems.kind, "episode"),
          eq(mediaItems.seriesJellyfinId, seriesJellyfinId),
          sql`coalesce(${mediaItems.raw}->>'ParentIndexNumber', '1') <> '0'`,
        ),
      );
    return rows.map((row) => ({
      ...(row.premiereDate ? { premiereDate: row.premiereDate } : {}),
      played: row.played ?? false,
    }));
  }
}

export const mediaSyncRepository = new MediaSyncRepository();

function parseExternalId(value: string | undefined) {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
